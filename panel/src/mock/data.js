// Datos de demostración para desarrollo sin Firebase
export const mockCompanies = [
  { id: 'c1', name: 'Acería del Sur', email: 'contacto@aceria.com', status: 'active', notes: 'Cliente piloto. Contrato anual firmado.', createdAt: '2026-01-15' },
  { id: 'c2', name: 'LogiCorp SA', email: 'logi@logicorp.com', status: 'active', notes: '', createdAt: '2026-02-01' },
  { id: 'c3', name: 'MineraX', email: 'minera@minerax.com', status: 'paused', notes: 'Pago pendiente de febrero.', createdAt: '2026-01-20' },
  { id: 'c4', name: 'TechPetrol', email: 'tech@techpetrol.com', status: 'active', notes: '', createdAt: '2026-03-10' },
  { id: 'c5', name: 'Industrias SA', email: 'ind@industriasSA.com', status: 'active', notes: '', createdAt: '2026-04-01' },
]

export const mockLicenses = [
  {
    id: 'l1', licenseCode: 'XPL-ACERIA-001', companyId: 'c1', companyName: 'Acería del Sur',
    status: 'active', plan: '6m_1_visor', maxDevices: 1, offlineGraceHours: 48,
    startDate: '2026-02-01', expiresAt: '2026-08-01',
    enabledModules: ['derrame_combustible', 'riesgo_electrico'], notes: 'Renovar en julio.',
  },
  {
    id: 'l2', licenseCode: 'XPL-LOGI-001', companyId: 'c2', companyName: 'LogiCorp SA',
    status: 'active', plan: '6m_3_visores', maxDevices: 3, offlineGraceHours: 48,
    startDate: '2026-02-01', expiresAt: '2026-07-15',
    enabledModules: ['derrame_combustible', 'recorrido_obra'], notes: '',
  },
  {
    id: 'l3', licenseCode: 'XPL-MINERA-001', companyId: 'c3', companyName: 'MineraX',
    status: 'blocked', plan: '3m_2_visores', maxDevices: 2, offlineGraceHours: 24,
    startDate: '2026-01-01', expiresAt: '2026-07-30',
    enabledModules: ['derrame_combustible'], notes: 'Bloqueada por falta de pago.',
  },
  {
    id: 'l4', licenseCode: 'XPL-TECH-001', companyId: 'c4', companyName: 'TechPetrol',
    status: 'active', plan: '3m_1_visor', maxDevices: 1, offlineGraceHours: 48,
    startDate: '2026-04-14', expiresAt: '2026-07-14',
    enabledModules: ['riesgo_electrico'], notes: '',
  },
  {
    id: 'l5', licenseCode: 'XPL-DEMO-001', companyId: 'c1', companyName: 'Acería del Sur',
    status: 'draft', plan: '1m_1_visor', maxDevices: 1, offlineGraceHours: 48,
    startDate: null, expiresAt: null,
    enabledModules: [], notes: 'Licencia de prueba pendiente de configurar.',
  },
]

export const mockInstallations = [
  { id: 'i1', installId: 'Quest-AceriaA01', licenseId: 'l1', companyId: 'c1', companyName: 'Acería del Sur', appVersion: '1.2.0', lastSeenAt: new Date(Date.now() - 5 * 60 * 1000), firstSeenAt: new Date('2026-02-05') },
  { id: 'i2', installId: 'Quest-Logi01', licenseId: 'l2', companyId: 'c2', companyName: 'LogiCorp SA', appVersion: '1.1.0', lastSeenAt: new Date(Date.now() - 2 * 60 * 60 * 1000), firstSeenAt: new Date('2026-02-10') },
  { id: 'i3', installId: 'Quest-Logi02', licenseId: 'l2', companyId: 'c2', companyName: 'LogiCorp SA', appVersion: '1.2.0', lastSeenAt: new Date(Date.now() - 2 * 60 * 60 * 1000), firstSeenAt: new Date('2026-02-12') },
  { id: 'i4', installId: 'Quest-Mine01', licenseId: 'l3', companyId: 'c3', companyName: 'MineraX', appVersion: '1.0.0', lastSeenAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), firstSeenAt: new Date('2026-01-22') },
]

export const mockEvents = [
  { id: 'e1', licenseCode: 'XPL-ACERIA-001', companyId: 'c1', companyName: 'Acería del Sur', installId: 'Quest-AceriaA01', moduleId: 'derrame_combustible', allowed: true, reason: null, createdAt: new Date(Date.now() - 8 * 60 * 1000) },
  { id: 'e2', licenseCode: 'XPL-LOGI-001', companyId: 'c2', companyName: 'LogiCorp SA', installId: 'Quest-Logi01', moduleId: 'recorrido_obra', allowed: true, reason: null, createdAt: new Date(Date.now() - 35 * 60 * 1000) },
  { id: 'e3', licenseCode: 'XPL-MINERA-001', companyId: 'c3', companyName: 'MineraX', installId: 'Quest-Mine01', moduleId: 'derrame_combustible', allowed: false, reason: 'Licencia bloqueada por Xplash', createdAt: new Date(Date.now() - 70 * 60 * 1000) },
  { id: 'e4', licenseCode: 'XPL-TECH-001', companyId: 'c4', companyName: 'TechPetrol', installId: 'Quest-Tech01', moduleId: 'riesgo_electrico', allowed: false, reason: 'Licencia vencida', createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  { id: 'e5', licenseCode: 'XPL-ACERIA-001', companyId: 'c1', companyName: 'Acería del Sur', installId: 'Quest-AceriaA01', moduleId: 'riesgo_electrico', allowed: true, reason: null, createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000) },
]

export const MODULES = [
  { id: 'derrame_combustible', label: 'Derrame de combustible' },
  { id: 'riesgo_electrico', label: 'Riesgo eléctrico' },
  { id: 'recorrido_obra', label: 'Recorrido de obra' },
  { id: 'trabajo_en_altura', label: 'Trabajo en altura' },
]

export const STATUS_LABELS = {
  active:  { label: 'Activa',    color: 'success' },
  blocked: { label: 'Bloqueada', color: 'error' },
  expired: { label: 'Vencida',   color: 'warning' },
  paused:  { label: 'Pausada',   color: 'default' },
  draft:   { label: 'Borrador',  color: 'processing' },
}
