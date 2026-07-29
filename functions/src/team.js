const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { admin } = require('./admin')

const adminAuth = () => admin.auth()

const REGION = 'southamerica-east1'

// ─── listTeamUsers ────────────────────────────────────────────────────────────
const listTeamUsers = onCall({ region: REGION }, async (req) => {
  requireAdmin(req)

  const result = await adminAuth().listUsers(1000)
  const users = result.users
    .filter(u => u.customClaims?.role)
    .map(u => ({
      uid:          u.uid,
      email:        u.email,
      displayName:  u.displayName || null,
      lastSignInAt: u.metadata.lastSignInTime || null,
      role:         u.customClaims?.role || null,
    }))

  return { users }
})

// ─── inviteTeamUser ───────────────────────────────────────────────────────────
const inviteTeamUser = onCall({ region: REGION }, async (req) => {
  requireAdmin(req)

  const { email, displayName, role } = req.data
  if (!email || !role) throw new HttpsError('invalid-argument', 'email y role son requeridos')
  if (!['admin', 'marketing'].includes(role)) throw new HttpsError('invalid-argument', 'Rol inválido')

  let userRecord
  try {
    userRecord = await adminAuth().createUser({ email, displayName, emailVerified: true })
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      userRecord = await adminAuth().getUserByEmail(email)
    } else {
      throw new HttpsError('internal', err.message)
    }
  }

  await adminAuth().setCustomUserClaims(userRecord.uid, { role })

  const link = await adminAuth().generatePasswordResetLink(email, {
    url: 'https://xplash-licencias-a7a58.web.app',
  })

  return { link }
})

// ─── updateTeamUser ───────────────────────────────────────────────────────────
const updateTeamUser = onCall({ region: REGION }, async (req) => {
  requireAdmin(req)

  const { uid, role, displayName } = req.data
  if (!uid) throw new HttpsError('invalid-argument', 'uid requerido')

  if (role) {
    if (!['admin', 'marketing'].includes(role)) throw new HttpsError('invalid-argument', 'Rol inválido')
    await adminAuth().setCustomUserClaims(uid, { role })
  }

  if (displayName !== undefined) {
    await adminAuth().updateUser(uid, { displayName })
  }

  return { ok: true }
})

// ─── deleteTeamUser ───────────────────────────────────────────────────────────
const deleteTeamUser = onCall({ region: REGION }, async (req) => {
  requireAdmin(req)

  const { uid } = req.data
  if (!uid) throw new HttpsError('invalid-argument', 'uid requerido')
  if (uid === req.auth?.uid) throw new HttpsError('failed-precondition', 'No podés eliminarte a vos mismo')

  await adminAuth().deleteUser(uid)
  return { ok: true }
})

// ─── resendActivationLink ─────────────────────────────────────────────────────
const resendActivationLink = onCall({ region: REGION }, async (req) => {
  requireAdmin(req)

  const { uid } = req.data
  if (!uid) throw new HttpsError('invalid-argument', 'uid requerido')

  const user = await adminAuth().getUser(uid)
  const activationLink = await adminAuth().generatePasswordResetLink(user.email, {
    url: 'https://xplash-licencias-a7a58.web.app',
  })

  return { result: { activationLink } }
})

// ─── helpers ──────────────────────────────────────────────────────────────────
function requireAdmin(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Autenticación requerida')
  if (req.auth.token?.role !== 'admin') throw new HttpsError('permission-denied', 'Solo admins')
}

module.exports = { listTeamUsers, inviteTeamUser, updateTeamUser, deleteTeamUser, resendActivationLink }
