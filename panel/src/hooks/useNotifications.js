import { useMemo } from 'react'
import { where, orderBy, limit } from 'firebase/firestore'
import { useCollection } from './useCollection'

const WARNING_DAYS = 7
const MS_PER_DAY   = 1000 * 60 * 60 * 24
const WINDOW_48H   = 48 * 60 * 60 * 1000

function toDate(v) {
  return v?.toDate ? v.toDate() : v ? new Date(v) : null
}

function deniedSeverity(reason = '') {
  if (reason.includes('Límite') || reason.includes('no encontrada') || reason.includes('vencida')) return 'warning'
  return 'info'
}

export function useNotifications(role = 'admin') {
  const [licenses]     = useCollection('licenses')
  const [companies]    = useCollection('companies')
  const [recentEvents] = useCollection('events', [
    where('createdAt', '>=', new Date(Date.now() - WINDOW_48H)),
    orderBy('createdAt', 'desc'),
    limit(200),
  ])

  return useMemo(() => {
    const today   = new Date()
    const dateStr = today.toISOString().slice(0, 10)
    const items   = []

    // — Licencias vencidas o próximas a vencer
    for (const lic of licenses) {
      if (!lic.expiresAt || lic.status === 'draft') continue
      const expires  = toDate(lic.expiresAt)
      const diffDays = Math.ceil((expires - today) / MS_PER_DAY)

      if (diffDays < 0) {
        const ago = Math.abs(diffDays)
        items.push({
          id:       `expired_${lic.id}`,
          type:     'license_expired',
          severity: 'critical',
          title:    'Licencia vencida',
          desc:     lic.licenseCode,
          detail:   `Venció hace ${ago} día${ago !== 1 ? 's' : ''}`,
          link:     '/licencias',
        })
      } else if (diffDays <= WARNING_DAYS) {
        items.push({
          id:       `expiring_${lic.id}`,
          type:     'license_expiring',
          severity: 'warning',
          title:    'Próxima a vencer',
          desc:     lic.licenseCode,
          detail:   `Vence en ${diffDays} día${diffDays !== 1 ? 's' : ''}`,
          link:     '/licencias',
        })
      }
    }

    // — Empresas suspendidas (solo admin)
    if (role === 'admin') {
      for (const co of companies) {
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
    }

    // — Accesos denegados en las últimas 48h, agrupados por licenseCode
    // ID incluye fecha para que se renueve al día siguiente si se descarta
    const deniedGroups = {}
    for (const ev of recentEvents) {
      if (ev.allowed !== false) continue
      const key = ev.licenseCode || 'desconocido'
      if (!deniedGroups[key]) deniedGroups[key] = { licenseCode: ev.licenseCode, reasons: {} }
      const r = ev.reason || 'Acceso denegado'
      deniedGroups[key].reasons[r] = (deniedGroups[key].reasons[r] || 0) + 1
    }

    for (const [key, data] of Object.entries(deniedGroups)) {
      const total     = Object.values(data.reasons).reduce((s, n) => s + n, 0)
      const [topReason] = Object.entries(data.reasons).sort((a, b) => b[1] - a[1])[0]
      items.push({
        id:       `denied_${key}_${dateStr}`,
        type:     'access_denied',
        severity: deniedSeverity(topReason),
        title:    'Acceso denegado',
        desc:     data.licenseCode || key,
        detail:   `${total} intento${total !== 1 ? 's' : ''} en 48h · ${topReason}`,
        link:     '/eventos',
      })
    }

    const order = { critical: 0, warning: 1, info: 2 }
    return items.sort((a, b) => order[a.severity] - order[b.severity])
  }, [licenses, companies, recentEvents, role])
}
