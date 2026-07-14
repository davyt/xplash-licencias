import { Table, Tag, Select, Input, Typography, Space, Alert } from 'antd'
import { useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { mockInstallations, mockCompanies } from '../mock/data'

dayjs.extend(relativeTime)

const { Title } = Typography

const OFFLINE_THRESHOLD_HOURS = 48

export default function Devices() {
  const [filterCompany, setFilterCompany] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = mockInstallations.filter(d => {
    if (filterCompany && d.companyId !== filterCompany) return false
    if (search && !d.installId.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const offlineDevices = mockInstallations.filter(d => {
    const diffHours = (Date.now() - new Date(d.lastSeenAt).getTime()) / (1000 * 60 * 60)
    return diffHours > OFFLINE_THRESHOLD_HOURS
  })

  const columns = [
    {
      title: 'ID Visor', dataIndex: 'installId', key: 'id',
      render: v => <code style={{ fontSize: 12 }}>{v}</code>,
    },
    { title: 'Empresa', dataIndex: 'companyName', key: 'company' },
    {
      title: 'Versión app', dataIndex: 'appVersion', key: 'version',
      render: v => v || '—',
    },
    {
      title: 'Primera conexión', dataIndex: 'firstSeenAt', key: 'first',
      render: v => dayjs(v).format('DD/MM/YYYY'),
    },
    {
      title: 'Última conexión', dataIndex: 'lastSeenAt', key: 'last',
      render: v => {
        const diffHours = (Date.now() - new Date(v).getTime()) / (1000 * 60 * 60)
        const isOffline = diffHours > OFFLINE_THRESHOLD_HOURS
        return (
          <span>
            {dayjs(v).fromNow()}
            {isOffline && <Tag color="warning" style={{ marginLeft: 8 }}>Offline &gt;{OFFLINE_THRESHOLD_HOURS}hs</Tag>}
          </span>
        )
      },
    },
  ]

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Visores</Title>
      </div>

      {offlineDevices.length > 0 && (
        <Alert
          type="warning"
          style={{ marginBottom: 16 }}
          message={`${offlineDevices.length} visor(es) sin conexión hace más de ${OFFLINE_THRESHOLD_HOURS} horas`}
          description="Pueden estar corriendo en modo offline. Si su grace period venció, el próximo arranque será denegado."
          showIcon
        />
      )}

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="Empresa"
          allowClear
          style={{ width: 200 }}
          onChange={setFilterCompany}
          options={mockCompanies.map(c => ({ value: c.id, label: c.name }))}
        />
        <Input
          placeholder="Buscar por ID de visor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 260 }}
          allowClear
        />
      </Space>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        size="middle"
        pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}–${r[1]} de ${t}` }}
      />
    </div>
  )
}
