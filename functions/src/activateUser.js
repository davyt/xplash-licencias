const { onRequest } = require('firebase-functions/v2/https')
const { db } = require('./admin')

function isValidMetaUserId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_\-:.]{4,128}$/.test(id)
}

/**
 * POST /activateUser
 * Body: { activationCode, metaUserId }
 * Vincula un código de activación con un Meta ID en la primera apertura.
 * Idempotente: si el mismo metaUserId ya activó ese código, responde { activated: true }.
 */
const activateUser = onRequest({ cors: false, region: 'southamerica-east1' }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { activationCode, metaUserId } = req.body

  if (!activationCode || !metaUserId) {
    return res.status(400).json({ activated: false, reason: 'Faltan parámetros: activationCode, metaUserId' })
  }

  if (!isValidMetaUserId(metaUserId)) {
    return res.status(400).json({ activated: false, reason: 'metaUserId inválido' })
  }

  try {
    const codeRef = db.collection('activationCodes').doc(activationCode)
    const codeSnap = await codeRef.get()

    if (!codeSnap.exists) {
      return res.json({ activated: false, reason: 'Código inválido' })
    }

    const code = codeSnap.data()

    if (code.status === 'blocked') {
      return res.json({ activated: false, reason: 'Código bloqueado' })
    }

    if (code.status === 'activated') {
      if (code.metaUserId === metaUserId) {
        return res.json({ activated: true }) // idempotente — misma cuenta, mismo código
      }
      return res.json({ activated: false, reason: 'Código ya utilizado' })
    }

    // status === 'pending' — verificar que este metaUserId no tenga ya otro código activo en la misma licencia
    const existingSnap = await db.collection('activationCodes')
      .where('licenseId', '==', code.licenseId)
      .where('metaUserId', '==', metaUserId)
      .where('status', '==', 'activated')
      .limit(1)
      .get()

    if (!existingSnap.empty) {
      return res.json({ activated: false, reason: 'Este Meta ID ya tiene un código activo para esta licencia' })
    }

    const now = new Date()

    await codeRef.update({
      metaUserId,
      status: 'activated',
      activatedAt: now,
    })

    const userAccessRef = db.collection('userAccess').doc(`${code.licenseId}_${metaUserId}`)
    const userAccessSnap = await userAccessRef.get()

    const accessFields = {
      metaUserId,
      licenseId:       code.licenseId,
      companyId:       code.companyId,
      name:            code.name  || null,
      email:           code.email || null,
      activationCode,
      status:          'active',
      lastSeenAt:      now,
    }

    if (!userAccessSnap.exists) {
      await userAccessRef.set({ ...accessFields, firstSeenAt: now })
    } else {
      await userAccessRef.update(accessFields)
    }

    return res.json({ activated: true })

  } catch (err) {
    console.error('activateUser error:', err)
    return res.status(500).json({ activated: false, reason: 'Error interno del servidor' })
  }
})

module.exports = { activateUser }
