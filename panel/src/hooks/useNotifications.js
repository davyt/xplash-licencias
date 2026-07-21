import { useMemo } from 'react'
import { mockLicenses, mockCompanies, mockUserAccess, mockAdminUsers } from '../mock/data'

const WARNING_DAYS = 7
const MS_PER_DAY   = 1000 * 60 * 60 * 24

export function useNotifications(role = 'admin') {
  return useMemo(() => {
    const today = new Date()
    const items  = []

    for (const lic of mockLicenses) {
      if (!lic.expiresAt || lic.status === 'draft') continue

      const expires  = new Date(lic.expiresAt)
      const diffDays = Math.ceil((expires - today) / MS_PER_DAY)

      if (diffDays < 0) {
        const ago = Math.abs(diffDays)
        items.push({
          id:       `expired_${lic.id}`,
          type:     'license_expired',
          severity: 'critical',
          title:    'Licencia vencida',
          desc:     `${lic.licenseCode} · ${lic.companyName}`,
          detail:   `Venció hace ${ago} día${ago !== 1 ? 's' : ''}`,
          link:     '/licencias',
        })
      } else if (diffDays <= WARNING_DAYS) {
        items.push({
          id:       `expiring_${lic.id}`,
          type:     'license_expiring',
          severity: 'warning',
          title:    'Próxima a vencer',
          desc:     `${lic.licenseCode} · ${lic.companyName}`,
          detail:   `Vence en ${diffDays} día${diffDays !== 1 ? 's' : ''}`,
          link:     '/licencias',
        })
      }

      const registered = mockUserAccess.filter(ua => ua.licenseId === lic.id).length
      if (lic.maxUsers > 0 && registered >= lic.maxUsers) {
        items.push({
          id:       `limit_${lic.id}`,
          type:     'user_limit',
          severity: 'warning',
          title:    'Límite de usuarios alcanzado',
          desc:     `${lic.licenseCode} · ${lic.companyName}`,
          detail:   `${registered}/${lic.maxUsers} usuario${lic.maxUsers !== 1 ? 's' : ''}`,
          link:     '/accesos',
        })
      }
    }

    if (role === 'admin') {
      for (const co of mockCompanies) {
        if (co.status === 'paused') {
          items.push({
            id:       `company_${co.id}`,
            type:     'company_suspended',
            severity: 'critical',
            title:    'Empresa suspendida',
            desc:     co.name,
            detail:   co.notes || 'Estado: Suspendida',
            link:     '/empresas',
          })
        }
      }

      const pending = mockAdminUsers.filter(u => u.status === 'pending').length
      if (pending > 0) {
        items.push({
          id:       'team_pending',
          type:     'team_invite',
          severity: 'info',
          title:    'Invitaciones pendientes',
          desc:     `${pending} usuario${pending !== 1 ? 's' : ''} sin activar`,
          detail:   'Requieren acceso en Firebase Auth',
          link:     '/equipo',
        })
      }
    }

    const order = { critical: 0, warning: 1, info: 2 }
    return items.sort((a, b) => order[a.severity] - order[b.severity])
  }, [role])
}
