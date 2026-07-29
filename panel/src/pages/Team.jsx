import { useState, useEffect } from 'react'
import { Table, Button, Tag, Modal, Form, Input, Select, Typography, Space,
         Popconfirm, message, Spin, Alert, Tooltip } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, LinkOutlined, ReloadOutlined } from '@ant-design/icons'
import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '../firebase'
import { useRole } from '../hooks/useRole'

const { Title, Text, Paragraph } = Typography

const ROLE_OPTIONS = [
  { value: 'admin',     label: 'Admin'     },
  { value: 'marketing', label: 'Marketing' },
]

const fn = {
  list:   httpsCallable(functions, 'listTeamUsers'),
  invite: httpsCallable(functions, 'inviteTeamUser'),
  update: httpsCallable(functions, 'updateTeamUser'),
  remove: httpsCallable(functions, 'deleteTeamUser'),
  resend: httpsCallable(functions, 'resendActivationLink'),
}

export default function Team() {
  const role    = useRole()
  const isAdmin = role === 'admin'

  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editUser, setEditUser]     = useState(null)
  const [linkModal, setLinkModal]   = useState(null)
  const [saving, setSaving]         = useState(false)
  const [resending, setResending]   = useState(null)
  const [inviteForm] = Form.useForm()
  const [editForm]   = Form.useForm()

  const currentUid = auth.currentUser?.uid

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fn.list()
      setUsers(res.data?.users || res.data || [])
    } catch (err) {
      console.error('listTeamUsers:', err)
      setError('No se pudieron cargar los usuarios. ' + (err.message || ''))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const handleInvite = () => {
    inviteForm.validateFields().then(async values => {
      setSaving(true)
      try {
        const res = await fn.invite({
          email: values.email,
          displayName: values.displayName,
          role: values.role,
        })
        const link = res.data?.link || res.data?.inviteLink || null
        message.success(`Usuario ${values.email} invitado`)
        setInviteOpen(false)
        inviteForm.resetFields()
        await loadUsers()
        if (link) setLinkModal({ email: values.email, link })
      } catch (err) {
        console.error('inviteTeamUser:', err)
        message.error(err.message || 'No se pudo invitar el usuario')
      } finally {
        setSaving(false)
      }
    })
  }

  const handleUpdateRole = () => {
    editForm.validateFields().then(async values => {
      setSaving(true)
      try {
        await fn.update({ uid: editUser.uid, role: values.role })
        message.success('Rol actualizado')
        setEditUser(null)
        await loadUsers()
      } catch (err) {
        console.error('updateTeamUser:', err)
        message.error(err.message || 'No se pudo actualizar el rol')
      } finally {
        setSaving(false)
      }
    })
  }

  const handleDelete = async (user) => {
    try {
      await fn.remove({ uid: user.uid })
      message.success(`${user.email} eliminado`)
      await loadUsers()
    } catch (err) {
      console.error('deleteTeamUser:', err)
      message.error(err.message || 'No se pudo eliminar el usuario')
    }
  }

  const handleResend = async (user) => {
    setResending(user.uid)
    try {
      const res = await fn.resend({ uid: user.uid })
      const raw = res.data
      const link = raw?.result?.activationLink || raw?.activationLink || null
      if (link) {
        setLinkModal({ email: user.email, link })
      } else {
        message.warning('La función no devolvió un link de activación.')
      }
    } catch (err) {
      console.error('resendActivationLink:', err)
      message.error(err.message || 'No se pudo generar el link')
    } finally {
      setResending(null)
    }
  }

  const columns = [
    {
      title: 'Nombre', dataIndex: 'displayName', key: 'name',
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{v || '—'}</div>
          {r.uid === currentUid && (
            <Text type="secondary" style={{ fontSize: 11 }}>Vos</Text>
          )}
        </div>
      ),
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Rol', dataIndex: 'role', key: 'role',
      render: r => r === 'admin'
        ? <Tag color="blue">Admin</Tag>
        : r === 'marketing'
          ? <Tag color="green">Marketing</Tag>
          : <Tag color="default">{r || '—'}</Tag>,
      filters: ROLE_OPTIONS.map(o => ({ text: o.label, value: o.value })),
      onFilter: (value, record) => record.role === value,
    },
    {
      title: 'Estado', key: 'status',
      render: (_, r) => r.lastSignInAt
        ? <Tag color="success">Activo</Tag>
        : <Tag color="warning">Pendiente</Tag>,
    },
    ...(isAdmin ? [{
      title: '', key: 'actions', width: 150,
      render: (_, record) => {
        const isSelf = record.uid === currentUid
        return (
          <Space>
            <Tooltip title="Cambiar rol">
              <Button
                icon={<EditOutlined />}
                size="small"
                disabled={isSelf}
                onClick={() => {
                  setEditUser(record)
                  editForm.setFieldsValue({ role: record.role })
                }}
              />
            </Tooltip>
            <Tooltip title="Generar link de activación">
              <Button
                icon={<LinkOutlined />}
                size="small"
                loading={resending === record.uid}
                onClick={() => handleResend(record)}
              />
            </Tooltip>
            <Popconfirm
              title={`¿Eliminar a ${record.email}?`}
              description="Se revocará su acceso al panel de inmediato."
              onConfirm={() => handleDelete(record)}
              okText="Eliminar"
              okButtonProps={{ danger: true }}
              cancelText="Cancelar"
              disabled={isSelf}
            >
              <Tooltip title={isSelf ? 'No podés eliminarte a vos mismo' : 'Eliminar'}>
                <Button
                  icon={<DeleteOutlined />}
                  size="small"
                  danger
                  disabled={isSelf}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        )
      },
    }] : []),
  ]

  if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Equipo</Title>
        <Space>
          <Tooltip title="Recargar lista">
            <Button icon={<ReloadOutlined />} onClick={loadUsers} />
          </Tooltip>
          {isAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { inviteForm.resetFields(); setInviteOpen(true) }}
            >
              Invitar usuario
            </Button>
          )}
        </Space>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={loadUsers}>Reintentar</Button>}
        />
      )}

      <Table
        dataSource={users}
        columns={columns}
        rowKey="uid"
        size="middle"
        pagination={false}
        locale={{ emptyText: 'Sin usuarios cargados.' }}
      />

      <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(0,0,0,0.03)', borderRadius: 6, fontSize: 12 }}>
        <Text type="secondary">
          <strong>Admin:</strong> acceso completo — alta, edición, bloqueo de licencias y gestión de equipo.
          &nbsp;·&nbsp;
          <strong>Marketing:</strong> solo lectura — puede ver empresas, licencias, historial y eventos.
        </Text>
      </div>

      {/* Modal invitar */}
      <Modal
        title="Invitar usuario"
        open={inviteOpen}
        onOk={handleInvite}
        onCancel={() => setInviteOpen(false)}
        okText="Enviar invitación"
        okButtonProps={{ loading: saving }}
        cancelText="Cancelar"
        width={480}
      >
        <Form form={inviteForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="displayName" label="Nombre completo" rules={[{ required: true }]}>
            <Input placeholder="Nombre y apellido" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true }, { type: 'email', message: 'Email inválido' }]}
          >
            <Input placeholder="usuario@xplash.com" />
          </Form.Item>
          <Form.Item
            name="role"
            label="Rol"
            rules={[{ required: true }]}
            help="Admin: acceso completo. Marketing: solo lectura."
          >
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal editar rol */}
      <Modal
        title={editUser ? `Cambiar rol — ${editUser.email}` : ''}
        open={!!editUser}
        onOk={handleUpdateRole}
        onCancel={() => setEditUser(null)}
        okText="Guardar"
        okButtonProps={{ loading: saving }}
        cancelText="Cancelar"
        width={360}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="role" label="Nuevo rol" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal link de activación */}
      <Modal
        title={linkModal ? `Link de activación — ${linkModal.email}` : ''}
        open={!!linkModal}
        onCancel={() => setLinkModal(null)}
        footer={<Button type="primary" onClick={() => setLinkModal(null)}>Cerrar</Button>}
        width={560}
      >
        {linkModal && (
          <div style={{ marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Enviá este link al usuario. Expira en 24 horas y solo puede usarse una vez.
            </Text>
            <Paragraph
              copyable={{ tooltips: ['Copiar link', 'Copiado'] }}
              style={{
                marginTop: 12,
                fontFamily: 'monospace',
                fontSize: 12,
                background: 'var(--ant-color-bg-layout, #f5f5f5)',
                padding: '10px 14px',
                borderRadius: 6,
                wordBreak: 'break-all',
              }}
            >
              {linkModal.link}
            </Paragraph>
          </div>
        )}
      </Modal>
    </div>
  )
}
