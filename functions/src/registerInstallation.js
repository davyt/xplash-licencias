const { onRequest } = require('firebase-functions/v2/https')
const { db } = require('./admin')

/**
 * POST /registerInstallation
 * Body: { licenseCode, installId, appVersion }
 * Usado para pre-registrar un visor antes de que entre al módulo.
 */
const registerInstallation = onRequest({ cors: false }, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { licenseCode, installId, appVersion } = req.body

  if (!licenseCode || !installId) {
    return res.status(400).json({ error: 'Faltan parámetros: licenseCode, installId' })
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

    const ref = db.collection('installations').doc(`${licenseDoc.id}_${installId}`)
    await ref.set({
      installId,
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
