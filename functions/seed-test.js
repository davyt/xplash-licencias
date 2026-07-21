/**
 * Crea la empresa y licencia de prueba en Firestore real.
 *
 * Requisito: descargá la Service Account Key desde
 *   Firebase Console → Project Settings → Service accounts → Generate new private key
 * Guardala como functions/serviceAccountKey.json (ya está en .gitignore)
 *
 * Luego desde la carpeta /functions:
 *   node seed-test.js
 */

const admin = require('firebase-admin')
const serviceAccount = require('./serviceAccountKey.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

async function main() {
  // Empresa de prueba
  await db.collection('companies').doc('company_test').set({
    name: 'Empresa Test',
    email: 'test@xplash.com',
    status: 'active',
    notes: 'Empresa de prueba para equipo integración Unreal',
    createdAt: new Date().toISOString().slice(0, 10),
  })
  console.log('✅ Empresa test creada (company_test)')

  // Licencia de prueba — todos los módulos habilitados, vence 2027
  await db.collection('licenses').doc('license_test_001').set({
    licenseCode:        'XPL-TEST-001',
    companyId:          'company_test',
    status:             'active',
    plan:               'test',
    maxUsers:           10,
    offlineGraceHours:  48,
    enabledModules: [
      'derrame_combustible',
      'riesgo_electrico',
      'recorrido_obra',
      'trabajo_en_altura',
    ],
    startDate:  '2026-01-01',
    expiresAt:  '2027-12-31T23:59:59Z',
    notes:      'Licencia de prueba — NO usar en producción',
  })
  console.log('✅ Licencia XPL-TEST-001 creada (license_test_001)')

  console.log('\n🎯 Probá ahora con:')
  console.log(`
curl -X POST \\
  https://southamerica-east1-xplash-licencias-a7a58.cloudfunctions.net/validateLicense \\
  -H "Content-Type: application/json" \\
  -d '{"licenseCode":"XPL-TEST-001","metaUserId":"mu_test001","moduleId":"derrame_combustible","appVersion":"0.1.0"}'
`)
  console.log('Respuesta esperada: { "allowed": true, "validUntil": "2027-12-31T23:59:59Z", "offlineGraceHours": 48 }')

  process.exit(0)
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
