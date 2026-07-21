import { useState } from 'react'
import { Table, Button, Tag, Modal, Form, Input, Select, Typography, Space, Tooltip, message, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { mockAdminUsers } from '../mock/data'

const { Title, Text } = Typography

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'marketing', label: 'Marketing' },
]

const ROLE_COLORS = { admin: 'success', marketing: 'blue' }
const ROLE_LABELS = { admin: 'Admin', marketing: 'Marketing' }
const STATUS_COLORS = { active: 'success', pending: 'warning' }
const STATUS_LABELS = { active: 'Activo', pending: 'Pendiente' }

export default function Team() {
  const [users, setUsers] = useState(mockAdminUsers)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const openInvite = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ role: 'marketing' })
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
        setUsers(prev => prev.map(u => u.id === editing.id ? { ...u, ...values } : u))
        message.success('Usuario actualizado')
      } else {
        const newUser = {
          ...values,
          id: `u${Date.now()}`,
          status: 'pending',
          createdAt: new Date().toISOString().slice(0, 10),
        }
        setUsers(prev => [...prev, newUser])
        message.info(`Invitación enviada a ${values.email}`)
      }
      setModalOpen(false)
    })
  }

  const columns = [
    {
      title: 'Nombre', dataIndex: 'displayName', key: 'name',
      render: (v, r) => (
        <div>
          <div>{v || <Text type="secondary">—</Text>}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text>
        </div>
      ),
    },
    {
      title: 'Rol', dataIndex: 'role', key: 'role',
      render: r => <Tag color={ROLE_COLORS[r]}>{ROLE_LABELS[r]}</Tag>,
      filters: ROLE_OPTIONS.map(o => ({ text: o.label, value: o.value })),
      onFilter: (value, record) => record.role === value,
    },
    {
      title: 'Estado', dataIndex: 'status', key: 'status',
      render: s => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
    },
    { title: 'Alta', dataIndex: 'createdAt', key: 'createdAt' },
    {
      title: '', key: 'actions', width: 50,
      render: (_, record) => (
        <Tooltip title="Editar rol">
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
        </Tooltip>
      ),
    },
  ]

  const adminCount = users.filter(u => u.role === 'admin').length
  const pendingCount = users.filter(u => u.status === 'pending').length

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Equipo</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openInvite}
          style={{ background: '#F65C7C', borderColor: '#F65C7C' }}>
          Invitar usuario
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Text type="secondary">{users.length} usuario(s) · {adminCount} admin · {pendingCount} pendiente(s)</Text>
      </Space>

      <Table
        dataSource={users}
        columns={columns}
        rowKey="id"
        size="middle"
        pagination={false}
      />

      <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(0,0,0,0.03)', borderRadius: 6, fontSize: 12 }}>
        <Text type="secondary">
          <strong>Admin:</strong> acceso completo — alta, edición, bloqueo de licencias y gestión de equipo.
          &nbsp;·&nbsp;
          <strong>Marketing:</strong> solo lectura — puede ver empresas, licencias, historial y eventos.
        </Text>
      </div>

      <Modal
        title={editing ? `Editar: ${editing.email}` : 'Invitar usuario'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Guardar cambios' : 'Enviar invitación'}
        okButtonProps={{ style: { background: '#F65C7C', borderColor: '#F65C7C' } }}
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {!editing && (
            <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email', message: 'Email inválido' }]}>
              <Input placeholder="usuario@empresa.com" />
            </Form.Item>
          )}
          <Form.Item name="displayName" label="Nombre">
            <Input placeholder="Nombre y apellido" />
          </Form.Item>
          <Form.Item name="role" label="Rol" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
