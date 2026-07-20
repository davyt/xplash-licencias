const { onRequest } = require('firebase-functions/v2/https')
const { db } = require('./admin')

// In-memory rate limiter — 20 req/min per IP (per instance; Cloud Functions can scale horizontally)
const _rateMap = new Map()
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for']
  return xff ? xff.split(',')[0].trim() : (req.ip || 'unknown')
}

function isRateLimited(ip) {
  const now = Date.now()
  const entry = _rateMap.get(ip)
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    _rateMap.set(ip, { count: 1, windowStart: now })
    return false
  }
  if (entry.count >= RATE_LIMIT) return true
  entry.count++
  return false
}

// installId: 4–128 chars, alphanumeric + dash/underscore/dot/colon
function isValidInstallId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_\-:.]{4,128}$/.test(id)
}

/**
 * POST /validateLicense
 * Body: { licenseCode, installId, moduleId, appVersion, deviceModel?, osVersion?, platform? }
 * Response: { allowed, validUntil?, offlineGraceHours?, reason? }
 */
const validateLicense = onRequest({ cors: false, region: 'southamerica-east1' }, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limiting
  const ip = getClientIp(req)
  if (isRateLimited(ip)) {
    return res.status(429).json({ allowed: false, reason: 'Demasiadas solicitudes. Intentá más tarde.' })
  }

  const { licenseCode, installId, moduleId, appVersion, deviceModel, osVersion, platform } = req.body

  if (!licenseCode || !installId || !moduleId) {
    return res.status(400).json({ allowed: false, reason: 'Faltan parámetros requeridos: licenseCode, installId, moduleId' })
  }

  // installId format validation — prevents flooding maxDevices with garbage IDs
  if (!isValidInstallId(installId)) {
    return res.status(400).json({ allowed: false, reason: 'installId inválido' })
  }

  try {
    const licensesSnap = await db.collection('licenses').where('licenseCode', '==', licenseCode).limit(1).get()

    if (licensesSnap.empty) {
      // Log detail internally but return generic message to avoid code enumeration
      await logEvent({ licenseCode, installId, moduleId, appVersion, allowed: false, reason: 'Licencia no encontrada' })
      return res.json({ allowed: false, reason: 'Acceso denegado' })
    }

    const licenseDoc = licensesSnap.docs[0]
    const license = licenseDoc.data()

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

    const now = new Date()
    const expiresAt = license.expiresAt?.toDate ? license.expiresAt.toDate() : new Date(license.expiresAt)

    if (expiresAt < now) {
      await logEvent({ licenseCode, installId, moduleId, appVersion, allowed: false, reason: 'Licencia vencida', licenseId: licenseDoc.id, companyId: license.companyId })
      return res.json({ allowed: false, reason: 'Licencia vencida' })
    }

    const enabledModules = license.enabledModules || []
    if (!enabledModules.includes(moduleId)) {
      await logEvent({ licenseCode, installId, moduleId, appVersion, allowed: false, reason: `Módulo '${moduleId}' no habilitado en esta licencia`, licenseId: licenseDoc.id, companyId: license.companyId })
      return res.json({ allowed: false, reason: `Módulo '${moduleId}' no habilitado en esta licencia` })
    }

    const companySnap = await db.collection('companies').doc(license.companyId).get()
    if (!companySnap.exists || companySnap.data().status !== 'active') {
      await logEvent({ licenseCode, installId, moduleId, appVersion, allowed: false, reason: 'Empresa suspendida', licenseId: licenseDoc.id, companyId: license.companyId })
      return res.json({ allowed: false, reason: 'Empresa suspendida' })
    }

    // maxDevices check — before registering, so a new unknown device can't register past the limit
    const maxDevices = license.maxDevices || 1
    const installationsSnap = await db.collection('installations').where('licenseId', '==', licenseDoc.id).get()
    const knownInstalls = installationsSnap.docs.map(d => d.data().installId)
    const isKnown = knownInstalls.includes(installId)

    if (!isKnown && knownInstalls.length >= maxDevices) {
      await logEvent({ licenseCode, installId, moduleId, appVersion, allowed: false, reason: `Límite de ${maxDevices} visor(es) alcanzado`, licenseId: licenseDoc.id, companyId: license.companyId })
      return res.json({ allowed: false, reason: `Límite de ${maxDevices} visor(es) alcanzado` })
    }

    await registerOrUpdateInstallation({
      installId, licenseId: licenseDoc.id, companyId: license.companyId,
      appVersion, deviceModel, osVersion, platform,
    })

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

async function registerOrUpdateInstallation({ installId, licenseId, companyId, appVersion, deviceModel, osVersion, platform }) {
  const ref = db.collection('installations').doc(`${licenseId}_${installId}`)
  const snap = await ref.get()

  const fields = {
    installId,
    licenseId,
    companyId,
    appVersion: appVersion || null,
    lastSeenAt: new Date(),
    // Only write device info fields if provided by the client
    ...(deviceModel !== undefined && { deviceModel }),
    ...(osVersion  !== undefined && { osVersion }),
    ...(platform   !== undefined && { platform }),
  }

  if (!snap.exists) {
    // New device: set with firstSeenAt in a single write (no race condition)
    await ref.set({ ...fields, firstSeenAt: new Date() })
  } else {
    await ref.update(fields)
  }
}

async function logEvent({ licenseCode, installId, moduleId, appVersion, allowed, reason, licenseId, companyId }) {
  await db.collection('events').add({
    licenseCode,
    licenseId:  licenseId  || null,
    companyId:  companyId  || null,
    installId,
    moduleId,
    appVersion: appVersion || null,
    allowed,
    reason:     reason     || null,
    createdAt:  new Date(),
  })
}

module.exports = { validateLicense }
