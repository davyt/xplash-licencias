import { useState, useMemo } from 'react'
import { Table, Tag, Select, DatePicker, Typography, Space, Spin } from 'antd'
import dayjs from 'dayjs'
import { useCollection } from '../hooks/useCollection'
import { MODULES } from '../mock/data'

const { Title } = Typography
const { RangePicker } = DatePicker

function toDate(v) { return v?.toDate ? v.toDate() : v ? new Date(v) : null }

export default function Events() {
  const [events, loading] = useCollection('events')
  const [companies]       = useCollection('companies')

  const [filterType, setFilterType]       = useState(null)
  const [filterCompany, setFilterCompany] = useState(null)
  const [dateRange, setDateRange]         = useState(null)

  const companyById = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies])

  const rows = useMemo(() => [...events]
    .sort((a, b) => (toDate(b.createdAt) || 0) - (toDate(a.createdAt) || 0))
    .map(e => ({ ...e, companyName: e.companyName || companyById[e.companyId]?.name || e.companyId || '—' }))
  , [events, companyById])

  const filtered = useMemo(() => rows.filter(e => {
    if (filterType !== null && e.allowed !== (filterType === 'allowed')) return false
    if (filterCompany && e.companyId !== filterCompany) return false
    if (dateRange) {
      const d = dayjs(toDate(e.createdAt))
      if (d.isBefore(dateRange[0], 'day') || d.isAfter(dateRange[1], 'day')) return false
    }
    return true
  }), [rows, filterType, filterCompany, dateRange])

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
    { title: 'Empresa', dataIndex: 'companyName', key: 'company' },
    {
      title: 'Meta User ID', dataIndex: 'metaUserId', key: 'user',
      render: v => <code style={{ fontSize: 12 }}>{v || '—'}</code>,
    },
    {
      title: 'Módulo', dataIndex: 'moduleId', key: 'module',
      render: v => MODULES.find(m => m.id === v)?.label || v || '—',
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
        <Select placeholder="Tipo" allowClear style={{ width: 160 }} onChange={setFilterType}
          options={[{ value: 'allowed', label: '✔ Permitidos' }, { value: 'denied', label: '✕ Denegados' }]} />
        <Select placeholder="Empresa" allowClear style={{ width: 200 }} onChange={setFilterCompany}
          options={companies.map(c => ({ value: c.id, label: c.name }))} />
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
