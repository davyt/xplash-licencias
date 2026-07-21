const { onRequest } = require('firebase-functions/v2/https')
const { db } = require('./admin')

/**
 * POST /registerInstallation
 * Body: { licenseCode, metaUserId, appVersion }
 * Pre-registra un usuario antes de que entre al módulo (opcional).
 * La validación principal ocurre en validateLicense.
 */
const registerInstallation = onRequest({ cors: false, region: 'southamerica-east1' }, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { licenseCode, metaUserId, appVersion } = req.body

  if (!licenseCode || !metaUserId) {
    return res.status(400).json({ error: 'Faltan parámetros: licenseCode, metaUserId' })
  }

  try {
    const licensesSnap = await db
      .collection('licenses')
      .where('licenseCode', '==', licenseCode)
      .limit(1)
      .get()

    if (licensesSnap.empty) {
      return res.status(404).json({ error: 'Licencia no encontrada' })
    }

    const licenseDoc = licensesSnap.docs[0]
    const license = licenseDoc.data()

    const ref = db.collection('userAccess').doc(`${licenseDoc.id}_${metaUserId}`)
    await ref.set({
      metaUserId,
      licenseId: licenseDoc.id,
      companyId: license.companyId,
      appVersion: appVersion || null,
      lastSeenAt: new Date(),
    }, { merge: true })

    const snap = await ref.get()
    if (!snap.data().firstSeenAt) {
      await ref.update({ firstSeenAt: new Date() })
    }

    return res.json({ registered: true })

  } catch (err) {
    console.error('registerInstallation error:', err)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = { registerInstallation }
