const { onRequest } = require('firebase-functions/v2/https')
const { db } = require('./admin')

/**
 * POST /checkActivation
 * Body: { metaUserId, licenseCode }
 * Consulta si un Meta ID ya está activado para una licencia, sin necesidad de código.
 * Usar al inicio de la app para evitar mostrar el widget si ya está activado (ej: tras reinstalación).
 */
const checkActivation = onRequest({ cors: false, region: 'southamerica-east1' }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { metaUserId, licenseCode } = req.body

  if (!metaUserId || !licenseCode) {
    return res.status(400).json({ activated: false, reason: 'Faltan parámetros: metaUserId, licenseCode' })
  }

  try {
    const licensesSnap = await db.collection('licenses')
      .where('licenseCode', '==', licenseCode)
      .limit(1)
      .get()

    if (licensesSnap.empty) {
      return res.json({ activated: false })
    }

    const licenseId = licensesSnap.docs[0].id
    const userAccessSnap = await db.collection('userAccess').doc(`${licenseId}_${metaUserId}`).get()

    if (!userAccessSnap.exists) {
      return res.json({ activated: false })
    }

    const data = userAccessSnap.data()

    if (data.status === 'blocked') {
      return res.json({ activated: false, reason: 'Usuario bloqueado' })
    }

    return res.json({ activated: true })

  } catch (err) {
    console.error('checkActivation error:', err)
    return res.status(500).json({ activated: false, reason: 'Error interno del servidor' })
  }
})

module.exports = { checkActivation }
