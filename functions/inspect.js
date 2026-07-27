#!/usr/bin/env node
/**
 * inspect.js — diagnóstico y monitoreo de xplash-licencias
 *
 * Uso:
 *   node inspect.js                        → resumen general
 *   node inspect.js codigos                → todos los códigos de activación
 *   node inspect.js codigos XPL-TEST-001   → códigos de una licencia
 *   node inspect.js licencias              → todas las licencias
 *   node inspect.js accesos                → todos los userAccess
 *   node inspect.js accesos XPL-TEST-001   → accesos de una licencia
 *   node inspect.js eventos [N]            → últimos N eventos (default 20)
 *   node inspect.js validar A7K4P2         → validar un código específico
 */

const admin = require('firebase-admin')
const serviceAccount = require('./serviceAccountKey.json')

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

// ── colores ANSI ──────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  magenta:'\x1b[35m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
}
const bold   = s => `${c.bold}${s}${c.reset}`
const dim    = s => `${c.dim}${s}${c.reset}`
const green  = s => `${c.green}${s}${c.reset}`
const red    = s => `${c.red}${s}${c.reset}`
const yellow = s => `${c.yellow}${s}${c.reset}`
const blue   = s => `${c.blue}${s}${c.reset}`
const cyan   = s => `${c.cyan}${s}${c.reset}`
const magenta= s => `${c.magenta}${s}${c.reset}`

function header(title) {
  console.log(`\n${bold(cyan('━━━ ' + title + ' '))}\n`)
}

function fmtDate(v) {
  if (!v) return dim('—')
  const d = v?.toDate ? v.toDate() : new Date(v)
  return d.toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' })
}

function statusCode(s) {
  if (s === 'pending')   return yellow('pendiente')
  if (s === 'activated') return green('activado ')
  if (s === 'blocked')   return red('bloqueado')
  return dim(s || '—')
}

function statusLic(s) {
  if (s === 'active')  return green('activa  ')
  if (s === 'blocked') return red('bloqueada')
  if (s === 'paused')  return yellow('pausada ')
  if (s === 'expired') return red('vencida ')
  if (s === 'draft')   return dim('borrador')
  return dim(s || '—')
}

function statusAccess(s) {
  return s === 'blocked' ? red('bloqueado') : green('activo   ')
}

function pad(s, n) {
  const str = String(s ?? '—')
  return str.length >= n ? str.slice(0, n) : str + ' '.repeat(n - str.length)
}

// ── comandos ──────────────────────────────────────────────────

async function resumen() {
  header('Resumen del sistema')

  const [lics, codes, access, events, companies] = await Promise.all([
    db.collection('licenses').get(),
    db.collection('activationCodes').get(),
    db.collection('userAccess').get(),
    db.collection('events').orderBy('createdAt', 'desc').limit(5).get(),
    db.collection('companies').get(),
  ])

  const licDocs   = lics.docs.map(d => ({ id: d.id, ...d.data() }))
  const codeDocs  = codes.docs.map(d => ({ id: d.id, ...d.data() }))
  const accDocs   = access.docs.map(d => ({ id: d.id, ...d.data() }))

  const licByStatus = licDocs.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc }, {})
  const codeByStatus = codeDocs.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc }, {})

  console.log(`  Empresas     ${bold(companies.size)}`)
  console.log(`  Licencias    ${bold(lics.size)}  ${dim('(')}${Object.entries(licByStatus).map(([k,v]) => `${statusLic(k).trim()}: ${v}`).join(dim(' · '))}${dim(')')}`)
  console.log(`  Act. codes   ${bold(codes.size)}  ${dim('(')}${Object.entries(codeByStatus).map(([k,v]) => `${statusCode(k).trim()}: ${v}`).join(dim(' · '))}${dim(')')}`)
  console.log(`  UserAccess   ${bold(access.size)}  ${dim('(activos: ')}${accDocs.filter(a => a.status !== 'blocked').length}${dim(', bloqueados: ')}${accDocs.filter(a => a.status === 'blocked').length}${dim(')')}`)
  console.log(`  Eventos      ${bold(events.size === 5 ? '5+' : events.size)}  ${dim('(últimos 5 abajo)')}`)

  if (!events.empty) {
    console.log(`\n  ${dim('── Últimos eventos ──────────────────────────────────')}`)
    events.docs.forEach(d => {
      const e = d.data()
      const ok = e.allowed ? green('✔ OK    ') : red('✕ DENY  ')
      console.log(`  ${ok} ${dim(fmtDate(e.createdAt))}  ${pad(e.licenseCode, 16)}  ${dim(e.moduleId || '—')}`)
    })
  }
}

async function codigos(licenseCode) {
  header(`Códigos de activación${licenseCode ? ` — ${licenseCode}` : ''}`)

  let query = db.collection('activationCodes')
  if (licenseCode) query = query.where('licenseCode', '==', licenseCode)
  const snap = await query.get()

  if (snap.empty) {
    console.log(red('  Sin códigos encontrados.'))
    return
  }

  console.log(`  ${bold(pad('Código', 8))}  ${bold(pad('Estado',10))}  ${bold(pad('Nombre',20))}  ${bold(pad('Email',28))}  ${bold('Meta User ID')}`)
  console.log(`  ${dim('─'.repeat(95))}`)

  snap.docs
    .sort((a, b) => (a.data().status === 'activated' ? -1 : 1))
    .forEach(d => {
      const code = d.id
      const data = d.data()
      console.log(
        `  ${bold(cyan(pad(code, 8)))}  ${statusCode(data.status)}  ${pad(data.name || '—', 20)}  ${pad(data.email || '—', 28)}  ${data.metaUserId ? dim(data.metaUserId) : dim('—')}`
      )
      if (data.activatedAt) {
        console.log(`  ${dim(' '.repeat(8))}  ${dim('activado: ' + fmtDate(data.activatedAt))}`)
      }
    })

  const pending   = snap.docs.filter(d => d.data().status === 'pending').length
  const activated = snap.docs.filter(d => d.data().status === 'activated').length
  const blocked   = snap.docs.filter(d => d.data().status === 'blocked').length
  console.log(`\n  Total: ${bold(snap.size)}  ${yellow(`pendiente: ${pending}`)}  ${green(`activado: ${activated}`)}  ${red(`bloqueado: ${blocked}`)}`)
}

async function licencias() {
  header('Licencias')

  const [lics, access] = await Promise.all([
    db.collection('licenses').get(),
    db.collection('userAccess').get(),
  ])

  const countByLic = {}
  access.docs.forEach(d => {
    const lid = d.data().licenseId
    if (lid) countByLic[lid] = (countByLic[lid] || 0) + 1
  })

  console.log(`  ${bold(pad('Código',18))}  ${bold(pad('Estado',10))}  ${bold(pad('Empresa',20))}  ${bold(pad('Usuarios',10))}  ${bold(pad('Activación',12))}  ${bold('Vence')}`)
  console.log(`  ${dim('─'.repeat(95))}`)

  lics.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.licenseCode || '').localeCompare(b.licenseCode || ''))
    .forEach(l => {
      const reg     = countByLic[l.id] || 0
      const exp     = l.expiresAt ? (l.expiresAt?.toDate ? l.expiresAt.toDate() : new Date(l.expiresAt)) : null
      const expired = exp && exp < new Date()
      const activation = l.requiresActivation ? blue('por código') : dim('libre     ')
      console.log(
        `  ${bold(cyan(pad(l.licenseCode || '—', 18)))}  ${statusLic(expired ? 'expired' : l.status)}  ${pad(l.companyId, 20)}  ${pad(`${reg}/${l.maxUsers || '?'}`, 10)}  ${activation}  ${exp ? (expired ? red(exp.toLocaleDateString('es-UY')) : exp.toLocaleDateString('es-UY')) : dim('—')}`
      )
    })
}

async function accesos(licenseCode) {
  header(`Accesos (userAccess)${licenseCode ? ` — ${licenseCode}` : ''}`)

  let accessDocs
  if (licenseCode) {
    const lic = await db.collection('licenses').where('licenseCode', '==', licenseCode).limit(1).get()
    if (lic.empty) { console.log(red(`  Licencia ${licenseCode} no encontrada.`)); return }
    const licId = lic.docs[0].id
    const snap = await db.collection('userAccess').where('licenseId', '==', licId).get()
    accessDocs = snap.docs
  } else {
    const snap = await db.collection('userAccess').get()
    accessDocs = snap.docs
  }

  if (!accessDocs.length) { console.log(dim('  Sin registros.')); return }

  console.log(`  ${bold(pad('Estado',10))}  ${bold(pad('Nombre',20))}  ${bold(pad('Email',28))}  ${bold(pad('Código Act.',12))}  ${bold('Última conexión')}`)
  console.log(`  ${dim('─'.repeat(95))}`)

  accessDocs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const ta = a.lastSeenAt?.toDate ? a.lastSeenAt.toDate() : new Date(0)
      const tb = b.lastSeenAt?.toDate ? b.lastSeenAt.toDate() : new Date(0)
      return tb - ta
    })
    .forEach(u => {
      console.log(
        `  ${statusAccess(u.status)}  ${pad(u.name || '—', 20)}  ${pad(u.email || '—', 28)}  ${pad(u.activationCode || '—', 12)}  ${fmtDate(u.lastSeenAt)}`
      )
      console.log(`  ${dim(' '.repeat(10))}  ${dim('metaUserId: ' + (u.metaUserId || '—'))}  ${dim('v' + (u.appVersion || '?'))}`)
    })
}

async function eventos(n) {
  const limit = parseInt(n) || 20
  header(`Últimos ${limit} eventos`)

  const snap = await db.collection('events').orderBy('createdAt', 'desc').limit(limit).get()

  if (snap.empty) { console.log(dim('  Sin eventos.')); return }

  console.log(`  ${bold(pad('Fecha',17))}  ${bold(pad('Resultado',10))}  ${bold(pad('Licencia',16))}  ${bold(pad('Módulo',22))}  ${bold('Motivo / metaUserId')}`)
  console.log(`  ${dim('─'.repeat(95))}`)

  snap.docs.forEach(d => {
    const e  = d.data()
    const ok = e.allowed ? green('✔ OK    ') : red('✕ DENY  ')
    console.log(
      `  ${dim(fmtDate(e.createdAt))}  ${ok}  ${pad(e.licenseCode || '—', 16)}  ${pad(e.moduleId || '—', 22)}  ${e.allowed ? dim(e.metaUserId || '—') : yellow(e.reason || '—')}`
    )
  })

  const ok   = snap.docs.filter(d => d.data().allowed).length
  const deny = snap.docs.filter(d => !d.data().allowed).length
  console.log(`\n  ${green(`✔ ${ok} permitidos`)}  ${red(`✕ ${deny} denegados`)}`)
}

async function validar(code) {
  if (!code) { console.log(red('  Especificá un código. Ej: node inspect.js validar A7K4P2')); return }
  header(`Validación de código: ${bold(code)}`)

  const doc  = await db.collection('activationCodes').doc(code).get()

  if (!doc.exists) {
    console.log(red(`  ✕ El código "${code}" no existe en Firestore.`))
    return
  }

  const data = doc.data()
  console.log(`  Estado         ${statusCode(data.status)}`)
  console.log(`  Nombre         ${bold(data.name || dim('—'))}`)
  console.log(`  Email          ${data.email || dim('—')}`)
  console.log(`  Licencia       ${cyan(data.licenseCode || '—')}  ${dim('(licenseId: ' + (data.licenseId || '—') + ')')}`)
  console.log(`  Company ID     ${dim(data.companyId || '—')}`)
  console.log(`  Meta User ID   ${data.metaUserId ? green(data.metaUserId) : dim('sin vincular')}`)
  console.log(`  Activado       ${fmtDate(data.activatedAt)}`)
  console.log(`  Creado         ${fmtDate(data.createdAt)}`)

  console.log()
  if (data.status === 'pending' && !data.metaUserId) {
    console.log(green('  ✔ Código listo para ser usado por el tester.'))
  } else if (data.status === 'activated') {
    console.log(green(`  ✔ Código activado. MetaUserId vinculado: ${data.metaUserId}`))
  } else if (data.status === 'blocked') {
    console.log(red('  ✕ Código bloqueado. No puede ser usado hasta que se desbloquee.'))
  }
}

// ── dispatcher ───────────────────────────────────────────────

async function main() {
  const [,, cmd, arg] = process.argv

  try {
    switch ((cmd || 'resumen').toLowerCase()) {
      case 'resumen':   await resumen();       break
      case 'codigos':   await codigos(arg);    break
      case 'licencias': await licencias();     break
      case 'accesos':   await accesos(arg);    break
      case 'eventos':   await eventos(arg);    break
      case 'validar':   await validar(arg);    break
      default:
        console.log(`Comando desconocido: "${cmd}"`)
        console.log('Comandos: resumen | codigos [licenseCode] | licencias | accesos [licenseCode] | eventos [N] | validar [code]')
    }
  } catch (err) {
    console.error(red('\nError: ' + err.message))
    if (err.code === 5) console.error(dim('  (colección no encontrada o sin permisos)'))
  }

  console.log()
  process.exit(0)
}

main()
