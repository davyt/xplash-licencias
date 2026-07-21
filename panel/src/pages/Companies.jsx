import { useState } from 'react'
import { Table, Button, Tag, Input, Modal, Form, Select, Typography, Space, Tooltip, message } from 'antd'
import { PlusOutlined, EditOutlined, SearchOutlined, HistoryOutlined } from '@ant-design/icons'
import { mockCompanies, mockContracts, PLANS } from '../mock/data'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activa' },
  { value: 'paused', label: 'Pausada' },
]

const STATUS_COLORS = { active: 'success', paused: 'default' }
const STATUS_LABELS = { active: 'Activa', paused: 'Pausada' }

export default function Companies() {
  const [companies, setCompanies] = useState(mockCompanies)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [historyCompany, setHistoryCompany] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.contactName || '').toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: 'active' })
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleSave = () => {
    form.validateFields().then(values => {
      if (editing) {
        setCompanies(prev => prev.map(c => c.id === editing.id ? { ...c, ...values } : c))
        message.success('Empresa actualizada')
      } else {
        const newCompany = { ...values, id: `c${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10) }
        setCompanies(prev => [...prev, newCompany])
        message.success('Empresa creada')
      }
      setModalOpen(false)
    })
  }

  const columns = [
    { title: 'Empresa', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: 'Persona de contacto', key: 'contact',
      render: (_, r) => (
        <div>
          <div>{r.contactName || <span style={{ color: '#bbb' }}>—</span>}</div>
          {r.contactPhone && <Text type="secondary" style={{ fontSize: 12 }}>{r.contactPhone}</Text>}
        </div>
      ),
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Estado', dataIndex: 'status', key: 'status',
      render: s => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
      filters: STATUS_OPTIONS.map(o => ({ text: o.label, value: o.value })),
      onFilter: (value, record) => record.status === value,
    },
    { title: 'Alta', dataIndex: 'createdAt', key: 'createdAt' },
    {
      title: '', key: 'actions', width: 80,
      render: (_, record) => (
        <Space>
          <Tooltip title="Historial comercial">
            <Button icon={<HistoryOutlined />} size="small" onClick={() => setHistoryCompany(record)} />
          </Tooltip>
          <Tooltip title="Editar">
            <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ]

  const historyContracts = historyCompany
    ? mockContracts.filter(c => c.companyId === historyCompany.id).sort((a, b) => b.startDate.localeCompare(a.startDate))
    : []

  const historyColumns = [
    {
      title: 'Plan', dataIndex: 'plan', key: 'plan',
      render: v => {
        const found = PLANS.find(p => p.value === v)
        return found ? found.label : v
      },
    },
    { title: 'Usuarios', dataIndex: 'maxUsers', key: 'maxUsers' },
    {
      title: 'Período', key: 'period',
      render: (_, r) => `${dayjs(r.startDate).format('DD/MM/YY')} → ${dayjs(r.endDate).format('DD/MM/YY')}`,
    },
    { title: 'Notas', dataIndex: 'notes', key: 'notes', render: v => v || '—' },
  ]

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Empresas</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: '#F65C7C', borderColor: '#F65C7C' }}>
          Nueva empresa
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Buscar por nombre, contacto o email..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 320 }}
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
      />

      {/* Editar / crear empresa */}
      <Modal
        title={editing ? `Editar: ${editing.name}` : 'Nueva empresa'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Guardar cambios' : 'Crear empresa'}
        okButtonProps={{ style: { background: '#F65C7C', borderColor: '#F65C7C' } }}
        cancelText="Cancelar"
        width={540}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Nombre de empresa" rules={[{ required: true, message: 'Campo requerido' }]}>
            <Input />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="contactName" label="Persona de contacto">
              <Input placeholder="Nombre y apellido" />
            </Form.Item>
            <Form.Item name="contactPhone" label="Teléfono de contacto">
              <Input placeholder="+54 11 ..." />
            </Form.Item>
          </div>
          <Form.Item name="email" label="Email de contacto" rules={[{ required: true }, { type: 'email', message: 'Email inválido' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="status" label="Estado" rules={[{ required: true }]}>
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="notes" label="Notas internas">
            <Input.TextArea rows={3} placeholder="Solo visible para el equipo Xplash" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Historial comercial */}
      <Modal
        title={historyCompany ? `Historial — ${historyCompany.name}` : ''}
        open={!!historyCompany}
        onCancel={() => setHistoryCompany(null)}
        footer={null}
        width={640}
      >
        {historyContracts.length === 0 ? (
          <Text type="secondary">Sin contratos registrados.</Text>
        ) : (
          <>
            {historyContracts.length >= 3 && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#FEF3C7', borderRadius: 6, fontSize: 13, color: '#92400E' }}>
                💡 {historyContracts.length} contratos registrados — candidata a oferta de plan anual.
              </div>
            )}
            <Table
              dataSource={historyContracts}
              columns={historyColumns}
              rowKey="id"
              size="small"
              pagination={false}
            />
          </>
        )}
      </Modal>
    </div>
  )
}
