import { Card, Statistic, Table, Tag, Typography } from 'antd'
import { CheckCircleOutlined, StopOutlined, ClockCircleOutlined, TabletOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { mockLicenses, mockInstallations, STATUS_LABELS } from '../mock/data'

dayjs.extend(relativeTime)

const { Title } = Typography

const statuses = mockLicenses.map(l => {
  if (l.status !== 'active' && l.status !== 'draft') return l.status
  if (l.status === 'active' && l.expiresAt && new Date(l.expiresAt) < new Date()) return 'expired'
  return l.status
})

const stats = {
  active:  statuses.filter(s => s === 'active').length,
  blocked: statuses.filter(s => s === 'blocked').length,
  expired: statuses.filter(s => s === 'expired').length,
  devices: mockInstallations.length,
}

const licenseColumns = [
  { title: 'Empresa', dataIndex: 'companyName', key: 'company' },
  { title: 'Código', dataIndex: 'licenseCode', key: 'code', render: v => <code style={{ fontSize: 12 }}>{v}</code> },
  {
    title: 'Estado', dataIndex: 'status', key: 'status',
    render: s => {
      const cfg = STATUS_LABELS[s] || { label: s, color: 'default' }
      return <Tag color={cfg.color}>{cfg.label}</Tag>
    },
  },
  {
    title: 'Vence', dataIndex: 'expiresAt', key: 'expires',
    render: v => v ? dayjs(v).format('DD/MM/YYYY') : '—',
  },
]

const deviceColumns = [
  { title: 'Visor', dataIndex: 'installId', key: 'id', render: v => <code style={{ fontSize: 12 }}>{v}</code> },
  { title: 'Empresa', dataIndex: 'companyName', key: 'company' },
  {
    title: 'Último acceso', dataIndex: 'lastSeenAt', key: 'last',
    render: v => dayjs(v).fromNow(),
  },
]

export default function Dashboard() {
  return (
    <div>
      <Title level={4} style={{ margin: '0 0 20px' }}>Dashboard</Title>

      <div className="stat-cards">
        <Card>
          <Statistic title="Licencias activas" value={stats.active} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} valueStyle={{ color: '#52c41a' }} />
        </Card>
        <Card>
          <Statistic title="Bloqueadas" value={stats.blocked} prefix={<StopOutlined style={{ color: '#F65C7C' }} />} valueStyle={{ color: '#F65C7C' }} />
        </Card>
        <Card>
          <Statistic title="Vencidas" value={stats.expired} prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />} valueStyle={{ color: '#faad14' }} />
        </Card>
        <Card>
          <Statistic title="Visores registrados" value={stats.devices} prefix={<TabletOutlined />} />
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card title="Licencias recientes" size="small">
          <Table
            dataSource={mockLicenses.slice(0, 5)}
            columns={licenseColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
        <Card title="Últimos accesos de visores" size="small">
          <Table
            dataSource={mockInstallations.slice(0, 5)}
            columns={deviceColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      </div>
    </div>
  )
}
