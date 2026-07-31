import { useState, useMemo } from 'react'
import { Table, Tag, Select, Input, Typography, Space, Spin, Button, Popconfirm, message } from 'antd'
import { StopOutlined, CheckCircleOutlined, GlobalOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useCollection } from '../hooks/useCollection'
import { useRole } from '../hooks/useRole'

dayjs.extend(relativeTime)
const { Title, Text } = Typography

const OFFLINE_THRESHOLD_HOURS = 48
const PLATFORM_LABELS = { quest2: 'Meta Quest 2', quest3: 'Meta Quest 3', questpro: 'Meta Quest Pro' }

function toDate(v) { return v?.toDate ? v.toDate() : v ? new Date(v) : null }

export default function Devices() {
  const role = useRole()
  const [users,     loading]  = useCollection('users')
  const [companies]           = useCollection('companies')

  const [filterCompany, setFilterCompany] = useState(null)
  const [filterGlobal, setFilterGlobal]   = useState(null)
  const [search, setSearch]               = useState('')
  const [blocking, setBlocking]           = useState(null)

  const companyById = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies])

  // Solo mostrar usuarios que ya se conectaron al menos una vez
  const connected = useMemo(() => users.filter(u => u.metaUserId || u.lastSeenAt), [users])

  const filtered = useMemo(() => connected.filter(u => {
    if (filterCompany && u.companyId !== filterCompany) return false
    if (filterGlobal !== null && !!u.isGlobal !== filterGlobal) return false
    if (search) {
      const q = search.toLowerCase()
      if (!u.metaUsername?.toLowerCase().includes(q) &&
          !(u.metaUserId || '').toLowerCase().includes(q) &&
          !(u.name  || '').toLowerCase().includes(q) &&
          !(u.email || '').toLowerCase().includes(q)) return false
    }
    return true
  }), [connected, filterCompany, filterGlobal, search])

  const offlineCount = useMemo(() => connected.filter(u => {
    const last = toDate(u.lastSeenAt)
    return last && (Date.now() - last.getTime()) / 3_600_000 > OFFLINE_THRESHOLD_HOURS
  }).length, [connected])

  const handleBlockToggle = async (record) => {
    const newStatus = record.status === 'blocked' ? 'active' : 'blocked'
    setBlocking(record.id)
    try {
      await updateDoc(doc(db, 'users', record.id), { status: newStatus })
      message.success(newStatus === 'blocked' ? 'Usuario bloqueado' : 'Usuario desbloqueado')
    } catch (err) {
      console.error(err)
      message.error('No se pudo actualizar el estado')
    } finally {
      setBlocking(null)
    }
  }

  const expandedRowRender = (record) => (
    <Space size={32} wrap style={{ padding: '4px 0 8px' }}>
      {record.email && <div><Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Email</Text><Text>{record.email}</Text></div>}
      <div><Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Meta User ID</Text><code style={{ fontSize: 12 }}>{record.metaUserId || '—'}</code></div>
      {companyById[record.companyId] && <div><Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Empresa</Text><Text>{companyById[record.companyId].name}</Text></div>}
      <div><Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Modelo</Text><Text>{record.deviceModel || <span style={{ color: '#bbb' }}>—</span>}</Text></div>
      <div><Text type="secondary" style={{ fontSize: 11, display: 'block' }}>SO</Text><Text>{record.osVersion || <span style={{ color: '#bbb' }}>—</span>}</Text></div>
      <div><Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Plataforma</Text><Text>{record.platform ? (PLATFORM_LABELS[record.platform] || record.platform) : <span style={{ color: '#bbb' }}>—</span>}</Text></div>
      <div><Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Primera conexión</Text><Text>{record.createdAt ? dayjs(toDate(record.createdAt)).format('DD/MM/YYYY') : '—'}</Text></div>
      {record.isGlobal && <div><Tag icon={<GlobalOutlined />} color="geekblue">Acceso global</Tag></div>}
    </Space>
  )

  const columns = [
    {
      title: 'Usuario', key: 'user',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>{r.metaUsername}</div>
          {r.name && <Text type="secondary" style={{ fontSize: 12 }}>{r.name}</Text>}
        </div>
      ),
    },
    {
      title: 'Tipo', key: 'global',
      render: (_, r) => r.isGlobal
        ? <Tag icon={<GlobalOutlined />} color="geekblue">Global</Tag>
        : <Tag color="default">Estándar</Tag>,
    },
    {
      title: 'Estado', dataIndex: 'status', key: 'status',
      render: s => s === 'blocked'
        ? <Tag color="error">Bloqueado</Tag>
        : <Tag color="success">Activo</Tag>,
    },
    { title: 'Versión app', dataIndex: 'appVersion', key: 'version', render: v => v || '—' },
    {
      title: 'Última conexión', dataIndex: 'lastSeenAt', key: 'last',
      render: v => {
        if (!v) return '—'
        const last = toDate(v)
        const isOffline = (Date.now() - last.getTime()) / 3_600_000 > OFFLINE_THRESHOLD_HOURS
        return (
          <span>
            {dayjs(last).fromNow()}
            {isOffline && <Tag color="warning" style={{ marginLeft: 8 }}>Sin conexión &gt;{OFFLINE_THRESHOLD_HOURS}hs</Tag>}
          </span>
        )
      },
    },
    ...(role === 'admin' ? [{
      title: '', key: 'actions', width: 130,
      render: (_, record) => {
        const isBlocked = record.status === 'blocked'
        return (
          <Popconfirm
            title={isBlocked ? '¿Desbloquear?' : '¿Bloquear?'}
            description={isBlocked
              ? 'El usuario podrá volver a conectarse.'
              : 'El usuario no podrá acceder hasta ser desbloqueado.'}
            onConfirm={() => handleBlockToggle(record)}
            okText={isBlocked ? 'Desbloquear' : 'Bloquear'}
            cancelText="Cancelar"
            okButtonProps={{ danger: !isBlocked }}
          >
            <Button
              size="small"
              icon={isBlocked ? <CheckCircleOutlined /> : <StopOutlined />}
              loading={blocking === record.id}
              danger={!isBlocked}
            >
              {isBlocked ? 'Desbloquear' : 'Bloquear'}
            </Button>
          </Popconfirm>
        )
      },
    }] : []),
  ]

  if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Accesos</Title>
      </div>

      {offlineCount > 0 && (
        <div style={{ marginBottom: 16, padding: '8px 16px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, fontSize: 13 }}>
          ⚠️ {offlineCount} usuario(s) sin conexión hace más de {OFFLINE_THRESHOLD_HOURS} horas
        </div>
      )}

      <Space style={{ marginBottom: 16 }} wrap>
        <Select value={filterGlobal === null ? '' : String(filterGlobal)} style={{ width: 160 }}
          onChange={v => setFilterGlobal(v === '' ? null : v === 'true')}
          options={[
            { value: '',      label: 'Todos los tipos' },
            { value: 'true',  label: 'Global' },
            { value: 'false', label: 'Estándar' },
          ]} />
        <Select value={filterCompany || ''} style={{ width: 210 }}
          onChange={v => setFilterCompany(v || null)}
          options={[
            { value: '', label: 'Todas las empresas' },
            ...companies.map(c => ({ value: c.id, label: c.name })),
          ]} />
        <Input placeholder="Buscar username, nombre o email..."
          value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} allowClear />
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
