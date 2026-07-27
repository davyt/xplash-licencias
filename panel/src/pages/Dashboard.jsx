import { useMemo } from 'react'
import { Card, Statistic, Table, Tag, Typography, Spin } from 'antd'
import {
  CheckCircleOutlined, StopOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, BankOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useNavigate } from 'react-router-dom'
import { useCollection } from '../hooks/useCollection'
import { useRole } from '../hooks/useRole'
import { STATUS_LABELS } from '../mock/data'

dayjs.extend(relativeTime)
const { Title } = Typography

function toDate(v) { return v?.toDate ? v.toDate() : v ? new Date(v) : null }

const licenseColumns = [
  { title: 'Empresa',  dataIndex: 'companyName', key: 'company' },
  { title: 'Código',   dataIndex: 'licenseCode',  key: 'code', render: v => <code style={{ fontSize: 12 }}>{v}</code> },
  {
    title: 'Estado', dataIndex: 'status', key: 'status',
    render: s => { const cfg = STATUS_LABELS[s] || { label: s, color: 'default' }; return <Tag color={cfg.color}>{cfg.label}</Tag> },
  },
  { title: 'Vence', dataIndex: 'expiresAt', key: 'expires', render: v => v ? dayjs(toDate(v)).format('DD/MM/YYYY') : '—' },
]

const deviceColumns = [
  { title: 'Meta User ID', dataIndex: 'metaUserId', key: 'id', render: v => <code style={{ fontSize: 12 }}>{v}</code> },
  { title: 'Nombre',       dataIndex: 'name',        key: 'name', render: v => v || '—' },
  { title: 'Empresa',      dataIndex: 'companyName', key: 'company' },
  { title: 'Último acceso', dataIndex: 'lastSeenAt', key: 'last', render: v => v ? dayjs(toDate(v)).fromNow() : '—' },
]

const expiringColumns = [
  { title: 'Empresa', dataIndex: 'companyName', key: 'company' },
  { title: 'Código',  dataIndex: 'licenseCode',  key: 'code', render: v => <code style={{ fontSize: 12 }}>{v}</code> },
  {
    title: 'Vence en', dataIndex: 'expiresAt', key: 'diff',
    render: v => { const diff = dayjs(toDate(v)).diff(dayjs(), 'day'); return <Tag color="warning">{diff === 0 ? 'Hoy' : `${diff} día${diff !== 1 ? 's' : ''}`}</Tag> },
  },
  { title: 'Fecha', dataIndex: 'expiresAt', key: 'date', render: v => dayjs(toDate(v)).format('DD/MM/YYYY') },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const role = useRole()
  const [companies, loadingC]  = useCollection('companies')
  const [licenses,  loadingL]  = useCollection('licenses')
  const [userAccess, loadingU] = useCollection('userAccess')

  const loading = loadingC || loadingL || loadingU

  const companyById = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies])

  const licensesWithNames = useMemo(() => licenses.map(l => ({
    ...l, companyName: l.companyName || companyById[l.companyId]?.name || '—',
  })), [licenses, companyById])

  const accessWithNames = useMemo(() => [...userAccess]
    .sort((a, b) => (toDate(b.lastSeenAt) || 0) - (toDate(a.lastSeenAt) || 0))
    .map(u => ({ ...u, companyName: u.companyName || companyById[u.companyId]?.name || '—' }))
  , [userAccess, companyById])

  const today = dayjs()

  const computedStatuses = useMemo(() => licensesWithNames.map(l => {
    if (l.status === 'draft') return 'draft'
    if (l.status !== 'active') return l.status
    const exp = toDate(l.expiresAt)
    if (exp && dayjs(exp).isBefore(today)) return 'expired'
    return 'active'
  }), [licensesWithNames, today])

  const expiringSoonList = useMemo(() => licensesWithNames
    .filter(l => {
      if (!l.expiresAt || l.status === 'draft') return false
      const diff = dayjs(toDate(l.expiresAt)).diff(today, 'day')
      return diff >= 0 && diff <= 7
    })
    .sort((a, b) => dayjs(toDate(a.expiresAt)).diff(dayjs(toDate(b.expiresAt))))
  , [licensesWithNames, today])

  if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />

  const stats = {
    active:          computedStatuses.filter(s => s === 'active').length,
    blocked:         computedStatuses.filter(s => s === 'blocked').length,
    expired:         computedStatuses.filter(s => s === 'expired').length,
    expiringSoon:    expiringSoonList.length,
    activeCompanies: companies.filter(c => c.status === 'active').length,
  }

  const adminKpis = [
    { title: 'Licencias activas',  value: stats.active,       color: '#52c41a', icon: <CheckCircleOutlined />, link: '/licencias' },
    { title: 'Próximas a vencer',  value: stats.expiringSoon, color: stats.expiringSoon > 0 ? '#D97706' : '#52c41a', icon: <ExclamationCircleOutlined />, sub: '≤ 7 días', alert: stats.expiringSoon > 0, link: '/licencias' },
    { title: 'Vencidas',           value: stats.expired,      color: '#faad14', icon: <ClockCircleOutlined />, link: '/licencias' },
    { title: 'Bloqueadas',         value: stats.blocked,      color: '#F65C7C', icon: <StopOutlined />, link: '/licencias' },
  ]
  const marketingKpis = [
    { title: 'Licencias activas',  value: stats.active,          color: '#52c41a', icon: <CheckCircleOutlined />, link: '/licencias' },
    { title: 'Próximas a vencer',  value: stats.expiringSoon,    color: stats.expiringSoon > 0 ? '#D97706' : '#52c41a', icon: <ExclamationCircleOutlined />, sub: '≤ 7 días', alert: stats.expiringSoon > 0, link: '/licencias' },
    { title: 'Vencidas',           value: stats.expired,         color: '#faad14', icon: <ClockCircleOutlined />, link: '/licencias' },
    { title: 'Empresas activas',   value: stats.activeCompanies, color: '#2563EB', icon: <BankOutlined />, link: '/empresas' },
  ]

  const kpis = role === 'admin' ? adminKpis : marketingKpis

  const bottomLeft  = role === 'admin'
    ? { title: 'Licencias',         data: licensesWithNames.slice(0, 5), columns: licenseColumns,  link: '/licencias' }
    : { title: 'Próximas a vencer', data: expiringSoonList,              columns: expiringColumns, link: '/licencias' }

  const bottomRight = role === 'admin'
    ? { title: 'Últimos accesos',   data: accessWithNames.slice(0, 5),  columns: deviceColumns,   link: '/accesos'   }
    : { title: 'Licencias',         data: licensesWithNames.slice(0, 5), columns: licenseColumns,  link: '/licencias' }

  return (
    <div>
      <Title level={4} style={{ margin: '0 0 20px' }}>Dashboard</Title>

      <div className="stat-cards">
        {kpis.map(kpi => (
          <Card key={kpi.title} hoverable onClick={() => navigate(kpi.link)}
            style={{ cursor: 'pointer', ...(kpi.alert ? { borderColor: '#D97706', borderWidth: 1.5 } : {}) }}
          >
            <Statistic
              title={<span>{kpi.title}{kpi.sub && <span style={{ fontWeight: 400, color: '#bbb', marginLeft: 6, fontSize: 11 }}>{kpi.sub}</span>}</span>}
              value={kpi.value}
              prefix={<span style={{ color: kpi.color }}>{kpi.icon}</span>}
              styles={{ content: { color: kpi.color } }}
            />
          </Card>
        ))}
      </div>

      <div className="dashboard-grid">
        <Card title={bottomLeft.title} size="small">
          <Table dataSource={bottomLeft.data} columns={bottomLeft.columns} rowKey="id" pagination={false}
            onRow={() => ({ onClick: () => navigate(bottomLeft.link), style: { cursor: 'pointer' } })}
            size="small" scroll={{ x: 'max-content' }} locale={{ emptyText: 'Sin datos' }} />
        </Card>
        <Card title={bottomRight.title} size="small">
          <Table dataSource={bottomRight.data} columns={bottomRight.columns} rowKey="id" pagination={false}
            onRow={() => ({ onClick: () => navigate(bottomRight.link), style: { cursor: 'pointer' } })}
            size="small" scroll={{ x: 'max-content' }} locale={{ emptyText: 'Sin datos' }} />
        </Card>
      </div>
    </div>
  )
}
