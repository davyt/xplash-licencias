/**
 * Script de seed — carga datos demo en Firestore (emulador o real)
 * Uso: node functions/src/seed.js
 */
const admin = require('firebase-admin')

// Para emulador local:
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'

admin.initializeApp({ projectId: 'xplash-licencias' })
const db = admin.firestore()

async function seed() {
  console.log('Cargando datos demo...')

  const companies = [
    { id: 'c1', name: 'Acería del Sur', email: 'contacto@aceria.com', status: 'active', notes: 'Cliente piloto. Contrato anual.' },
    { id: 'c2', name: 'LogiCorp SA', email: 'logi@logicorp.com', status: 'active', notes: '' },
    { id: 'c3', name: 'MineraX', email: 'minera@minerax.com', status: 'paused', notes: 'Pago pendiente.' },
  ]

  const licenses = [
    {
      id: 'l1',
      licenseCode: 'XPL-ACERIA-001',
      companyId: 'c1',
      status: 'active',
      plan: '6m_1_visor',
      maxDevices: 1,
      offlineGraceHours: 48,
      startDate: new Date('2026-02-01'),
      expiresAt: new Date('2026-08-01'),
      enabledModules: ['derrame_combustible', 'riesgo_electrico'],
      notes: 'Renovar en julio.',
    },
    {
      id: 'l2',
      licenseCode: 'XPL-LOGI-001',
      companyId: 'c2',
      status: 'active',
      plan: '6m_3_visores',
      maxDevices: 3,
      offlineGraceHours: 48,
      startDate: new Date('2026-02-01'),
      expiresAt: new Date('2026-07-15'),
      enabledModules: ['derrame_combustible', 'recorrido_obra'],
      notes: '',
    },
    {
      id: 'l3',
      licenseCode: 'XPL-MINERA-001',
      companyId: 'c3',
      status: 'blocked',
      plan: '3m_2_visores',
      maxDevices: 2,
      offlineGraceHours: 24,
      startDate: new Date('2026-01-01'),
      expiresAt: new Date('2026-07-30'),
      enabledModules: ['derrame_combustible'],
      notes: 'Bloqueada por falta de pago.',
    },
  ]

  const batch = db.batch()

  for (const company of companies) {
    const { id, ...data } = company
    batch.set(db.collection('companies').doc(id), { ...data, createdAt: new Date() })
  }

  for (const license of licenses) {
    const { id, ...data } = license
    batch.set(db.collection('licenses').doc(id), { ...data, createdAt: new Date() })
  }

  await batch.commit()
  console.log(`✓ ${companies.length} empresas y ${licenses.length} licencias cargadas`)

  process.exit(0)
}

seed().catch(err => {
  console.error('Error en seed:', err)
  process.exit(1)
})
