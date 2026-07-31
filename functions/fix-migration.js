/**
 * Fix post-migración: corrige el error de usar 'test' en lugar de 'XPL-TEST-001'
 *
 * Qué hace:
 *  1. Elimina la licencia incorrecta con licenseCode: 'test' (si existe)
 *  2. Migra la licencia real XPL-TEST-001 al nuevo modelo
 *
 * Uso: cd functions && node fix-migration.js
 */

const admin = require('firebase-admin')
const serviceAccount = require('./serviceAccountKey.json')

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

const GLOBAL_USER_IDS = ['JL_Sost360', 'Xplashargentina', 'XplashDev', 'marta.jara', 'Xplash']

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  Xplash — Fix migración (test → XPL-TEST-001)')
  console.log('═══════════════════════════════════════════════════\n')

  // 1. Eliminar licencia incorrecta con licenseCode: 'test'
  console.log('▶ Buscando licencia incorrecta (licenseCode: "test")...')
  const wrongSnap = await db.collection('licenses').where('licenseCode', '==', 'test').get()
  if (wrongSnap.empty) {
    console.log('  — No encontrada (ok)\n')
  } else {
    for (const doc of wrongSnap.docs) {
      await doc.ref.delete()
      console.log(`  ✓ Eliminada: ${doc.id}\n`)
    }
  }

  // 2. Migrar la licencia real XPL-TEST-001
  console.log('▶ Buscando licencia XPL-TEST-001...')
  const testSnap = await db.collection('licenses').where('licenseCode', '==', 'XPL-TEST-001').limit(1).get()

  if (testSnap.empty) {
    console.log('  — No existe, creándola...')
    await db.collection('licenses').add({
      licenseCode:       'XPL-TEST-001',
      moduleId:          'XPL-DC',
      status:            'active',
      plan:              'test',
      userIds:           GLOBAL_USER_IDS,
      companyId:         null,
      offlineGraceHours: 48,
      startDate:         new Date('2026-01-01'),
      expiresAt:         new Date('2027-01-01'),
      notes:             'Licencia de testing — no eliminar',
      createdAt:         new Date(),
    })
    console.log('  ✓ Licencia XPL-TEST-001 creada\n')
  } else {
    const doc = testSnap.docs[0]
    await doc.ref.update({
      moduleId: 'XPL-DC',
      userIds:  GLOBAL_USER_IDS,
      enabledModules:     admin.firestore.FieldValue.delete(),
      maxUsers:           admin.firestore.FieldValue.delete(),
      requiresActivation: admin.firestore.FieldValue.delete(),
    })
    console.log(`  ✓ Licencia XPL-TEST-001 migrada (doc: ${doc.id})\n`)
  }

  console.log('═══════════════════════════════════════════════════')
  console.log('  Fix completo.')
  console.log('═══════════════════════════════════════════════════')
  process.exit(0)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
