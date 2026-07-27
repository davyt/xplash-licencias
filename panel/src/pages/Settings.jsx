import { useState, useEffect } from 'react'
import { Card, Table, Button, Modal, Form, Input, InputNumber, Switch, Typography, Space, Spin, message } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { MODULES as DEFAULT_MODULES, PLANS as DEFAULT_PLANS, DEFAULT_GRACE_HOURS } from '../mock/data'

const { Title } = Typography

const SETTINGS_REF = doc(db, 'settings', 'global')

async function persistSettings(patch) {
  await setDoc(SETTINGS_REF, patch, { merge: true })
}

export default function Settings() {
  const [loading, setLoading]       = useState(true)
  const [modules, setModules]       = useState(DEFAULT_MODULES.map(m => ({ ...m, enabled: true })))
  const [plans, setPlans]           = useState(DEFAULT_PLANS)
  const [defaultGrace, setDefaultGrace] = useState(DEFAULT_GRACE_HOURS)
  const [graceChanged, setGraceChanged] = useState(false)
  const [graceSaving, setGraceSaving]   = useState(false)

  const [moduleModal, setModuleModal]   = useState(false)
  const [editingModule, setEditingModule] = useState(null)
  const [moduleForm] = Form.useForm()

  const [planModal, setPlanModal]   = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [planForm] = Form.useForm()

  useEffect(() => {
    getDoc(SETTINGS_REF)
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data()
          if (data.modules?.length)                    setModules(data.modules)
          if (data.plans?.length)                      setPlans(data.plans)
          if (typeof data.defaultGraceHours === 'number') setDefaultGrace(data.defaultGraceHours)
        }
      })
      .catch(err => console.error('Error cargando configuración:', err))
      .finally(() => setLoading(false))
  }, [])

  // — Módulos —
  const openModuleCreate = () => {
    setEditingModule(null)
    moduleForm.resetFields()
    moduleForm.setFieldsValue({ enabled: true })
    setModuleModal(true)
  }

  const openModuleEdit = (record) => {
    setEditingModule(record)
    moduleForm.setFieldsValue(record)
    setModuleModal(true)
  }

  const handleModuleSave = () => {
    moduleForm.validateFields().then(async values => {
      let newModules
      if (editingModule) {
        newModules = modules.map(m => m.id === editingModule.id ? { ...m, ...values } : m)
      } else {
        if (modules.find(m => m.id === values.id)) {
          moduleForm.setFields([{ name: 'id', errors: ['Ya existe un módulo con ese ID'] }])
          return
        }
        newModules = [...modules, { ...values }]
      }
      try {
        await persistSettings({ modules: newModules })
        setModules(newModules)
        message.success(editingModule ? 'Módulo actualizado' : 'Módulo creado')
        setModuleModal(false)
      } catch (err) {
        console.error(err)
        message.error('No se pudo guardar el módulo')
      }
    })
  }

  const toggleModule = async (id, enabled) => {
    const newModules = modules.map(m => m.id === id ? { ...m, enabled } : m)
    setModules(newModules)
    persistSettings({ modules: newModules }).catch(() => {
      setModules(modules)
      message.error('No se pudo guardar')
    })
  }

  // — Planes —
  const openPlanCreate = () => {
    setEditingPlan(null)
    planForm.resetFields()
    setPlanModal(true)
  }

  const openPlanEdit = (record) => {
    setEditingPlan(record)
    planForm.setFieldsValue(record)
    setPlanModal(true)
  }

  const handlePlanSave = () => {
    planForm.validateFields().then(async values => {
      let newPlans
      if (editingPlan) {
        newPlans = plans.map(p => p.value === editingPlan.value ? { ...p, ...values } : p)
      } else {
        const id = values.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        newPlans = [...plans, { ...values, value: id }]
      }
      try {
        await persistSettings({ plans: newPlans })
        setPlans(newPlans)
        message.success(editingPlan ? 'Plan actualizado' : 'Plan creado')
        setPlanModal(false)
      } catch (err) {
        console.error(err)
        message.error('No se pudo guardar el plan')
      }
    })
  }

  const handleGraceSave = async () => {
    setGraceSaving(true)
    try {
      await persistSettings({ defaultGraceHours: defaultGrace })
      message.success('Configuración guardada')
      setGraceChanged(false)
    } catch (err) {
      console.error(err)
      message.error('No se pudo guardar')
    } finally {
      setGraceSaving(false)
    }
  }

  const moduleColumns = [
    {
      title: 'Activo', dataIndex: 'enabled', key: 'enabled', width: 70,
      render: (v, r) => <Switch size="small" checked={v} onChange={checked => toggleModule(r.id, checked)} />,
    },
    { title: 'Nombre', dataIndex: 'label', key: 'label' },
    { title: 'ID', dataIndex: 'id', key: 'id', render: v => <code style={{ fontSize: 12 }}>{v}</code> },
    {
      title: '', key: 'actions', width: 50,
      render: (_, r) => <Button icon={<EditOutlined />} size="small" onClick={() => openModuleEdit(r)} />,
    },
  ]

  const planColumns = [
    { title: 'Nombre', dataIndex: 'label', key: 'label' },
    {
      title: 'Duración', dataIndex: 'durationMonths', key: 'duration',
      render: v => v ? `${v} mes${v > 1 ? 'es' : ''}` : '—',
    },
    {
      title: 'Usuarios por defecto', dataIndex: 'defaultMaxUsers', key: 'users',
      render: v => v ?? '—',
    },
    { title: 'ID', dataIndex: 'value', key: 'value', render: v => <code style={{ fontSize: 11 }}>{v}</code> },
    {
      title: '', key: 'actions', width: 50,
      render: (_, r) => <Button icon={<EditOutlined />} size="small" onClick={() => openPlanEdit(r)} />,
    },
  ]

  if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Configuración</Title>
      </div>

      <Space direction="vertical" size={20} style={{ width: '100%' }}>

        <Card
          title="Módulos de entrenamiento"
          size="small"
          extra={
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openModuleCreate}>
              Nuevo módulo
            </Button>
          }
        >
          <Table dataSource={modules} columns={moduleColumns} rowKey="id" size="small" pagination={false} />
        </Card>

        <Card
          title="Planes disponibles"
          size="small"
          extra={
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openPlanCreate}>
              Nuevo plan
            </Button>
          }
        >
          <Table dataSource={plans} columns={planColumns} rowKey="value" size="small" pagination={false} />
        </Card>

        <Card title="Parámetros globales" size="small">
          <Form layout="vertical" style={{ maxWidth: 420 }}>
            <Form.Item
              label="Grace period por defecto"
              help="Tiempo offline permitido al crear una licencia nueva. Se puede ajustar por licencia individualmente."
            >
              <Space>
                <InputNumber
                  min={0} max={720}
                  value={defaultGrace}
                  onChange={v => { setDefaultGrace(v); setGraceChanged(true) }}
                  addonAfter="horas"
                  style={{ width: 180 }}
                />
                <Button
                  type="primary"
                  disabled={!graceChanged}
                  loading={graceSaving}
                  onClick={handleGraceSave}
                >
                  Guardar
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

      </Space>

      {/* Modal módulos */}
      <Modal
        title={editingModule ? `Editar: ${editingModule.label}` : 'Nuevo módulo'}
        open={moduleModal}
        onOk={handleModuleSave}
        onCancel={() => setModuleModal(false)}
        okText={editingModule ? 'Guardar cambios' : 'Crear módulo'}
        cancelText="Cancelar"
      >
        <Form form={moduleForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="id" label="ID (snake_case)"
            rules={[
              { required: true },
              { pattern: /^[a-z][a-z0-9_]*$/, message: 'Solo minúsculas, números y guion bajo' },
            ]}
          >
            <Input placeholder="ej: trabajo_en_altura" disabled={!!editingModule} />
          </Form.Item>
          <Form.Item name="label" label="Nombre para mostrar" rules={[{ required: true }]}>
            <Input placeholder="ej: Trabajo en altura" />
          </Form.Item>
          <Form.Item name="enabled" label="Estado" valuePropName="checked">
            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal planes */}
      <Modal
        title={editingPlan ? `Editar: ${editingPlan.label}` : 'Nuevo plan'}
        open={planModal}
        onOk={handlePlanSave}
        onCancel={() => setPlanModal(false)}
        okText={editingPlan ? 'Guardar cambios' : 'Crear plan'}
        cancelText="Cancelar"
      >
        <Form form={planForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="label" label="Nombre del plan" rules={[{ required: true }]}>
            <Input placeholder="ej: 6 meses · 3 usuarios" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="durationMonths" label="Duración (meses)">
              <InputNumber min={1} max={36} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="defaultMaxUsers" label="Usuarios por defecto">
              <InputNumber min={1} max={50} style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
