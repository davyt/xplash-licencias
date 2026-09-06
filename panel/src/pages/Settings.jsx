import { useState, useEffect } from 'react'
import { Card, Table, Button, Modal, Form, Input, InputNumber, Switch, Typography, Space, Spin, message, Tag, Divider } from 'antd'
import { PlusOutlined, EditOutlined, MailOutlined } from '@ant-design/icons'
import { doc, getDoc, setDoc, collection, addDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useCollection } from '../hooks/useCollection'
import { MODULES as MOCK_MODULES, PLANS as DEFAULT_PLANS, DEFAULT_GRACE_HOURS } from '../mock/data'

const { Title } = Typography

const SETTINGS_REF = doc(db, 'settings', 'global')

const DEFAULT_NOTIFICATIONS = {
  nearExpiry: { enabled: false, emails: '', daysBeforeExpiry: 3 },
  expired:    { enabled: false, emails: '' },
  blocked:    { enabled: false, emails: '' },
}

const NOTIFICATION_TYPES = [
  { key: 'nearExpiry', label: 'Licencia próxima a vencer',  desc: 'Se envía N días antes del vencimiento.' },
  { key: 'expired',    label: 'Licencia vencida',           desc: 'Se envía el día en que la licencia vence.' },
  { key: 'blocked',    label: 'Licencia bloqueada',         desc: 'Se envía al bloquear una licencia manualmente.' },
]

async function persistSettings(patch) {
  await setDoc(SETTINGS_REF, patch, { merge: true })
}

export default function Settings() {
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [plans, setPlans]                     = useState(DEFAULT_PLANS)
  const [defaultGrace, setDefaultGrace]       = useState(DEFAULT_GRACE_HOURS)
  const [graceChanged, setGraceChanged]       = useState(false)
  const [graceSaving, setGraceSaving]         = useState(false)
  const [notifications, setNotifications]     = useState(DEFAULT_NOTIFICATIONS)
  const [notifChanged, setNotifChanged]       = useState(false)
  const [notifSaving, setNotifSaving]         = useState(false)

  // Módulos vienen de la colección Firestore 'modules', no de settings/global
  const [modules, loadingModules] = useCollection('modules')
  const allModules = modules.length ? modules : MOCK_MODULES

  const [moduleModal, setModuleModal]     = useState(false)
  const [editingModule, setEditingModule] = useState(null)
  const [moduleForm] = Form.useForm()

  const [planModal, setPlanModal]     = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [planForm] = Form.useForm()

  useEffect(() => {
    getDoc(SETTINGS_REF)
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data()
          if (data.plans?.length)                         setPlans(data.plans)
          if (typeof data.defaultGraceHours === 'number') setDefaultGrace(data.defaultGraceHours)
          if (data.notifications)                         setNotifications({ ...DEFAULT_NOTIFICATIONS, ...data.notifications })
        }
      })
      .catch(err => console.error('Error cargando configuración:', err))
      .finally(() => setLoadingSettings(false))
  }, [])

  // — Módulos (Firestore collection 'modules') —
  const openModuleCreate = () => {
    setEditingModule(null)
    moduleForm.resetFields()
    moduleForm.setFieldsValue({ status: 'active' })
    setModuleModal(true)
  }

  const openModuleEdit = (record) => {
    setEditingModule(record)
    moduleForm.setFieldsValue({ name: record.name || record.label, status: record.status ?? 'active' })
    setModuleModal(true)
  }

  const handleModuleSave = () => {
    moduleForm.validateFields().then(async values => {
      try {
        if (editingModule) {
          await updateDoc(doc(db, 'modules', editingModule.id), {
            name:   values.name,
            status: values.status,
          })
          message.success('Módulo actualizado')
        } else {
          const licenseCode = values.licenseCode.toUpperCase().trim()
          await setDoc(doc(collection(db, 'modules'), licenseCode), {
            licenseCode,
            name:      values.name,
            status:    values.status,
            createdAt: new Date(),
          })
          message.success('Módulo creado')
        }
        setModuleModal(false)
      } catch (err) {
        console.error(err)
        message.error('No se pudo guardar el módulo')
      }
    })
  }

  // — Planes (settings/global) —
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

  const patchNotif = (key, field, value) => {
    setNotifications(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
    setNotifChanged(true)
  }

  const handleNotifSave = async () => {
    setNotifSaving(true)
    try {
      await persistSettings({ notifications })
      message.success('Configuración de notificaciones guardada')
      setNotifChanged(false)
    } catch (err) {
      message.error('No se pudo guardar')
    } finally {
      setNotifSaving(false)
    }
  }

  const handleGraceSave = async () => {
    setGraceSaving(true)
    try {
      await persistSettings({ defaultGraceHours: defaultGrace })
      message.success('Configuración guardada')
      setGraceChanged(false)
    } catch (err) {
      message.error('No se pudo guardar')
    } finally {
      setGraceSaving(false)
    }
  }

  const moduleColumns = [
    {
      title: 'LicenseCode', key: 'licenseCode',
      render: (_, r) => <code style={{ fontSize: 12 }}>{r.licenseCode || r.id}</code>,
    },
    { title: 'Nombre', key: 'name', render: (_, r) => r.name || r.label },
    {
      title: 'Estado', dataIndex: 'status', key: 'status',
      render: v => v === 'active'
        ? <Tag color="success">Activo</Tag>
        : <Tag color="default">Inactivo</Tag>,
    },
    {
      title: '', key: 'actions', width: 50,
      render: (_, r) => <Button icon={<EditOutlined />} size="small" onClick={() => openModuleEdit(r)} />,
    },
  ]

  const planColumns = [
    { title: 'Nombre', dataIndex: 'label', key: 'label' },
    {
      title: 'Duración', key: 'duration',
      render: (_, r) => r.durationDays ? `${r.durationDays} día${r.durationDays > 1 ? 's' : ''}` : r.durationMonths ? `${r.durationMonths} mes${r.durationMonths > 1 ? 'es' : ''}` : '—',
    },
    { title: 'ID', dataIndex: 'value', key: 'value', render: v => <code style={{ fontSize: 11 }}>{v}</code> },
    {
      title: '', key: 'actions', width: 50,
      render: (_, r) => <Button icon={<EditOutlined />} size="small" onClick={() => openPlanEdit(r)} />,
    },
  ]

  if (loadingSettings) return <Spin style={{ display: 'block', margin: '80px auto' }} />

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Configuración</Title>
      </div>

      <Space direction="vertical" size={20} style={{ width: '100%' }}>

        <Card
          title="Módulos / Apps"
          size="small"
          extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={openModuleCreate}>Nuevo módulo</Button>}
        >
          <Table
            dataSource={allModules}
            columns={moduleColumns}
            rowKey="id"
            size="small"
            pagination={false}
            loading={loadingModules && modules.length === 0}
          />
        </Card>

        <Card
          title="Planes disponibles"
          size="small"
          extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={openPlanCreate}>Nuevo plan</Button>}
        >
          <Table dataSource={plans} columns={planColumns} rowKey="value" size="small" pagination={false} />
        </Card>

        <Card
          title={<Space><MailOutlined />Notificaciones por email</Space>}
          size="small"
          extra={
            <Button type="primary" size="small" disabled={!notifChanged} loading={notifSaving} onClick={handleNotifSave}>
              Guardar cambios
            </Button>
          }
        >
          <div style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)', marginBottom: 16 }}>
            Las notificaciones se envían cuando el sistema de emails esté configurado. Podés preparar los destinatarios y activarlas ahora.
          </div>
          {NOTIFICATION_TYPES.map((type, idx) => {
            const cfg = notifications[type.key]
            return (
              <div key={type.key}>
                {idx > 0 && <Divider style={{ margin: '12px 0' }} />}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <Switch
                    checked={cfg.enabled}
                    onChange={v => patchNotif(type.key, 'enabled', v)}
                    style={{ marginTop: 3, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: 2 }}>{type.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)', marginBottom: 8 }}>
                      {type.desc}
                      {type.key === 'nearExpiry' && (
                        <span style={{ marginLeft: 8 }}>
                          Días de anticipación:{' '}
                          <InputNumber
                            min={1} max={30}
                            size="small"
                            value={cfg.daysBeforeExpiry}
                            onChange={v => patchNotif(type.key, 'daysBeforeExpiry', v)}
                            style={{ width: 60 }}
                          />
                        </span>
                      )}
                    </div>
                    <Input
                      placeholder="correo@empresa.com, otro@empresa.com"
                      value={cfg.emails}
                      onChange={e => patchNotif(type.key, 'emails', e.target.value)}
                      size="small"
                      disabled={!cfg.enabled}
                      style={{ maxWidth: 480 }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
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
                <Button type="primary" disabled={!graceChanged} loading={graceSaving} onClick={handleGraceSave}>
                  Guardar
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

      </Space>

      {/* Modal módulos */}
      <Modal
        title={editingModule ? `Editar: ${editingModule.name || editingModule.label}` : 'Nuevo módulo'}
        open={moduleModal}
        onOk={handleModuleSave}
        onCancel={() => setModuleModal(false)}
        okText={editingModule ? 'Guardar cambios' : 'Crear módulo'}
        cancelText="Cancelar"
      >
        <Form form={moduleForm} layout="vertical" style={{ marginTop: 16 }}>
          {!editingModule && (
            <Form.Item
              name="licenseCode"
              label="LicenseCode"
              rules={[
                { required: true },
                { pattern: /^XPL-[A-Z0-9]+$/, message: 'Formato XPL-XX (ej: XPL-DC)' },
              ]}
              help="Se hardcodea en el build de la app. No se puede cambiar una vez publicado."
            >
              <Input placeholder="ej: XPL-DC" style={{ fontFamily: 'monospace', textTransform: 'uppercase' }} />
            </Form.Item>
          )}
          <Form.Item name="name" label="Nombre para mostrar" rules={[{ required: true }]}>
            <Input placeholder="ej: Derrame de combustible" />
          </Form.Item>
          <Form.Item name="status" label="Estado" valuePropName="checked"
            getValueFromEvent={v => v ? 'active' : 'inactive'}
            getValueProps={v => ({ checked: v === 'active' })}>
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
          <Form.Item name="durationMonths" label="Duración (meses)" help="Dejar vacío si el plan se mide en días.">
            <InputNumber min={1} max={36} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="durationDays" label="Duración (días)" help="Solo completar si el plan es menor a 1 mes.">
            <InputNumber min={1} max={30} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
