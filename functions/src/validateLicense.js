const { onRequest } = require('firebase-functions/v2/https')
const { db } = require('./admin')

/**
 * POST /validateLicense
 * Body: { licenseCode, installId, moduleId, appVersion }
 * Response: { allowed, validUntil?, offlineGraceHours?, reason? }
 */
const validateLicense = onRequest({ cors: false }, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { licenseCode, installId, moduleId, appVersion } = req.body

  if (!licenseCode || !installId || !moduleId) {
    return res.status(400).json({
      allowed: false,
      reason: 'Faltan parámetros requeridos: licenseCode, installId, moduleId',
    })
  }

  try {
    // Buscar licencia por código
    const licensesSnap = await db
      .collection('licenses')
      .where('licenseCode', '==', licenseCode)
      .limit(1)
      .get()

    if (licensesSnap.empty) {
      await logEvent({ licenseCode, installId, moduleId, appVersion, allowed: false, reason: 'Licencia no encontrada' })
      return res.json({ allowed: false, reason: 'Licencia no encontrada' })
    }

    const licenseDoc = licensesSnap.docs[0]
    const license = licenseDoc.data()

    // Verificar estado
    if (license.status === 'blocked') {
      await logEvent({ licenseCode, installId, moduleId, appVersion, allowed: false, reason: 'Licencia bloqueada por Xplash', licenseId: licenseDoc.id, companyId: license.companyId })
      return res.json({ allowed: false, reason: 'Licencia bloqueada por Xplash' })
    }

    if (license.status === 'paused') {
      await logEvent({ licenseCode, installId, moduleId, appVersion, allowed: false, reason: 'Licencia pausada temporalmente', licenseId: licenseDoc.id, companyId: license.companyId })
      return res.json({ allowed: false, reason: 'Licencia pausada temporalmente' })
    }

    if (license.status === 'draft') {
      await logEvent({ licenseCode, installId, moduleId, appVersion, allowed: false, reason: 'Licencia no activada', licenseId: licenseDoc.id, companyId: license.companyId })
      return res.json({ allowed: false, reason: 'Licencia no activada' })
    }

    // Verificar vencimiento
    const now = new Date()
    const expiresAt = license.expiresAt?.toDate ? license.expiresAt.toDate() : new Date(license.expiresAt)

    if (expiresAt < now) {
      await logEvent({ licenseCode, installId, moduleId, appVersion, allowed: false, reason: 'Licencia vencida', licenseId: licenseDoc.id, companyId: license.companyId })
      return res.json({ allowed: false, reason: 'Licencia vencida' })
    }

    // Verificar módulo habilitado
    const enabledModules = license.enabledModules || []
    if (!enabledModules.includes(moduleId)) {
      await logEvent({ licenseCode, installId, moduleId, appVersion, allowed: false, reason: `Módulo '${moduleId}' no habilitado en esta licencia`, licenseId: licenseDoc.id, companyId: license.companyId })
      return res.json({ allowed: false, reason: `Módulo '${moduleId}' no habilitado en esta licencia` })
    }

    // Verificar empresa activa
    const companySnap = await db.collection('companies').doc(license.companyId).get()
    if (!companySnap.exists || companySnap.data().status !== 'active') {
      await logEvent({ licenseCode, installId, moduleId, appVersion, allowed: false, reason: 'Empresa suspendida', licenseId: licenseDoc.id, companyId: license.companyId })
      return res.json({ allowed: false, reason: 'Empresa suspendida' })
    }

    // Verificar límite de visores
    const maxDevices = license.maxDevices || 1
    const installationsSnap = await db
      .collection('installations')
      .where('licenseId', '==', licenseDoc.id)
      .get()

    const knownInstalls = installationsSnap.docs.map(d => d.data().installId)
    const isKnown = knownInstalls.includes(installId)

    if (!isKnown && knownInstalls.length >= maxDevices) {
      await logEvent({ licenseCode, installId, moduleId, appVersion, allowed: false, reason: `Límite de ${maxDevices} visor(es) alcanzado`, licenseId: licenseDoc.id, companyId: license.companyId })
      return res.json({ allowed: false, reason: `Límite de ${maxDevices} visor(es) alcanzado` })
    }

    // Registrar / actualizar instalación
    await registerOrUpdateInstallation({ installId, licenseId: licenseDoc.id, companyId: license.companyId, appVersion })

    // Log de acceso permitido
    await logEvent({ licenseCode, installId, moduleId, appVersion, allowed: true, reason: null, licenseId: licenseDoc.id, companyId: license.companyId })

    return res.json({
      allowed: true,
      validUntil: expiresAt.toISOString(),
      offlineGraceHours: license.offlineGraceHours ?? 48,
    })

  } catch (err) {
    console.error('validateLicense error:', err)
    return res.status(500).json({ allowed: false, reason: 'Error interno del servidor' })
  }
})

async function registerOrUpdateInstallation({ installId, licenseId, companyId, appVersion }) {
  const ref = db.collection('installations').doc(`${licenseId}_${installId}`)
  await ref.set({
    installId,
    licenseId,
    companyId,
    appVersion: appVersion || null,
    lastSeenAt: new Date(),
  }, { merge: true })

  // Registrar firstSeenAt solo si es nuevo
  const snap = await ref.get()
  if (!snap.data().firstSeenAt) {
    await ref.update({ firstSeenAt: new Date() })
  }
}

async function logEvent({ licenseCode, installId, moduleId, appVersion, allowed, reason, licenseId, companyId }) {
  await db.collection('events').add({
    licenseCode,
    licenseId: licenseId || null,
    companyId: companyId || null,
    installId,
    moduleId,
    appVersion: appVersion || null,
    allowed,
    reason: reason || null,
    createdAt: new Date(),
  })
}

module.exports = { validateLicense }
