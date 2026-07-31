export const mockCompanies = [
  { id: 'c1', name: 'Acería del Sur',  email: 'contacto@aceria.com',   contactName: 'Hernán Villalba',  contactPhone: '+54 11 4231-0001',  status: 'active', notes: 'Cliente piloto. Contrato anual firmado.', createdAt: '2026-01-15' },
  { id: 'c2', name: 'LogiCorp SA',     email: 'logi@logicorp.com',     contactName: 'Sandra Ruiz',      contactPhone: '+54 351 422-0099', status: 'active', notes: '', createdAt: '2026-02-01' },
  { id: 'c3', name: 'MineraX',         email: 'minera@minerax.com',    contactName: 'Jorge Peña',       contactPhone: '',                  status: 'paused', notes: 'Pago pendiente de febrero.', createdAt: '2026-01-20' },
  { id: 'c4', name: 'TechPetrol',      email: 'tech@techpetrol.com',   contactName: 'Lucía Ferreyra',  contactPhone: '+54 11 5800-4422',  status: 'active', notes: '', createdAt: '2026-03-10' },
]

// Usuarios VR (colección 'users') — reemplaza userAccess como fuente operativa
export const mockUsers = [
  { id: 'JL_Sost360',      metaUsername: 'JL_Sost360',      metaUserId: null,      name: 'JL Sost360',       email: 'larsenjeronimo@sostenibilidad360.org', companyId: null, status: 'active', isGlobal: true,  createdAt: '2026-07-30', lastSeenAt: null },
  { id: 'Xplashargentina', metaUsername: 'Xplashargentina', metaUserId: null,      name: 'Xplash Argentina', email: 'xplashargentina@gmail.com',            companyId: null, status: 'active', isGlobal: true,  createdAt: '2026-07-30', lastSeenAt: null },
  { id: 'XplashDev',       metaUsername: 'XplashDev',       metaUserId: '7654321', name: 'Xplash Dev',       email: 'elapa21@gmail.com',                    companyId: null, status: 'active', isGlobal: true,  createdAt: '2026-07-30', lastSeenAt: new Date(Date.now() - 30 * 60 * 1000) },
  { id: 'marta.jara',      metaUsername: 'marta.jara',      metaUserId: null,      name: 'Marta Jara',       email: 'm.jaraotero@gmail.com',                companyId: null, status: 'active', isGlobal: true,  createdAt: '2026-07-30', lastSeenAt: null },
  { id: 'Xplash',          metaUsername: 'Xplash',          metaUserId: null,      name: 'Xplash Training',  email: 'xplashtraining@gmail.com',             companyId: null, status: 'active', isGlobal: true,  createdAt: '2026-07-30', lastSeenAt: null },
  { id: 'AceriaOp1',       metaUsername: 'AceriaOp1',       metaUserId: 'mu_4a1f', name: 'Operario Acería',  email: 'op1@aceria.com',                       companyId: 'c1', status: 'active', isGlobal: false, createdAt: '2026-02-05', lastSeenAt: new Date(Date.now() - 5 * 60 * 1000) },
  { id: 'LogiUser1',       metaUsername: 'LogiUser1',       metaUserId: 'mu_7c3e', name: 'Usuario LogiCorp', email: 'user@logicorp.com',                    companyId: 'c2', status: 'active', isGlobal: false, createdAt: '2026-02-10', lastSeenAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
]

export const mockLicenses = [
  {
    id: 'l_test', licenseCode: 'XPL-TEST-001', moduleId: 'XPL-DC',
    companyId: null, companyName: null,
    status: 'active', plan: 'test', offlineGraceHours: 48,
    userIds: ['JL_Sost360', 'Xplashargentina', 'XplashDev', 'marta.jara', 'Xplash'],
    startDate: '2026-01-01', expiresAt: '2027-01-01', notes: 'Licencia de testing — no eliminar',
  },
  {
    id: 'l1', licenseCode: 'XPL-DC', moduleId: 'XPL-DC',
    companyId: 'c1', companyName: 'Acería del Sur',
    status: 'active', plan: '6m_1_usuario', offlineGraceHours: 48,
    userIds: ['AceriaOp1'],
    startDate: '2026-02-01', expiresAt: '2026-08-01', notes: 'Renovar en agosto.',
  },
  {
    id: 'l2', licenseCode: 'XPL-OBR', moduleId: 'XPL-OBR',
    companyId: 'c2', companyName: 'LogiCorp SA',
    status: 'active', plan: '6m_3_usuarios', offlineGraceHours: 48,
    userIds: ['LogiUser1'],
    startDate: '2026-02-01', expiresAt: '2026-07-15', notes: '',
  },
  {
    id: 'l3', licenseCode: 'XPL-DC', moduleId: 'XPL-DC',
    companyId: 'c3', companyName: 'MineraX',
    status: 'blocked', plan: '3m_2_usuarios', offlineGraceHours: 24,
    userIds: [],
    startDate: '2026-01-01', expiresAt: '2026-07-30', notes: 'Bloqueada por falta de pago.',
  },
]

export const mockEvents = [
  { id: 'e1', licenseCode: 'XPL-DC',       moduleId: 'XPL-DC',  metaUserId: 'mu_4a1f', metaUsername: 'AceriaOp1',   userId: 'AceriaOp1',  allowed: true,  reason: null,                    createdAt: new Date(Date.now() - 8 * 60 * 1000) },
  { id: 'e2', licenseCode: 'XPL-OBR',      moduleId: 'XPL-OBR', metaUserId: 'mu_7c3e', metaUsername: 'LogiUser1',   userId: 'LogiUser1',  allowed: true,  reason: null,                    createdAt: new Date(Date.now() - 35 * 60 * 1000) },
  { id: 'e3', licenseCode: 'XPL-DC',       moduleId: 'XPL-DC',  metaUserId: 'mu_xxx',  metaUsername: 'Desconocido', userId: null,         allowed: false, reason: 'Usuario no autorizado', createdAt: new Date(Date.now() - 70 * 60 * 1000) },
  { id: 'e4', licenseCode: 'XPL-TEST-001', moduleId: 'XPL-DC',  metaUserId: '7654321', metaUsername: 'XplashDev',   userId: 'XplashDev',  allowed: true,  reason: null,                    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { id: 'e5', licenseCode: 'XPL-EBT',      moduleId: 'XPL-EBT', metaUserId: 'mu_zzzz', metaUsername: 'TechUser1',   userId: null,         allowed: false, reason: 'Sin licencia activa',   createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
]

export const mockContracts = [
  { id: 'ct1', companyId: 'c1', companyName: 'Acería del Sur', plan: '3m_1_usuario', startDate: '2025-08-01', endDate: '2025-11-01', notes: 'Contrato inicial.', createdAt: '2025-07-28' },
  { id: 'ct2', companyId: 'c1', companyName: 'Acería del Sur', plan: '3m_1_usuario', startDate: '2025-11-01', endDate: '2026-02-01', notes: 'Primera renovación.', createdAt: '2025-10-27' },
  { id: 'ct3', companyId: 'c1', companyName: 'Acería del Sur', plan: '6m_1_usuario', startDate: '2026-02-01', endDate: '2026-08-01', notes: 'Segunda renovación — subió a plan 6 meses.', createdAt: '2026-01-28' },
  { id: 'ct4', companyId: 'c2', companyName: 'LogiCorp SA',    plan: '6m_3_usuarios', startDate: '2026-02-01', endDate: '2026-08-01', notes: 'Contrato inicial.', createdAt: '2026-01-30' },
  { id: 'ct5', companyId: 'c3', companyName: 'MineraX',        plan: '3m_2_usuarios', startDate: '2026-01-01', endDate: '2026-07-30', notes: 'Pago pendiente. Licencia bloqueada.', createdAt: '2025-12-28' },
]

export const mockAdminUsers = [
  { id: 'u0', email: 'davyt@gmail.com',              displayName: 'Davyt',              role: 'admin',     status: 'active',  createdAt: '2026-01-01' },
  { id: 'u1', email: 'marta@martajara.com',           displayName: 'Marta Jara',         role: 'admin',     status: 'pending', createdAt: '2026-07-21' },
  { id: 'u2', email: 'mariaelena.ragazzi@gmail.com', displayName: 'María Elena Ragazzi', role: 'admin',     status: 'pending', createdAt: '2026-07-21' },
  { id: 'u3', email: 'apariciodebali@gmail.com',      displayName: 'Aparicio De Bali',   role: 'admin',     status: 'pending', createdAt: '2026-07-21' },
  { id: 'u4', email: 'amalianavarrete@gmail.com',     displayName: 'Amalia Navarrete',   role: 'admin',     status: 'pending', createdAt: '2026-07-21' },
  { id: 'u7', email: 'comercial@xplash.org',          displayName: 'Demo Comercial',     role: 'marketing', status: 'active',  createdAt: '2026-07-21' },
]

export const MODULES = [
  { id: 'XPL-DC',  licenseCode: 'XPL-DC',  label: 'Derrame de combustible',           status: 'active' },
  { id: 'XPL-DCA', licenseCode: 'XPL-DCA', label: 'Descarga de Combustible',          status: 'active' },
  { id: 'XPL-EX',  licenseCode: 'XPL-EX',  label: 'Manejo de Extintores',             status: 'active' },
  { id: 'XPL-EXH', licenseCode: 'XPL-EXH', label: 'Manejo de Extintores: Hospitales', status: 'active' },
  { id: 'XPL-EST', licenseCode: 'XPL-EST', label: 'Recorrido de Estación',            status: 'active' },
  { id: 'XPL-OBR', licenseCode: 'XPL-OBR', label: 'Recorrido de Obra',                status: 'active' },
  { id: 'XPL-EBT', licenseCode: 'XPL-EBT', label: 'Riesgo Eléctrico BT',              status: 'active' },
]

export const PLANS = [
  { value: '1m',     label: '1 mes',     durationMonths: 1    },
  { value: '3m',     label: '3 meses',   durationMonths: 3    },
  { value: '6m',     label: '6 meses',   durationMonths: 6    },
  { value: '12m',    label: '12 meses',  durationMonths: 12   },
  { value: 'custom', label: 'Personalizado', durationMonths: null },
]

export const DEFAULT_GRACE_HOURS = 48

export const STATUS_LABELS = {
  active:  { label: 'Activa',    color: 'success' },
  blocked: { label: 'Bloqueada', color: 'error' },
  expired: { label: 'Vencida',   color: 'warning' },
  paused:  { label: 'Pausada',   color: 'default' },
  draft:   { label: 'Borrador',  color: 'processing' },
}
