/**
 * Migración a modelo v2 — ejecutar UNA vez contra Firestore real
 *
 * Qué hace:
 *  1. Crea colección `modules` con los 7 módulos y sus licenseCodes
 *  2. Crea colección `users` con los 5 usuarios globales
 *  3. Migra la licencia "test" al nuevo modelo (agrega moduleId + userIds[])
 *
 * Uso: cd functions && node migrate-v2.js
 */

const admin = require('firebase-admin')
const serviceAccount = require('./serviceAccountKey.json')

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

// ─── Módulos ──────────────────────────────────────────────────────────────────

const MODULES = [
  { id: 'XPL-DC',  name: 'Derrame de combustible',         licenseCode: 'XPL-DC'  },
  { id: 'XPL-DCA', name: 'Descarga de Combustible',        licenseCode: 'XPL-DCA' },
  { id: 'XPL-EX',  name: 'Manejo de Extintores',           licenseCode: 'XPL-EX'  },
  { id: 'XPL-EXH', name: 'Manejo de Extintores: Hospitales', licenseCode: 'XPL-EXH' },
  { id: 'XPL-EST', name: 'Recorrido de Estación',          licenseCode: 'XPL-EST' },
  { id: 'XPL-OBR', name: 'Recorrido de Obra',              licenseCode: 'XPL-OBR' },
  { id: 'XPL-EBT', name: 'Riesgo Eléctrico BT',            licenseCode: 'XPL-EBT' },
]

// ─── Usuarios globales ────────────────────────────────────────────────────────

const GLOBAL_USERS = [
  { metaUsername: 'JL_Sost360',       email: 'larsenjeronimo@sostenibilidad360.org', name: 'JL Sost360'       },
  { metaUsername: 'Xplashargentina',  email: 'xplashargentina@gmail.com',            name: 'Xplash Argentina' },
  { metaUsername: 'XplashDev',        email: 'elapa21@gmail.com',                    name: 'Xplash Dev'       },
  { metaUsername: 'marta.jara',       email: 'm.jaraotero@gmail.com',                name: 'Marta Jara'       },
  { metaUsername: 'Xplash',           email: 'xplashtraining@gmail.com',             name: 'Xplash Training'  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  Xplash — Migración v2')
  console.log('═══════════════════════════════════════════════════\n')

  // 1. Crear módulos
  console.log('▶ Creando módulos...')
  const batch1 = db.batch()
  for (const m of MODULES) {
    const { id, ...data } = m
    batch1.set(db.collection('modules').doc(id), { ...data, status: 'active', createdAt: new Date() }, { merge: true })
  }
  await batch1.commit()
  console.log(`  ✓ ${MODULES.length} módulos creados\n`)

  // 2. Crear usuarios globales — ID = metaUsername (único y queryable)
  console.log('▶ Creando usuarios globales...')
  const batch2 = db.batch()
  const globalUserIds = []
  for (const u of GLOBAL_USERS) {
    const ref = db.collection('users').doc(u.metaUsername)
    batch2.set(ref, {
      metaUsername: u.metaUsername,
      metaUserId:   null,
      name:         u.name,
      email:        u.email,
      companyId:    null,
      status:       'active',
      isGlobal:     true,
      createdAt:    new Date(),
      lastSeenAt:   null,
    }, { merge: true })
    globalUserIds.push(u.metaUsername)
  }
  await batch2.commit()
  console.log(`  ✓ ${GLOBAL_USERS.length} usuarios globales creados\n`)

  // 3. Migrar licencia "test"
  console.log('▶ Migrando licencia "test"...')
  const testSnap = await db.collection('licenses').where('licenseCode', '==', 'test').limit(1).get()

  if (testSnap.empty) {
    // No existe → crearla
    await db.collection('licenses').add({
      licenseCode:        'test',
      moduleId:           'XPL-DC',
      status:             'active',
      plan:               'test',
      userIds:            globalUserIds,
      companyId:          null,
      offlineGraceHours:  48,
      startDate:          new Date('2026-01-01'),
      expiresAt:          new Date('2027-01-01'),
      notes:              'Licencia de testing — no eliminar',
      createdAt:          new Date(),
    })
    console.log('  ✓ Licencia "test" creada (no existía)\n')
  } else {
    // Existe → migrar al nuevo modelo
    const doc = testSnap.docs[0]
    await doc.ref.update({
      moduleId: 'XPL-DC',
      userIds:  globalUserIds,
      // limpiamos campos del modelo viejo
      enabledModules:     admin.firestore.FieldValue.delete(),
      maxUsers:           admin.firestore.FieldValue.delete(),
      requiresActivation: admin.firestore.FieldValue.delete(),
    })
    console.log(`  ✓ Licencia "test" migrada (doc: ${doc.id})\n`)
  }

  console.log('═══════════════════════════════════════════════════')
  console.log('  Migración completa.')
  console.log('  Próximo paso: reescribir validateLicense.js')
  console.log('═══════════════════════════════════════════════════')
  process.exit(0)
}

main().catch(err => {
  console.error('Error en migración:', err)
  process.exit(1)
})
