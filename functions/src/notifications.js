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

function emailHtml({ title, body, licenseCode, company, expiresAt }) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
      <img src="https://licencias.xplash.org/xplash_logo.svg" height="36"
           style="margin-bottom:24px;filter:brightness(0)" alt="Xplash"/>
      <h2 style="color:#1a1a1a;margin:0 0 8px">${title}</h2>
      <p style="color:#555;margin:0 0 24px">${body}</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-weight:600;width:140px">Licencia</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee"><code>${licenseCode}</code></td>
        </tr>
        ${company ? `
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-weight:600">Empresa</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${company}</td>
        </tr>` : ''}
        ${expiresAt ? `
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-weight:600">Vencimiento</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${formatDate(expiresAt)}</td>
        </tr>` : ''}
      </table>
      <p style="color:#999;font-size:12px;margin-top:32px">
        Gestioná esta licencia desde
        <a href="https://licencias.xplash.org" style="color:#2563EB">licencias.xplash.org</a>
      </p>
    </div>
  `
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
              title:       'Licencia vencida',
              body:        'La siguiente licencia llegó a su fecha de vencimiento. El acceso fue bloqueado automáticamente.',
              licenseCode: lic.licenseCode,
              company:     lic.companyName || lic.companyId || null,
              expiresAt:   exp,
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
              title:       `Licencia vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`,
              body:        'La siguiente licencia está próxima a su fecha de vencimiento. Renovarla desde el panel evita interrupciones de acceso.',
              licenseCode: lic.licenseCode,
              company:     lic.companyName || lic.companyId || null,
              expiresAt:   exp,
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
