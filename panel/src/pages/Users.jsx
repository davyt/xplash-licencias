import { useState, useMemo } from 'react'
import { Table, Button, Tag, Input, Select, Modal, Form, Switch, Typography, Space,
         Tooltip, message, Popconfirm, Spin } from 'antd'
import { PlusOutlined, EditOutlined, StopOutlined, CheckCircleOutlined, GlobalOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useCollection } from '../hooks/useCollection'
import { useRole } from '../hooks/useRole'

dayjs.extend(relativeTime)
const { Title, Text } = Typography

function toDate(v) { return v?.toDate ? v.toDate() : v ? new Date(v) : null }

export default function Users() {
  const role      = useRole()
  const [users,     loadingU] = useCollection('users')
  const [companies, loadingC] = useCollection('companies')

  const [search, setSearch]             = useState('')
  const [filterGlobal, setFilterGlobal] = useState(null)
  const [filterStatus, setFilterStatus] = useState(null)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editing, setEditing]           = useState(null)
  const [saving, setSaving]             = useState(false)
  const [blocking, setBlocking]         = useState(null)
  const [form] = Form.useForm()

  const companyById = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter(u => {
      if (filterStatus !== null && u.status !== filterStatus) return false
      if (filterGlobal !== null && !!u.isGlobal !== filterGlobal) return false
      if (q && !u.metaUsername?.toLowerCase().includes(q) &&
               !(u.name  || '').toLowerCase().includes(q) &&
               !(u.email || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [users, filterStatus, filterGlobal, search])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: 'active', isGlobal: false })
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      name:      record.name,
      email:     record.email,
      companyId: record.companyId || undefined,
      isGlobal:  record.isGlobal,
      status:    record.status,
    })
    setModalOpen(true)
  }

  const handleSave = () => {
    form.validateFields().then(async values => {
      setSaving(true)
      try {
        if (editing) {
          await updateDoc(doc(db, 'users', editing.id), {
            name:      values.name,
            email:     values.email || null,
            companyId: values.companyId || null,
            isGlobal:  values.isGlobal ?? false,
            status:    values.status,
          })
          message.success('Usuario actualizado')
        } else {
          // Doc ID = metaUsername (único e inmutable)
          const username = values.metaUsername.trim()
          await setDoc(doc(collection(db, 'users'), username), {
            metaUsername: username,
            metaUserId:   null,
            name:         values.name,
            email:        values.email || null,
            companyId:    values.companyId || null,
            isGlobal:     values.isGlobal ?? false,
            status:       values.status,
            createdAt:    new Date(),
            lastSeenAt:   null,
          })
          message.success('Usuario creado')
        }
        setModalOpen(false)
      } catch (err) {
        console.error(err)
        message.error('No se pudo guardar el usuario')
      } finally {
        setSaving(false)
      }
    })
  }

  const handleDelete = async (record) => {
    try {
      await deleteDoc(doc(db, 'users', record.id))
      message.success(`Usuario ${record.metaUsername} eliminado`)
    } catch (err) {
      console.error(err)
      message.error('No se pudo eliminar el usuario')
    }
  }

  const handleBlockToggle = async (record) => {
    const newStatus = record.status === 'blocked' ? 'active' : 'blocked'
    setBlocking(record.id)
    try {
      await updateDoc(doc(db, 'users', record.id), { status: newStatus })
      message.success(newStatus === 'blocked' ? 'Usuario bloqueado' : 'Usuario desbloqueado')
    } catch (err) {
      console.error(err)
      message.error('No se pudo actualizar el estado')
    } finally {
      setBlocking(null)
    }
  }

  const columns = [
    {
      title: 'Username', key: 'username',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>{r.metaUsername}</div>
          {r.name && <Text type="secondary" style={{ fontSize: 12 }}>{r.name}</Text>}
        </div>
      ),
    },
    { title: 'Email', dataIndex: 'email', key: 'email', render: v => v || <span style={{ color: '#bbb' }}>—</span> },
    {
      title: 'Empresa', key: 'company',
      render: (_, r) => companyById[r.companyId]?.name || <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: 'Tipo', key: 'global',
      render: (_, r) => r.isGlobal
        ? <Tag icon={<GlobalOutlined />} color="geekblue">Global</Tag>
        : <Tag color="default">Estándar</Tag>,
    },
    {
      title: 'Estado', dataIndex: 'status', key: 'status',
      render: s => s === 'blocked'
        ? <Tag color="error">Bloqueado</Tag>
        : <Tag color="success">Activo</Tag>,
    },
    {
      title: 'Meta User ID', dataIndex: 'metaUserId', key: 'mid',
      render: v => v
        ? <code style={{ fontSize: 11, color: '#888' }}>{v}</code>
        : <span style={{ color: '#ccc', fontSize: 12 }}>pendiente</span>,
    },
    {
      title: 'Último acceso', dataIndex: 'lastSeenAt', key: 'last',
      render: v => v ? dayjs(toDate(v)).fromNow() : <span style={{ color: '#bbb' }}>—</span>,
    },
    ...(role === 'admin' ? [{
      title: '', key: 'actions', width: 110,
      render: (_, record) => {
        const isBlocked = record.status === 'blocked'
        return (
          <Space>
            <Tooltip title="Editar">
              <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
            </Tooltip>
            <Popconfirm
              title={isBlocked ? '¿Desbloquear?' : '¿Bloquear?'}
              description={isBlocked
                ? 'El usuario podrá volver a validar.'
                : 'El usuario no podrá acceder hasta ser desbloqueado.'}
              onConfirm={() => handleBlockToggle(record)}
              okText={isBlocked ? 'Desbloquear' : 'Bloquear'}
              cancelText="Cancelar"
              okButtonProps={{ danger: !isBlocked }}
            >
              <Tooltip title={isBlocked ? 'Desbloquear' : 'Bloquear'}>
                <Button
                  icon={isBlocked ? <CheckCircleOutlined /> : <StopOutlined />}
                  size="small"
                  loading={blocking === record.id}
                  danger={!isBlocked}
                />
              </Tooltip>
            </Popconfirm>
            <Popconfirm
              title="¿Eliminar usuario?"
              description="Esta acción no se puede deshacer."
              onConfirm={() => handleDelete(record)}
              okText="Eliminar"
              okButtonProps={{ danger: true }}
              cancelText="Cancelar"
            >
              <Tooltip title="Eliminar">
                <Button icon={<DeleteOutlined />} size="small" danger />
              </Tooltip>
            </Popconfirm>
          </Space>
        )
      },
    }] : []),
  ]

  if (loadingU || loadingC) return <Spin style={{ display: 'block', margin: '80px auto' }} />

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Usuarios</Title>
        {role === 'admin' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Nuevo usuario</Button>
        )}
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select value={filterGlobal === null ? '' : String(filterGlobal)} style={{ width: 160 }}
          onChange={v => setFilterGlobal(v === '' ? null : v === 'true')}
          options={[
            { value: '',      label: 'Todos los tipos' },
            { value: 'true',  label: 'Global' },
            { value: 'false', label: 'Estándar' },
          ]} />
        <Select value={filterStatus || ''} style={{ width: 160 }}
          onChange={v => setFilterStatus(v || null)}
          options={[
            { value: '',        label: 'Todos los estados' },
            { value: 'active',  label: 'Activo' },
            { value: 'blocked', label: 'Bloqueado' },
          ]} />
        <Input placeholder="Buscar username, nombre o email..."
          value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} allowClear />
      </Space>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        size="middle"
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 15, showTotal: (t, r) => `${r[0]}–${r[1]} de ${t}` }}
      />

      <Modal
        title={editing ? `Editar: ${editing.metaUsername}` : 'Nuevo usuario'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Guardar cambios' : 'Crear usuario'}
        okButtonProps={{ loading: saving }}
        cancelText="Cancelar"
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {!editing && (
            <Form.Item
              name="metaUsername"
              label="Meta Username"
              rules={[{ required: true, message: 'Requerido' }, { min: 2, max: 64 }]}
              help="Nombre de usuario de Meta Horizon. Exacto, sensible a mayúsculas. No se puede cambiar después."
            >
              <Input placeholder="ej: XplashDev" style={{ fontFamily: 'monospace' }} />
            </Form.Item>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
              <Input placeholder="Nombre completo" />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input type="email" placeholder="email@ejemplo.com" />
            </Form.Item>
          </div>
          <Form.Item name="companyId" label="Empresa (opcional)">
            <Select
              placeholder="Sin empresa asignada"
              allowClear
              options={companies.map(c => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="status" label="Estado">
              <Select options={[{ value: 'active', label: 'Activo' }, { value: 'blocked', label: 'Bloqueado' }]} />
            </Form.Item>
            {role === 'admin' && (
              <Form.Item name="isGlobal" label="Acceso global" valuePropName="checked"
                help="Permite acceder a todas las apps sin estar en una licencia">
                <Switch checkedChildren="Sí" unCheckedChildren="No" />
              </Form.Item>
            )}
          </div>
        </Form>
      </Modal>
    </div>
  )
}
