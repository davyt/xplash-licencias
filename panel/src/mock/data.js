// Datos de demostración para desarrollo sin Firebase
export const mockCompanies = [
  { id: 'c1', name: 'Acería del Sur', email: 'contacto@aceria.com', contactName: 'Hernán Villalba', contactPhone: '+54 11 4231-0001', status: 'active', notes: 'Cliente piloto. Contrato anual firmado.', createdAt: '2026-01-15' },
  { id: 'c2', name: 'LogiCorp SA', email: 'logi@logicorp.com', contactName: 'Sandra Ruiz', contactPhone: '+54 351 422-0099', status: 'active', notes: '', createdAt: '2026-02-01' },
  { id: 'c3', name: 'MineraX', email: 'minera@minerax.com', contactName: 'Jorge Peña', contactPhone: '', status: 'paused', notes: 'Pago pendiente de febrero.', createdAt: '2026-01-20' },
  { id: 'c4', name: 'TechPetrol', email: 'tech@techpetrol.com', contactName: 'Lucía Ferreyra', contactPhone: '+54 11 5800-4422', status: 'active', notes: '', createdAt: '2026-03-10' },
  { id: 'c5', name: 'Industrias SA', email: 'ind@industriasSA.com', contactName: '', contactPhone: '', status: 'active', notes: '', createdAt: '2026-04-01' },
]

export const mockLicenses = [
  {
    id: 'l1', licenseCode: 'XPL-ACERIA-001', companyId: 'c1', companyName: 'Acería del Sur',
    status: 'active', plan: '6m_1_usuario', maxUsers: 1, offlineGraceHours: 48,
    startDate: '2026-02-01', expiresAt: '2026-07-27',
    enabledModules: ['derrame_combustible', 'riesgo_electrico'], notes: 'Renovar en julio.',
  },
  {
    id: 'l2', licenseCode: 'XPL-LOGI-001', companyId: 'c2', companyName: 'LogiCorp SA',
    status: 'active', plan: '6m_3_usuarios', maxUsers: 3, offlineGraceHours: 48,
    startDate: '2026-02-01', expiresAt: '2026-07-15',
    enabledModules: ['derrame_combustible', 'recorrido_obra'], notes: '',
  },
  {
    id: 'l3', licenseCode: 'XPL-MINERA-001', companyId: 'c3', companyName: 'MineraX',
    status: 'blocked', plan: '3m_2_usuarios', maxUsers: 2, offlineGraceHours: 24,
    startDate: '2026-01-01', expiresAt: '2026-07-30',
    enabledModules: ['derrame_combustible'], notes: 'Bloqueada por falta de pago.',
  },
  {
    id: 'l4', licenseCode: 'XPL-TECH-001', companyId: 'c4', companyName: 'TechPetrol',
    status: 'active', plan: '3m_1_usuario', maxUsers: 1, offlineGraceHours: 48,
    startDate: '2026-04-14', expiresAt: '2026-07-14',
    enabledModules: ['riesgo_electrico'], notes: '',
  },
  {
    id: 'l5', licenseCode: 'XPL-DEMO-001', companyId: 'c1', companyName: 'Acería del Sur',
    status: 'draft', plan: '1m_1_usuario', maxUsers: 1, offlineGraceHours: 48,
    startDate: null, expiresAt: null,
    enabledModules: [], notes: 'Licencia de prueba pendiente de configurar.',
  },
]

export const mockUserAccess = [
  {
    id: 'ua1', metaUserId: 'mu_4a1f9b2c', licenseId: 'l1', companyId: 'c1', companyName: 'Acería del Sur',
    appVersion: '1.2.0',
    deviceModel: 'Meta Quest 3',
    osVersion: 'Android 12 (API 32)',
    platform: 'quest3',
    lastSeenAt: new Date(Date.now() - 5 * 60 * 1000),
    firstSeenAt: new Date('2026-02-05'),
  },
  {
    id: 'ua2', metaUserId: 'mu_7c3e0a11', licenseId: 'l2', companyId: 'c2', companyName: 'LogiCorp SA',
    appVersion: '1.1.0',
    deviceModel: 'Meta Quest 2',
    osVersion: 'Android 10 (API 29)',
    platform: 'quest2',
    lastSeenAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    firstSeenAt: new Date('2026-02-10'),
  },
  {
    id: 'ua3', metaUserId: 'mu_b82d5f44', licenseId: 'l2', companyId: 'c2', companyName: 'LogiCorp SA',
    appVersion: '1.2.0',
    deviceModel: 'Meta Quest 3',
    osVersion: 'Android 12 (API 32)',
    platform: 'quest3',
    lastSeenAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    firstSeenAt: new Date('2026-02-12'),
  },
  {
    id: 'ua4', metaUserId: 'mu_d90c1e77', licenseId: 'l3', companyId: 'c3', companyName: 'MineraX',
    appVersion: '1.0.0',
    deviceModel: 'Meta Quest 2',
    osVersion: 'Android 10 (API 29)',
    platform: 'quest2',
    lastSeenAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    firstSeenAt: new Date('2026-01-22'),
  },
]

export const mockEvents = [
  { id: 'e1', licenseCode: 'XPL-ACERIA-001', companyId: 'c1', companyName: 'Acería del Sur', metaUserId: 'mu_4a1f9b2c', moduleId: 'derrame_combustible', allowed: true, reason: null, createdAt: new Date(Date.now() - 8 * 60 * 1000) },
  { id: 'e2', licenseCode: 'XPL-LOGI-001', companyId: 'c2', companyName: 'LogiCorp SA', metaUserId: 'mu_7c3e0a11', moduleId: 'recorrido_obra', allowed: true, reason: null, createdAt: new Date(Date.now() - 35 * 60 * 1000) },
  { id: 'e3', licenseCode: 'XPL-MINERA-001', companyId: 'c3', companyName: 'MineraX', metaUserId: 'mu_d90c1e77', moduleId: 'derrame_combustible', allowed: false, reason: 'Licencia bloqueada por Xplash', createdAt: new Date(Date.now() - 70 * 60 * 1000) },
  { id: 'e4', licenseCode: 'XPL-TECH-001', companyId: 'c4', companyName: 'TechPetrol', metaUserId: 'mu_f21a8c03', moduleId: 'riesgo_electrico', allowed: false, reason: 'Licencia vencida', createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  { id: 'e5', licenseCode: 'XPL-ACERIA-001', companyId: 'c1', companyName: 'Acería del Sur', metaUserId: 'mu_4a1f9b2c', moduleId: 'riesgo_electrico', allowed: true, reason: null, createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000) },
]

// Historial de contratos por empresa — base para seguimiento comercial
export const mockContracts = [
  { id: 'ct1', companyId: 'c1', companyName: 'Acería del Sur', plan: '3m_1_usuario', maxUsers: 1, startDate: '2025-08-01', endDate: '2025-11-01', notes: 'Contrato inicial.', createdAt: '2025-07-28' },
  { id: 'ct2', companyId: 'c1', companyName: 'Acería del Sur', plan: '3m_1_usuario', maxUsers: 1, startDate: '2025-11-01', endDate: '2026-02-01', notes: 'Primera renovación.', createdAt: '2025-10-27' },
  { id: 'ct3', companyId: 'c1', companyName: 'Acería del Sur', plan: '6m_1_usuario', maxUsers: 1, startDate: '2026-02-01', endDate: '2026-08-01', notes: 'Segunda renovación — subió a plan 6 meses.', createdAt: '2026-01-28' },
  { id: 'ct4', companyId: 'c2', companyName: 'LogiCorp SA', plan: '6m_3_usuarios', maxUsers: 3, startDate: '2026-02-01', endDate: '2026-08-01', notes: 'Contrato inicial.', createdAt: '2026-01-30' },
  { id: 'ct5', companyId: 'c3', companyName: 'MineraX', plan: '3m_2_usuarios', maxUsers: 2, startDate: '2026-01-01', endDate: '2026-07-30', notes: 'Pago pendiente. Licencia bloqueada.', createdAt: '2025-12-28' },
  { id: 'ct6', companyId: 'c4', companyName: 'TechPetrol', plan: '3m_1_usuario', maxUsers: 1, startDate: '2026-04-14', endDate: '2026-07-14', notes: '', createdAt: '2026-04-10' },
]

// Usuarios del panel de administración
export const mockAdminUsers = [
  { id: 'u0', email: 'davyt@gmail.com',               displayName: 'David (dev)',        role: 'admin',     status: 'active',  createdAt: '2026-01-01' },
  { id: 'u1', email: 'marta@martajara.com',            displayName: 'Marta Jara',         role: 'admin',     status: 'pending', createdAt: '2026-07-21' },
  { id: 'u2', email: 'mariaelena.ragazzi@gmail.com',  displayName: 'María Elena Ragazzi', role: 'admin',     status: 'pending', createdAt: '2026-07-21' },
  { id: 'u3', email: 'apariciodebali@gmail.com',       displayName: 'Aparicio De Bali',   role: 'marketing', status: 'pending', createdAt: '2026-07-21' },
  { id: 'u4', email: 'amalianavarrete@gmail.com',      displayName: 'Amalia Navarrete',   role: 'marketing', status: 'pending', createdAt: '2026-07-21' },
]

export const MODULES = [
  { id: 'derrame_combustible', label: 'Derrame de combustible' },
  { id: 'riesgo_electrico',   label: 'Riesgo eléctrico' },
  { id: 'recorrido_obra',     label: 'Recorrido de obra' },
  { id: 'trabajo_en_altura',  label: 'Trabajo en altura' },
]

export const PLANS = [
  { value: '1m_1_usuario',    label: '1 mes · 1 usuario',      durationMonths: 1,  defaultMaxUsers: 1 },
  { value: '3m_1_usuario',    label: '3 meses · 1 usuario',    durationMonths: 3,  defaultMaxUsers: 1 },
  { value: '3m_2_usuarios',   label: '3 meses · 2 usuarios',   durationMonths: 3,  defaultMaxUsers: 2 },
  { value: '6m_1_usuario',    label: '6 meses · 1 usuario',    durationMonths: 6,  defaultMaxUsers: 1 },
  { value: '6m_3_usuarios',   label: '6 meses · 3 usuarios',   durationMonths: 6,  defaultMaxUsers: 3 },
  { value: '12m_5_usuarios',  label: '12 meses · 5 usuarios',  durationMonths: 12, defaultMaxUsers: 5 },
  { value: 'custom',          label: 'Personalizado',           durationMonths: null, defaultMaxUsers: null },
]

export const DEFAULT_GRACE_HOURS = 48

export const STATUS_LABELS = {
  active:  { label: 'Activa',    color: 'success' },
  blocked: { label: 'Bloqueada', color: 'error' },
  expired: { label: 'Vencida',   color: 'warning' },
  paused:  { label: 'Pausada',   color: 'default' },
  draft:   { label: 'Borrador',  color: 'processing' },
}
