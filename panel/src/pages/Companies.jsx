import { useState } from 'react'
import { Table, Button, Tag, Input, Modal, Form, Select, Typography, Space, Tooltip, message } from 'antd'
import { PlusOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons'
import { mockCompanies } from '../mock/data'

const { Title } = Typography

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
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
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
    { title: 'Email de contacto', dataIndex: 'email', key: 'email' },
    {
      title: 'Estado', dataIndex: 'status', key: 'status',
      render: s => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
      filters: STATUS_OPTIONS.map(o => ({ text: o.label, value: o.value })),
      onFilter: (value, record) => record.status === value,
    },
    { title: 'Alta', dataIndex: 'createdAt', key: 'createdAt' },
    {
      title: '', key: 'actions', width: 50,
      render: (_, record) => (
        <Tooltip title="Editar">
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
        </Tooltip>
      ),
    },
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
          placeholder="Buscar por nombre o email..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 300 }}
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

      <Modal
        title={editing ? `Editar: ${editing.name}` : 'Nueva empresa'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Guardar cambios' : 'Crear empresa'}
        okButtonProps={{ style: { background: '#F65C7C', borderColor: '#F65C7C' } }}
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Nombre de empresa" rules={[{ required: true, message: 'Campo requerido' }]}>
            <Input />
          </Form.Item>
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
    </div>
  )
}
