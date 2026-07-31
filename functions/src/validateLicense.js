const { onRequest } = require('firebase-functions/v2/https')
const { db } = require('./admin')

// In-memory rate limiter — 20 req/min per IP (per instance)
const _rateMap = new Map()
const RATE_LIMIT     = 20
const RATE_WINDOW_MS = 60_000

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for']
  return xff ? xff.split(',')[0].trim() : (req.ip || 'unknown')
}

function isRateLimited(ip) {
  const now   = Date.now()
  const entry = _rateMap.get(ip)
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    _rateMap.set(ip, { count: 1, windowStart: now })
    return false
  }
  if (entry.count >= RATE_LIMIT) return true
  entry.count++
  return false
}

function isValidMetaUserId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_\-:.]{4,128}$/.test(id)
}

function isValidMetaUsername(u) {
  return typeof u === 'string' && u.trim().length >= 2 && u.trim().length <= 64
}

/**
 * POST /validateLicense
 * Body: { licenseCode, metaUserId, metaUsername, appVersion?, deviceModel?, osVersion?, platform? }
 * Response: { allowed, validUntil?, offlineGraceHours?, reason? }
 *
 * El licenseCode identifica la app/módulo (XPL-DC, XPL-TEST-001, etc.).
 * Para usuarios isGlobal: se verifica que el código exista en al menos una licencia activa.
 * Para usuarios no globales: se busca una licencia activa que los incluya en userIds[].
 */
const validateLicense = onRequest({ cors: false, region: 'southamerica-east1' }, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ip = getClientIp(req)
  if (isRateLimited(ip)) {
    return res.status(429).json({ allowed: false, reason: 'Demasiadas solicitudes. Intentá más tarde.' })
  }

  const { licenseCode, metaUserId, metaUsername, appVersion, deviceModel, osVersion, platform } = req.body

  if (!licenseCode || !metaUserId || !metaUsername) {
    return res.status(400).json({ allowed: false, reason: 'Faltan parámetros requeridos: licenseCode, metaUserId, metaUsername' })
  }

  if (!isValidMetaUserId(metaUserId)) {
    return res.status(400).json({ allowed: false, reason: 'metaUserId inválido' })
  }

  if (!isValidMetaUsername(metaUsername)) {
    return res.status(400).json({ allowed: false, reason: 'metaUsername inválido' })
  }

  try {
    // 1. Buscar usuario por metaUsername (doc ID = metaUsername)
    const userRef  = db.collection('users').doc(metaUsername)
    const userSnap = await userRef.get()

    if (!userSnap.exists) {
      await logEvent({ licenseCode, metaUserId, metaUsername, moduleId: null, licenseId: null, allowed: false, reason: 'Usuario no autorizado' })
      return res.json({ allowed: false, reason: 'Acceso denegado' })
    }

    const user = userSnap.data()

    if (user.status === 'blocked') {
      await logEvent({ licenseCode, metaUserId, metaUsername, moduleId: null, licenseId: null, allowed: false, reason: 'Usuario bloqueado' })
      return res.json({ allowed: false, reason: 'Usuario bloqueado.' })
    }

    // 2. Usuarios globales: verificar que el licenseCode corresponda a al menos una licencia
    if (user.isGlobal) {
      const anyLicSnap = await db.collection('licenses')
        .where('licenseCode', '==', licenseCode)
        .limit(1)
        .get()

      if (anyLicSnap.empty) {
        await logEvent({ licenseCode, metaUserId, metaUsername, moduleId: null, licenseId: null, allowed: false, reason: 'Código desconocido' })
        return res.json({ allowed: false, reason: 'Acceso denegado' })
      }

      const licData  = anyLicSnap.docs[0].data()
      const licId    = anyLicSnap.docs[0].id
      const moduleId = licData.moduleId || null

      await updateUser(userRef, user, { metaUserId, appVersion, deviceModel, osVersion, platform })
      await logEvent({ licenseCode, metaUserId, metaUsername, moduleId, licenseId: licId, allowed: true, reason: null })

      const validUntil = new Date()
      validUntil.setFullYear(validUntil.getFullYear() + 1)

      return res.json({ allowed: true, validUntil: validUntil.toISOString(), offlineGraceHours: 48 })
    }

    // 3. Usuarios no globales: buscar licencia activa que los incluya
    // Índice compuesto requerido: licenseCode ASC + userIds ARRAY_CONTAINS
    const licensesSnap = await db.collection('licenses')
      .where('licenseCode', '==', licenseCode)
      .where('userIds', 'array-contains', metaUsername)
      .get()

    const now = new Date()

    const validLicenses = licensesSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(l => {
        if (l.status !== 'active') return false
        const exp = l.expiresAt?.toDate ? l.expiresAt.toDate() : new Date(l.expiresAt)
        return exp > now
      })
      .sort((a, b) => {
        const ca = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
        const cb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
        return cb - ca
      })

    if (validLicenses.length === 0) {
      await logEvent({ licenseCode, metaUserId, metaUsername, moduleId: null, licenseId: null, allowed: false, reason: 'Sin licencia activa' })
      return res.json({ allowed: false, reason: 'Sin licencia activa para este módulo' })
    }

    const license   = validLicenses[0]
    const expiresAt = license.expiresAt?.toDate ? license.expiresAt.toDate() : new Date(license.expiresAt)

    await updateUser(userRef, user, { metaUserId, appVersion, deviceModel, osVersion, platform })
    await logEvent({ licenseCode, metaUserId, metaUsername, moduleId: license.moduleId || null, licenseId: license.id, allowed: true, reason: null })

    return res.json({
      allowed:           true,
      validUntil:        expiresAt.toISOString(),
      offlineGraceHours: license.offlineGraceHours ?? 48,
    })

  } catch (err) {
    console.error('validateLicense error:', err)
    return res.status(500).json({ allowed: false, reason: 'Error interno del servidor' })
  }
})

async function updateUser(ref, current, { metaUserId, appVersion, deviceModel, osVersion, platform }) {
  const update = { lastSeenAt: new Date() }
  if (!current.metaUserId && metaUserId) update.metaUserId = metaUserId
  if (appVersion  !== undefined) update.appVersion  = appVersion
  if (deviceModel !== undefined) update.deviceModel = deviceModel
  if (osVersion   !== undefined) update.osVersion   = osVersion
  if (platform    !== undefined) update.platform    = platform
  await ref.update(update)
}

async function logEvent({ licenseCode, licenseId, moduleId, metaUserId, metaUsername, allowed, reason }) {
  await db.collection('events').add({
    licenseCode,
    licenseId:   licenseId  || null,
    moduleId:    moduleId   || null,
    metaUserId,
    metaUsername,
    userId:      metaUsername,
    allowed,
    reason:      reason     || null,
    createdAt:   new Date(),
  })
}

module.exports = { validateLicense }
