/**
 * Script de invitación de usuarios al panel Xplash.
 * Crea las cuentas en Firebase Auth, asigna el rol como custom claim,
 * y genera un link de activación para cada usuario.
 *
 * Uso: cd functions && node invite-users.js
 */

const admin = require('firebase-admin')
const serviceAccount = require('./serviceAccountKey.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const USERS = [
  { email: 'marta@martajara.com',          displayName: 'Marta Jara',          role: 'admin'     },
  { email: 'mariaelena.ragazzi@gmail.com', displayName: 'María Elena Ragazzi', role: 'admin'     },
  { email: 'apariciodebali@gmail.com',     displayName: 'Aparicio De Bali',    role: 'admin'     },
  { email: 'amalianavarrete@gmail.com',    displayName: 'Amalia Navarrete',    role: 'admin'     },
  { email: 'lucia.garcia@xplash.org',      displayName: 'Lucía García',        role: 'marketing' },
  { email: 'carlos.lopez@xplash.org',      displayName: 'Carlos López',        role: 'marketing' },
  { email: 'comercial@xplash.org',         displayName: 'Demo Comercial',      role: 'marketing' },
]

const PANEL_URL = 'https://xplash-licencias-a7a58.web.app'

async function processUser(u) {
  // 1. Crear usuario (o recuperar si ya existe)
  let userRecord
  try {
    userRecord = await admin.auth().createUser({
      email:          u.email,
      displayName:    u.displayName,
      emailVerified:  true,
    })
    console.log(`  ✓ Cuenta creada`)
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      userRecord = await admin.auth().getUserByEmail(u.email)
      console.log(`  ~ Ya existía en Firebase Auth`)
    } else {
      throw err
    }
  }

  // 2. Asignar rol como custom claim (queda listo para Etapa 2)
  await admin.auth().setCustomUserClaims(userRecord.uid, { role: u.role })
  console.log(`  ✓ Rol asignado: ${u.role}`)

  // 3. Generar link de activación (password reset = primer acceso)
  const link = await admin.auth().generatePasswordResetLink(u.email, {
    url: PANEL_URL,
  })
  console.log(`  ✓ Link generado`)

  return { ...u, uid: userRecord.uid, link }
}

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  Xplash — Invitaciones de equipo')
  console.log('═══════════════════════════════════════════════════\n')

  const results = []

  for (const u of USERS) {
    console.log(`▶ ${u.displayName} <${u.email}>`)
    try {
      const result = await processUser(u)
      results.push({ ...result, ok: true })
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`)
      results.push({ ...u, ok: false, error: err.message })
    }
    console.log()
  }

  // Resumen con los links
  console.log('═══════════════════════════════════════════════════')
  console.log('  LINKS DE ACTIVACIÓN — compartir con cada usuario')
  console.log('  (cada link es de un solo uso y expira en 24h)')
  console.log('═══════════════════════════════════════════════════\n')

  for (const r of results) {
    if (!r.ok) {
      console.log(`✗ ${r.displayName} — ERROR: ${r.error}\n`)
      continue
    }
    console.log(`─── ${r.displayName} (${r.role}) ───────────────────`)
    console.log(`Email : ${r.email}`)
    console.log(`Link  : ${r.link}`)
    console.log()
  }

  console.log('Listo. Enviá cada link por WhatsApp o email.')
  process.exit(0)
}

main().catch(err => {
  console.error('Error fatal:', err)
  process.exit(1)
})
