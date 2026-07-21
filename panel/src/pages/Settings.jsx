import { useState } from 'react'
import { Card, Table, Button, Modal, Form, Input, InputNumber, Switch, Typography, Space, Alert, message } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { MODULES, PLANS, DEFAULT_GRACE_HOURS } from '../mock/data'
import { useAppTheme } from '../App'

const { Title, Text } = Typography

export default function Settings() {
  const { dark } = useAppTheme()
  const [modules, setModules] = useState(() => MODULES.map(m => ({ ...m, enabled: true })))
  const [plans, setPlans]     = useState(PLANS)
  const [defaultGrace, setDefaultGrace] = useState(DEFAULT_GRACE_HOURS)
  const [graceChanged, setGraceChanged] = useState(false)

  const [moduleModal, setModuleModal] = useState(false)
  const [editingModule, setEditingModule] = useState(null)
  const [moduleForm] = Form.useForm()

  const [planModal, setPlanModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [planForm] = Form.useForm()

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
    moduleForm.validateFields().then(values => {
      if (editingModule) {
        setModules(prev => prev.map(m => m.id === editingModule.id ? { ...m, ...values } : m))
        message.success('Módulo actualizado')
      } else {
        if (modules.find(m => m.id === values.id)) {
          moduleForm.setFields([{ name: 'id', errors: ['Ya existe un módulo con ese ID'] }])
          return
        }
        setModules(prev => [...prev, { ...values }])
        message.success('Módulo creado')
      }
      setModuleModal(false)
    })
  }

  const toggleModule = (id, enabled) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, enabled } : m))
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
    planForm.validateFields().then(values => {
      if (editingPlan) {
        setPlans(prev => prev.map(p => p.value === editingPlan.value ? { ...p, ...values } : p))
        message.success('Plan actualizado')
      } else {
        const id = values.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        setPlans(prev => [...prev, { ...values, value: id }])
        message.success('Plan creado')
      }
      setPlanModal(false)
    })
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
      title: 'Visores por defecto', dataIndex: 'defaultMaxDevices', key: 'devices',
      render: v => v ?? '—',
    },
    { title: 'ID', dataIndex: 'value', key: 'value', render: v => <code style={{ fontSize: 11 }}>{v}</code> },
    {
      title: '', key: 'actions', width: 50,
      render: (_, r) => <Button icon={<EditOutlined />} size="small" onClick={() => openPlanEdit(r)} />,
    },
  ]

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Configuración</Title>
      </div>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
        message="Modo demo — los cambios aplican en esta sesión"
        description="En Etapa 2 estos valores se guardarán en Firestore y se reflejarán en tiempo real en todo el panel."
      />

      <Space direction="vertical" size={20} style={{ width: '100%' }}>

        <Card
          title="Módulos de entrenamiento"
          size="small"
          extra={
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openModuleCreate}
              style={{ background: '#F65C7C', borderColor: '#F65C7C' }}>
              Nuevo módulo
            </Button>
          }
        >
          <Table
            dataSource={modules}
            columns={moduleColumns}
            rowKey="id"
            size="small"
            pagination={false}
          />
        </Card>

        <Card
          title="Planes disponibles"
          size="small"
          extra={
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openPlanCreate}
              style={{ background: '#F65C7C', borderColor: '#F65C7C' }}>
              Nuevo plan
            </Button>
          }
        >
          <Table
            dataSource={plans}
            columns={planColumns}
            rowKey="value"
            size="small"
            pagination={false}
          />
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
                  onClick={() => { message.success('Configuración guardada'); setGraceChanged(false) }}
                  style={graceChanged
                    ? { background: '#F65C7C', borderColor: '#F65C7C' }
                    : dark
                      ? { background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.25)' }
                      : { background: 'rgba(0,0,0,0.04)', borderColor: 'rgba(0,0,0,0.15)', color: 'rgba(0,0,0,0.25)' }
                  }
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
        okButtonProps={{ style: { background: '#F65C7C', borderColor: '#F65C7C' } }}
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
        okButtonProps={{ style: { background: '#F65C7C', borderColor: '#F65C7C' } }}
        cancelText="Cancelar"
      >
        <Form form={planForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="label" label="Nombre del plan" rules={[{ required: true }]}>
            <Input placeholder="ej: 6 meses · 3 visores" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="durationMonths" label="Duración (meses)">
              <InputNumber min={1} max={36} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="defaultMaxDevices" label="Visores por defecto">
              <InputNumber min={1} max={50} style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
