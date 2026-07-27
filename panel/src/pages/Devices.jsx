import { useState, useMemo } from 'react'
import { Table, Tag, Select, Input, Typography, Space, Alert, Spin } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCollection } from '../hooks/useCollection'

dayjs.extend(relativeTime)
const { Title, Text } = Typography

const OFFLINE_THRESHOLD_HOURS = 48
const PLATFORM_LABELS = { quest2: 'Meta Quest 2', quest3: 'Meta Quest 3', questpro: 'Meta Quest Pro' }

function toDate(v) { return v?.toDate ? v.toDate() : v ? new Date(v) : null }

export default function Devices() {
  const [userAccess, loading] = useCollection('userAccess')
  const [companies]           = useCollection('companies')
  const [licenses]            = useCollection('licenses')

  const [filterCompany, setFilterCompany] = useState(null)
  const [search, setSearch]               = useState('')

  const companyById = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies])
  const licenseById = useMemo(() => Object.fromEntries(licenses.map(l => [l.id, l])),   [licenses])

  const rows = useMemo(() => userAccess.map(u => ({
    ...u,
    companyName: u.companyName || companyById[u.companyId]?.name || '—',
  })), [userAccess, companyById])

  const filtered = useMemo(() => rows.filter(d => {
    if (filterCompany && d.companyId !== filterCompany) return false
    if (search) {
      const q = search.toLowerCase()
      if (!d.metaUserId.toLowerCase().includes(q) &&
          !(d.name  || '').toLowerCase().includes(q) &&
          !(d.email || '').toLowerCase().includes(q)) return false
    }
    return true
  }), [rows, filterCompany, search])

  const offlineCount = useMemo(() => rows.filter(d => {
    const last = toDate(d.lastSeenAt)
    return last && (Date.now() - last.getTime()) / 3600000 > OFFLINE_THRESHOLD_HOURS
  }).length, [rows])

  const expandedRowRender = (record) => {
    const license = licenseById[record.licenseId]
    return (
      <Space size={32} wrap style={{ padding: '4px 0 8px' }}>
        {record.name  && <div><Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Nombre</Text><Text>{record.name}</Text></div>}
        {record.email && <div><Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Email</Text><Text>{record.email}</Text></div>}
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Licencia</Text>
          <code style={{ fontSize: 12 }}>{license?.licenseCode || record.licenseId}</code>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Modelo</Text>
          <Text>{record.deviceModel || <span style={{ color: '#bbb' }}>—</span>}</Text>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>SO</Text>
          <Text>{record.osVersion || <span style={{ color: '#bbb' }}>—</span>}</Text>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Plataforma</Text>
          <Text>{record.platform ? (PLATFORM_LABELS[record.platform] || record.platform) : <span style={{ color: '#bbb' }}>—</span>}</Text>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Primera conexión</Text>
          <Text>{record.firstSeenAt ? dayjs(toDate(record.firstSeenAt)).format('DD/MM/YYYY HH:mm') : '—'}</Text>
        </div>
        {record.activationCode && (
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Código activación</Text>
            <code style={{ fontSize: 12 }}>{record.activationCode}</code>
          </div>
        )}
      </Space>
    )
  }

  const columns = [
    {
      title: 'Meta User ID', dataIndex: 'metaUserId', key: 'id',
      render: v => <code style={{ fontSize: 12 }}>{v}</code>,
    },
    {
      title: 'Nombre / Email', key: 'nameEmail',
      render: (_, r) => r.name || r.email ? (
        <div>
          {r.name  && <div style={{ fontWeight: 500 }}>{r.name}</div>}
          {r.email && <Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text>}
        </div>
      ) : <span style={{ color: '#bbb' }}>—</span>,
    },
    { title: 'Empresa', dataIndex: 'companyName', key: 'company' },
    {
      title: 'Estado', dataIndex: 'status', key: 'status',
      render: s => s === 'blocked'
        ? <Tag color="error">Bloqueado</Tag>
        : <Tag color="success">Activo</Tag>,
    },
    { title: 'Versión', dataIndex: 'appVersion', key: 'version', render: v => v || '—' },
    {
      title: 'Última conexión', dataIndex: 'lastSeenAt', key: 'last',
      render: v => {
        if (!v) return '—'
        const last = toDate(v)
        const isOffline = (Date.now() - last.getTime()) / 3600000 > OFFLINE_THRESHOLD_HOURS
        return (
          <span>
            {dayjs(last).fromNow()}
            {isOffline && <Tag color="warning" style={{ marginLeft: 8 }}>Sin conexión &gt;{OFFLINE_THRESHOLD_HOURS}hs</Tag>}
          </span>
        )
      },
    },
  ]

  if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Accesos</Title>
      </div>

      {offlineCount > 0 && (
        <Alert type="warning" style={{ marginBottom: 16 }} showIcon
          message={`${offlineCount} usuario(s) sin conexión hace más de ${OFFLINE_THRESHOLD_HOURS} horas`}
          description="Pueden estar en modo offline. Si su grace period venció, el próximo arranque será denegado."
        />
      )}

      <Space style={{ marginBottom: 16 }} wrap>
        <Select placeholder="Empresa" allowClear style={{ width: 200 }} onChange={setFilterCompany}
          options={companies.map(c => ({ value: c.id, label: c.name }))} />
        <Input placeholder="Buscar por Meta User ID, nombre o email..."
          value={search} onChange={e => setSearch(e.target.value)} style={{ width: 300 }} allowClear />
      </Space>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        size="middle"
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}–${r[1]} de ${t}` }}
        expandable={{ expandedRowRender, rowExpandable: () => true, expandRowByClick: true }}
      />
    </div>
  )
}
