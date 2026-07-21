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

// metaUserId: 4–128 chars, alphanumeric + dash/underscore/dot/colon
function isValidMetaUserId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_\-:.]{4,128}$/.test(id)
}

/**
 * POST /validateLicense
 * Body: { licenseCode, metaUserId, moduleId, appVersion?, deviceModel?, osVersion?, platform? }
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

  const { licenseCode, metaUserId, moduleId, appVersion, deviceModel, osVersion, platform } = req.body

  if (!licenseCode || !metaUserId || !moduleId) {
    return res.status(400).json({ allowed: false, reason: 'Faltan parámetros requeridos: licenseCode, metaUserId, moduleId' })
  }

  // metaUserId format validation — prevents flooding maxUsers with garbage IDs
  if (!isValidMetaUserId(metaUserId)) {
    return res.status(400).json({ allowed: false, reason: 'metaUserId inválido' })
  }

  try {
    const licensesSnap = await db.collection('licenses').where('licenseCode', '==', licenseCode).limit(1).get()

    if (licensesSnap.empty) {
      // Log detail internally but return generic message to avoid code enumeration
      await logEvent({ licenseCode, metaUserId, moduleId, appVersion, allowed: false, reason: 'Licencia no encontrada' })
      return res.json({ allowed: false, reason: 'Acceso denegado' })
    }

    const licenseDoc = licensesSnap.docs[0]
    const license = licenseDoc.data()

    if (license.status === 'blocked') {
      await logEvent({ licenseCode, metaUserId, moduleId, appVersion, allowed: false, reason: 'Licencia bloqueada por Xplash', licenseId: licenseDoc.id, companyId: license.companyId })
      return res.json({ allowed: false, reason: 'Licencia bloqueada por Xplash' })
    }

    if (license.status === 'paused') {
      await logEvent({ licenseCode, metaUserId, moduleId, appVersion, allowed: false, reason: 'Licencia pausada temporalmente', licenseId: licenseDoc.id, companyId: license.companyId })
      return res.json({ allowed: false, reason: 'Licencia pausada temporalmente' })
    }

    if (license.status === 'draft') {
      await logEvent({ licenseCode, metaUserId, moduleId, appVersion, allowed: false, reason: 'Licencia no activada', licenseId: licenseDoc.id, companyId: license.companyId })
      return res.json({ allowed: false, reason: 'Licencia no activada' })
    }

    const now = new Date()
    const expiresAt = license.expiresAt?.toDate ? license.expiresAt.toDate() : new Date(license.expiresAt)

    if (expiresAt < now) {
      await logEvent({ licenseCode, metaUserId, moduleId, appVersion, allowed: false, reason: 'Licencia vencida', licenseId: licenseDoc.id, companyId: license.companyId })
      return res.json({ allowed: false, reason: 'Licencia vencida' })
    }

    const enabledModules = license.enabledModules || []
    if (!enabledModules.includes(moduleId)) {
      await logEvent({ licenseCode, metaUserId, moduleId, appVersion, allowed: false, reason: `Módulo '${moduleId}' no habilitado en esta licencia`, licenseId: licenseDoc.id, companyId: license.companyId })
      return res.json({ allowed: false, reason: `Módulo '${moduleId}' no habilitado en esta licencia` })
    }

    const companySnap = await db.collection('companies').doc(license.companyId).get()
    if (!companySnap.exists || companySnap.data().status !== 'active') {
      await logEvent({ licenseCode, metaUserId, moduleId, appVersion, allowed: false, reason: 'Empresa suspendida', licenseId: licenseDoc.id, companyId: license.companyId })
      return res.json({ allowed: false, reason: 'Empresa suspendida' })
    }

    // maxUsers check — before registering, so a new unknown user can't register past the limit
    const maxUsers = license.maxUsers || 1
    const userAccessSnap = await db.collection('userAccess').where('licenseId', '==', licenseDoc.id).get()
    const knownUserIds = userAccessSnap.docs.map(d => d.data().metaUserId)
    const isKnown = knownUserIds.includes(metaUserId)

    if (!isKnown && knownUserIds.length >= maxUsers) {
      await logEvent({ licenseCode, metaUserId, moduleId, appVersion, allowed: false, reason: `Límite de ${maxUsers} usuario(s) alcanzado`, licenseId: licenseDoc.id, companyId: license.companyId })
      return res.json({ allowed: false, reason: `Límite de ${maxUsers} usuario(s) alcanzado` })
    }

    await registerOrUpdateUserAccess({
      metaUserId, licenseId: licenseDoc.id, companyId: license.companyId,
      appVersion, deviceModel, osVersion, platform,
    })

    await logEvent({ licenseCode, metaUserId, moduleId, appVersion, allowed: true, reason: null, licenseId: licenseDoc.id, companyId: license.companyId })

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

async function registerOrUpdateUserAccess({ metaUserId, licenseId, companyId, appVersion, deviceModel, osVersion, platform }) {
  const ref = db.collection('userAccess').doc(`${licenseId}_${metaUserId}`)
  const snap = await ref.get()

  const fields = {
    metaUserId,
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
    await ref.set({ ...fields, firstSeenAt: new Date() })
  } else {
    await ref.update(fields)
  }
}

async function logEvent({ licenseCode, metaUserId, moduleId, appVersion, allowed, reason, licenseId, companyId }) {
  await db.collection('events').add({
    licenseCode,
    licenseId:  licenseId  || null,
    companyId:  companyId  || null,
    metaUserId,
    moduleId,
    appVersion: appVersion || null,
    allowed,
    reason:     reason     || null,
    createdAt:  new Date(),
  })
}

module.exports = { validateLicense }
