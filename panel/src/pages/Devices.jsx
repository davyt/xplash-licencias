import { Table, Tag, Select, Input, Typography, Space, Alert } from 'antd'
import { useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { mockInstallations, mockCompanies, mockLicenses } from '../mock/data'

dayjs.extend(relativeTime)

const { Title, Text } = Typography

const OFFLINE_THRESHOLD_HOURS = 48

const PLATFORM_LABELS = {
  quest2: 'Meta Quest 2',
  quest3: 'Meta Quest 3',
  questpro: 'Meta Quest Pro',
}

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

  const expandedRowRender = (record) => {
    const license = mockLicenses.find(l => l.id === record.licenseId)
    return (
      <Space size={40} wrap style={{ padding: '4px 0 8px' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Licencia</Text>
          <code style={{ fontSize: 12 }}>{license?.licenseCode || record.licenseId}</code>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Modelo</Text>
          <Text>{record.deviceModel || <span style={{ color: '#bbb' }}>—</span>}</Text>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Sistema operativo</Text>
          <Text>{record.osVersion || <span style={{ color: '#bbb' }}>—</span>}</Text>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Plataforma</Text>
          <Text>{record.platform ? (PLATFORM_LABELS[record.platform] || record.platform) : <span style={{ color: '#bbb' }}>—</span>}</Text>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Primera conexión</Text>
          <Text>{dayjs(record.firstSeenAt).format('DD/MM/YYYY HH:mm')}</Text>
        </div>
      </Space>
    )
  }

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
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}–${r[1]} de ${t}` }}
        expandable={{
          expandedRowRender,
          rowExpandable: () => true,
          expandRowByClick: true,
        }}
      />
    </div>
  )
}
