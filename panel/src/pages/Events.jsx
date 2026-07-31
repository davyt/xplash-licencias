import { useState, useMemo } from 'react'
import { Table, Tag, Select, Input, DatePicker, Typography, Space, Spin } from 'antd'
import dayjs from 'dayjs'
import { useCollection } from '../hooks/useCollection'
import { MODULES } from '../mock/data'

const { Title } = Typography
const { RangePicker } = DatePicker

function toDate(v) { return v?.toDate ? v.toDate() : v ? new Date(v) : null }

export default function Events() {
  const [events, loading] = useCollection('events')
  const [modules]         = useCollection('modules')

  const [filterType, setFilterType]   = useState(null)
  const [filterUser, setFilterUser]   = useState('')
  const [dateRange, setDateRange]     = useState(null)

  // Fusionar módulos de Firestore con fallback a mock (para desarrollo)
  const moduleById = useMemo(() => {
    const base = Object.fromEntries(MODULES.map(m => [m.id, m.label]))
    modules.forEach(m => { base[m.id] = m.name || m.label })
    return base
  }, [modules])

  const rows = useMemo(() => [...events]
    .sort((a, b) => (toDate(b.createdAt) || 0) - (toDate(a.createdAt) || 0))
  , [events])

  const filtered = useMemo(() => rows.filter(e => {
    if (filterType !== null && e.allowed !== (filterType === 'allowed')) return false
    if (filterUser && !(e.metaUsername || '').toLowerCase().includes(filterUser.toLowerCase())) return false
    if (dateRange) {
      const d = dayjs(toDate(e.createdAt))
      if (d.isBefore(dateRange[0], 'day') || d.isAfter(dateRange[1], 'day')) return false
    }
    return true
  }), [rows, filterType, filterUser, dateRange])

  const columns = [
    {
      title: 'Fecha / Hora', dataIndex: 'createdAt', key: 'date',
      render: v => v ? dayjs(toDate(v)).format('DD/MM/YYYY HH:mm') : '—',
    },
    {
      title: 'Resultado', dataIndex: 'allowed', key: 'result',
      render: v => v
        ? <Tag color="success">✔ Permitido</Tag>
        : <Tag color="error">✕ Denegado</Tag>,
    },
    {
      title: 'Usuario', key: 'user',
      render: (_, r) => r.metaUsername
        ? <code style={{ fontSize: 12 }}>{r.metaUsername}</code>
        : <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: 'LicenseCode', dataIndex: 'licenseCode', key: 'code',
      render: v => <code style={{ fontSize: 12 }}>{v || '—'}</code>,
    },
    {
      title: 'Módulo', dataIndex: 'moduleId', key: 'module',
      render: v => moduleById[v] || v || '—',
    },
    { title: 'Motivo de denegación', dataIndex: 'reason', key: 'reason', render: v => v || '—' },
  ]

  if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Eventos</Title>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select value={filterType || ''} style={{ width: 180 }}
          onChange={v => setFilterType(v || null)}
          options={[
            { value: '', label: 'Todos los eventos' },
            { value: 'allowed', label: '✔ Permitidos' },
            { value: 'denied',  label: '✕ Denegados' },
          ]} />
        <Input placeholder="Filtrar por username..." value={filterUser}
          onChange={e => setFilterUser(e.target.value)} style={{ width: 220 }} allowClear />
        <RangePicker format="DD/MM/YYYY" onChange={setDateRange} />
      </Space>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        size="middle"
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 15, showTotal: (t, r) => `${r[0]}–${r[1]} de ${t}` }}
      />
    </div>
  )
}
