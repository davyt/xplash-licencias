import { Table, Tag, Select, DatePicker, Typography, Space } from 'antd'
import { useState } from 'react'
import dayjs from 'dayjs'
import { mockEvents, mockCompanies, MODULES } from '../mock/data'

const { Title } = Typography
const { RangePicker } = DatePicker

export default function Events() {
  const [filterType, setFilterType] = useState(null)
  const [filterCompany, setFilterCompany] = useState(null)
  const [dateRange, setDateRange] = useState(null)

  const filtered = mockEvents.filter(e => {
    if (filterType !== null && e.allowed !== (filterType === 'allowed')) return false
    if (filterCompany && e.companyId !== filterCompany) return false
    if (dateRange) {
      const d = dayjs(e.createdAt)
      if (d.isBefore(dateRange[0], 'day') || d.isAfter(dateRange[1], 'day')) return false
    }
    return true
  })

  const columns = [
    {
      title: 'Fecha / Hora', dataIndex: 'createdAt', key: 'date',
      render: v => dayjs(v).format('DD/MM/YYYY HH:mm'),
      sorter: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Resultado', dataIndex: 'allowed', key: 'result',
      render: v => v
        ? <Tag color="success">✔ Permitido</Tag>
        : <Tag color="error">✕ Denegado</Tag>,
    },
    { title: 'Empresa', dataIndex: 'companyName', key: 'company' },
    {
      title: 'Visor', dataIndex: 'installId', key: 'install',
      render: v => <code style={{ fontSize: 12 }}>{v}</code>,
    },
    {
      title: 'Módulo', dataIndex: 'moduleId', key: 'module',
      render: v => {
        const found = MODULES.find(m => m.id === v)
        return found ? found.label : v
      },
    },
    {
      title: 'Motivo de denegación', dataIndex: 'reason', key: 'reason',
      render: v => v || '—',
    },
  ]

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Eventos</Title>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="Tipo"
          allowClear
          style={{ width: 160 }}
          onChange={setFilterType}
          options={[
            { value: 'allowed', label: '✔ Permitidos' },
            { value: 'denied', label: '✕ Denegados' },
          ]}
        />
        <Select
          placeholder="Empresa"
          allowClear
          style={{ width: 200 }}
          onChange={setFilterCompany}
          options={mockCompanies.map(c => ({ value: c.id, label: c.name }))}
        />
        <RangePicker format="DD/MM/YYYY" onChange={setDateRange} />
      </Space>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        size="middle"
        pagination={{ pageSize: 15, showTotal: (t, r) => `${r[0]}–${r[1]} de ${t}` }}
      />
    </div>
  )
}
