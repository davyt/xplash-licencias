const functions  = require('firebase-functions/v1')
const { db }     = require('./admin')
const { Resend } = require('resend')

const FROM   = 'licencias@xplash.org'
const REGION = 'southamerica-east1'

// ─── helpers ───────────────────────────────────────────────────────────────

async function getGlobalSettings() {
  const snap = await db.collection('settings').doc('global').get()
  return snap.exists ? snap.data() : {}
}

async function getNotifConfig() {
  const settings = await getGlobalSettings()
  return settings.notifications || {}
}

async function getResendKey() {
  const settings = await getGlobalSettings()
  return settings.resendApiKey || null
}

function parseEmails(str) {
  return (str || '').split(',').map(e => e.trim()).filter(Boolean)
}

function toDate(v) {
  return v?.toDate ? v.toDate() : v ? new Date(v) : null
}

function formatDate(d) {
  return d
    ? new Intl.DateTimeFormat('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
    : '—'
}

async function sendEmail(resend, { to, subject, html }) {
  if (!to.length) return
  await resend.emails.send({ from: FROM, to, subject, html })
}

function badgeStyle(title) {
  if (/bloqueada/i.test(title))        return 'background:#FEE2E2;color:#991B1B'
  if (/vencida/i.test(title))          return 'background:#FEF3C7;color:#92400E'
  if (/próxima|proxima/i.test(title))  return 'background:#DBEAFE;color:#1E40AF'
  return 'background:#F3F4F6;color:#374151'
}

function emailHtml({ title, body, licenseCode, company, expiresAt, showPanelButton = false }) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

        <!-- Header -->
        <tr>
          <td style="background:#ffffff;border-radius:12px 12px 0 0;padding:24px 32px;border-bottom:3px solid #111827;border-left:1px solid #E5E7EB;border-right:1px solid #E5E7EB;border-top:1px solid #E5E7EB">
            <img src="https://licencias.xplash.org/xplash_logo.svg" height="52"
                 style="display:block" alt="Xplash"/>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px 32px 24px;border-left:1px solid #E5E7EB;border-right:1px solid #E5E7EB">
            <span style="display:inline-block;font-size:12px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;padding:4px 10px;border-radius:20px;margin-bottom:20px;${badgeStyle(title)}">${title}</span>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151">${body}</p>

            <!-- Datos licencia -->
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;font-size:14px">
              <tr>
                <td style="padding:11px 16px;background:#F9FAFB;color:#6B7280;font-weight:600;width:130px;border-bottom:1px solid #E5E7EB;white-space:nowrap">Licencia</td>
                <td style="padding:11px 16px;color:#111827;border-bottom:1px solid #E5E7EB;font-family:monospace;font-size:13px">${licenseCode}</td>
              </tr>
              ${company ? `<tr>
                <td style="padding:11px 16px;background:#F9FAFB;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB">Empresa</td>
                <td style="padding:11px 16px;color:#111827;border-bottom:1px solid #E5E7EB">${company}</td>
              </tr>` : ''}
              ${expiresAt ? `<tr>
                <td style="padding:11px 16px;background:#F9FAFB;color:#6B7280;font-weight:600">Vencimiento</td>
                <td style="padding:11px 16px;color:#111827">${formatDate(expiresAt)}</td>
              </tr>` : ''}
            </table>

            ${showPanelButton ? `
            <div style="margin-top:24px;text-align:center">
              <a href="https://licencias.xplash.org"
                 style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;letter-spacing:.2px">
                Ver en el panel →
              </a>
            </div>` : ''}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center">
            <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.5">
              Este mensaje fue generado automáticamente por el sistema de licencias VR de Xplash.<br>
              <a href="https://licencias.xplash.org" style="color:#6B7280;text-decoration:underline">licencias.xplash.org</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body></html>`
}

// ─── tarea diaria ──────────────────────────────────────────────────────────
// Corre a las 12:00 UYT (15:00 UTC) todos los días.
// 1. Marca como 'expired' las licencias activas ya vencidas.
// 2. Envía emails de aviso (nearExpiry y expired) si están habilitados.

exports.checkLicensesJob = functions
  .region(REGION)
  .pubsub.schedule('0 15 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const [notif, snap, apiKey] = await Promise.all([
      getNotifConfig(),
      db.collection('licenses').get(),
      getResendKey(),
    ])

    if (!apiKey) { console.warn('checkLicensesJob: resendApiKey no configurada'); return null }
    const resend  = new Resend(apiKey)
    const now     = new Date()
    const updates = []
    const emails  = []

    for (const licDoc of snap.docs) {
      const lic = licDoc.data()
      if (!lic.expiresAt) continue
      const exp = toDate(lic.expiresAt)

      // Licencia vencida pero aún marcada como active
      if (lic.status === 'active' && exp < now) {
        updates.push(licDoc.ref.update({ status: 'expired', expiredNotifiedAt: now }))

        if (notif.expired?.enabled && !lic.expiredNotifiedAt) {
          const to = parseEmails(notif.expired.emails)
          emails.push(sendEmail(resend, {
            to,
            subject: `Licencia vencida: ${lic.licenseCode}`,
            html: emailHtml({
              title:           'Licencia vencida',
              body:            'La siguiente licencia llegó a su fecha de vencimiento. El acceso fue bloqueado automáticamente.',
              licenseCode:     lic.licenseCode,
              company:         lic.companyName || lic.companyId || null,
              expiresAt:       exp,
              showPanelButton: true,
            }),
          }))
        }
        continue
      }

      // Licencia activa próxima a vencer
      if (lic.status === 'active' && exp > now) {
        const daysLeft    = Math.ceil((exp - now) / 86_400_000)
        const threshold   = notif.nearExpiry?.daysBeforeExpiry ?? 3
        const alreadySent = lic.nearExpiryNotifiedAt
          ? (now - toDate(lic.nearExpiryNotifiedAt)) < 86_400_000 * (threshold + 1)
          : false

        if (daysLeft <= threshold && notif.nearExpiry?.enabled && !alreadySent) {
          updates.push(licDoc.ref.update({ nearExpiryNotifiedAt: now }))
          const to = parseEmails(notif.nearExpiry.emails)
          emails.push(sendEmail(resend, {
            to,
            subject: `Licencia próxima a vencer: ${lic.licenseCode} (${daysLeft} día${daysLeft === 1 ? '' : 's'})`,
            html: emailHtml({
              title:           `Licencia vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`,
              body:            'La siguiente licencia está próxima a su fecha de vencimiento. Renovarla desde el panel evita interrupciones de acceso.',
              licenseCode:     lic.licenseCode,
              company:         lic.companyName || lic.companyId || null,
              expiresAt:       exp,
              showPanelButton: true,
            }),
          }))
        }
      }
    }

    await Promise.allSettled([...updates, ...emails])
    console.log(`checkLicensesJob: ${updates.length} actualizaciones, ${emails.length} emails`)
    return null
  })

// ─── trigger: licencia bloqueada ───────────────────────────────────────────
// Dispara cuando el campo status cambia a 'blocked'.

exports.onLicenseBlocked = functions
  .region(REGION)
  .firestore.document('licenses/{licenseId}')
  .onUpdate(async (change) => {
    const before = change.before.data()
    const after  = change.after.data()

    if (before.status === 'blocked' || after.status !== 'blocked') return null

    const [notif, apiKey] = await Promise.all([getNotifConfig(), getResendKey()])
    if (!notif.blocked?.enabled) return null
    if (!apiKey) { console.warn('onLicenseBlocked: resendApiKey no configurada'); return null }

    const to = parseEmails(notif.blocked.emails)
    if (!to.length) return null

    const resend = new Resend(apiKey)
    const exp    = toDate(after.expiresAt)

    await sendEmail(resend, {
      to,
      subject: `Licencia bloqueada: ${after.licenseCode}`,
      html: emailHtml({
        title:       'Licencia bloqueada manualmente',
        body:        'La siguiente licencia fue bloqueada desde el panel. Los visores recibirán acceso denegado en su próxima validación online.',
        licenseCode: after.licenseCode,
        company:     after.companyName || after.companyId || null,
        expiresAt:   exp,
      }),
    })

    return null
  })
