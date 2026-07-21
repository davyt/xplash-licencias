/**
 * Script one-time: crea los usuarios del panel en Firebase Auth
 * y los registra en la colección adminUsers de Firestore.
 *
 * Ejecutar desde la raíz del repo:
 *   node scripts/createAdminUsers.js
 *
 * Requiere tener configurada la variable de entorno:
 *   GOOGLE_APPLICATION_CREDENTIALS=./functions/serviceAccountKey.json
 *
 * O bien, si ya hiciste `firebase login`, ejecutar con:
 *   firebase --project xplash-licencias-a7a58 exec "node scripts/createAdminUsers.js"
 */

const admin = require('./functions/node_modules/firebase-admin')

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
})

const db = admin.firestore()

const usersToCreate = [
  { email: 'marta@martajara.com',           displayName: 'Marta Jara',          role: 'admin' },
  { email: 'mariaelena.ragazzi@gmail.com',  displayName: 'María Elena Ragazzi', role: 'admin' },
  { email: 'apariciodebali@gmail.com',       displayName: 'Aparicio De Bali',    role: 'admin' },
  { email: 'amalianavarrete@gmail.com',      displayName: 'Amalia Navarrete',    role: 'admin' },
]

async function run() {
  console.log('Creando usuarios en Firebase Auth...\n')

  for (const u of usersToCreate) {
    try {
      // Crear en Firebase Auth sin contraseña — el usuario la define vía email de reset
      const userRecord = await admin.auth().createUser({
        email: u.email,
        displayName: u.displayName,
        emailVerified: false,
      })

      // Registrar en Firestore
      await db.collection('adminUsers').doc(userRecord.uid).set({
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        status: 'pending',
        createdAt: new Date(),
      })

      // Generar link para que el usuario establezca su propia contraseña
      const resetLink = await admin.auth().generatePasswordResetLink(u.email)

      console.log(`✓ ${u.email}`)
      console.log(`  → ${resetLink}\n`)
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        console.log(`⚠ ${u.email} — ya existe en Firebase Auth, saltando.\n`)
      } else {
        console.error(`✗ ${u.email} — ${err.message}\n`)
      }
    }
  }

  console.log('Listo. Enviá cada link al usuario correspondiente para que establezca su contraseña.')
  process.exit(0)
}

run()
