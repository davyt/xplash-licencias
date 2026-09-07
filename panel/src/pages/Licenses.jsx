import { useState, useMemo } from 'react'
import { Table, Button, Tag, Input, Select, Modal, Form, InputNumber, DatePicker,
         Typography, Space, Tooltip, message, Popconfirm, Radio, Alert, Spin, Drawer } from 'antd'
import { PlusOutlined, EditOutlined, CopyOutlined, StopOutlined, SyncOutlined, InfoCircleOutlined, DeleteOutlined, MobileOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { useCollection } from '../hooks/useCollection'
import { useRole } from '../hooks/useRole'
import { MODULES as MOCK_MODULES, PLANS, STATUS_LABELS } from '../mock/data'

const { Title } = Typography

function toDate(v) { return v?.toDate ? v.toDate() : v ? new Date(v) : null }

export default function Licenses() {
  const role = useRole()
  const [licenses,   loadingL] = useCollection('licenses')
  const [companies,  loadingC] = useCollection('companies')
  const [users,      loadingU] = useCollection('users')
  const [modules,    loadingM] = useCollection('modules')

  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState(null)
  const [filterModule, setFilterModule] = useState(null)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editing, setEditing]           = useState(null)
  const [saving, setSaving]             = useState(false)
  const [form] = Form.useForm()

  const [editExpiry, setEditExpiry]               = useState(null)
  const [editExpiryChanged, setEditExpiryChanged] = useState(false)

  const [renewModal, setRenewModal]   = useState(false)
  const [renewTarget, setRenewTarget] = useState(null)
  const [renewPeriod, setRenewPeriod] = useState('6m')
  const [renewNotes, setRenewNotes]   = useState('')

  const [devDrawer, setDevDrawer]     = useState(false)
  const [devTarget, setDevTarget]     = useState(null)
  const [devices, setDevices]         = useState([])
  const [loadingDevices, setLoadingDevices] = useState(false)

  // Fusionar módulos de Firestore con fallback al mock
  const allModules = useMemo(() => {
    if (modules.length) return modules.map(m => ({ id: m.id, licenseCode: m.licenseCode || m.id, label: m.name || m.label }))
    return MOCK_MODULES
  }, [modules])

  const moduleById      = useMemo(() => Object.fromEntries(allModules.map(m => [m.id, m])), [allModules])
  const companyById     = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies])
  const usersByUsername = useMemo(() => Object.fromEntries(users.map(u => [u.metaUsername || u.id, u])), [users])

  const licensesEnriched = useMemo(() => licenses.map(l => ({
    ...l,
    companyName: l.companyName || companyById[l.companyId]?.name || null,
    moduleName:  moduleById[l.moduleId]?.label || l.moduleId || l.licenseCode,
  })), [licenses, companyById, moduleById])

  const filtered = useMemo(() => licensesEnriched.filter(l => {
    if (filterStatus && l.status !== filterStatus) return false
    if (filterModule && l.moduleId !== filterModule) return false
    if (search) {
      const q = search.toLowerCase()
      if (!l.licenseCode?.toLowerCase().includes(q) &&
          !(l.moduleName || '').toLowerCase().includes(q) &&
          !(l.companyName || '').toLowerCase().includes(q)) return false
    }
    return true
  }), [licensesEnriched, filterStatus, filterModule, search])

  const getRenewBase = (lic) => {
    const exp = toDate(lic.expiresAt)
    if (!exp) return dayjs()
    return dayjs(exp).isBefore(dayjs()) ? dayjs() : dayjs(exp)
  }

  const openDevices = async (record) => {
    setDevTarget(record)
    setDevDrawer(true)
    setLoadingDevices(true)
    try {
      const snap = await getDocs(collection(db, 'licenses', record.id, 'devices'))
      setDevices(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.error(err)
      message.error('No se pudieron cargar los dispositivos')
    } finally {
      setLoadingDevices(false)
    }
  }

  const handleDeviceAction = async (device, action) => {
    const ref = doc(db, 'licenses', devTarget.id, 'devices', device.id)
    try {
      if (action === 'block')   await updateDoc(ref, { status: 'blocked' })
      if (action === 'unblock') await updateDoc(ref, { status: 'active' })
      if (action === 'release') await deleteDoc(ref)
      setDevices(prev =>
        action === 'release'
          ? prev.filter(d => d.id !== device.id)
          : prev.map(d => d.id === device.id ? { ...d, status: action === 'block' ? 'blocked' : 'active' } : d)
      )
      message.success(action === 'release' ? 'Dispositivo liberado' : action === 'block' ? 'Dispositivo bloqueado' : 'Dispositivo desbloqueado')
    } catch (err) {
      message.error('No se pudo realizar la acción')
    }
  }

  const applyPeriod = (base, period) => {
    if (period === '3d') return base.add(3, 'day')
    return base.add(parseInt(period), 'month')
  }

  const openRenew = (record) => { setRenewTarget(record); setRenewPeriod('6m'); setRenewNotes(''); setRenewModal(true) }

  const handleRenew = async () => {
    const base      = getRenewBase(renewTarget)
    const newExpiry = applyPeriod(base, renewPeriod).format('YYYY-MM-DD')
    try {
      await updateDoc(doc(db, 'licenses', renewTarget.id), { expiresAt: newExpiry, status: 'active' })
      await addDoc(collection(db, 'contracts'), {
        companyId: renewTarget.companyId || null,
        plan:      renewTarget.plan || null,
        startDate: base.format('YYYY-MM-DD'),
        endDate:   newExpiry,
        notes:     renewNotes || null,
        createdAt: new Date(),
      })
      message.success(`${renewTarget.licenseCode} renovada hasta ${dayjs(newExpiry).format('DD/MM/YYYY')}`)
      setRenewModal(false)
    } catch (err) {
      console.error(err)
      message.error('No se pudo renovar la licencia')
    }
  }

  const handleDelete = async (record) => {
    try {
      await deleteDoc(doc(db, 'licenses', record.id))
      message.success(`Licencia ${record.licenseCode} eliminada`)
    } catch (err) {
      console.error(err)
      message.error('No se pudo eliminar la licencia')
    }
  }

  const handleBlock = async (record) => {
    try {
      await updateDoc(doc(db, 'licenses', record.id), { status: 'blocked' })
      message.warning(`Licencia ${record.licenseCode} bloqueada`)
    } catch (err) {
      message.error('No se pudo bloquear')
    }
  }

  const copyCode = (code) => { navigator.clipboard.writeText(code); message.success(`Copiado: ${code}`) }

  const openCreate = () => {
    setEditing(null); setEditExpiry(null); setEditExpiryChanged(false)
    form.resetFields()
    form.setFieldsValue({ status: 'draft', offlineGraceHours: 48, userIds: [] })
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    const exp = record.expiresAt ? (toDate(record.expiresAt).toISOString().slice(0, 10)) : null
    setEditExpiry(exp); setEditExpiryChanged(false)
    form.setFieldsValue({
      moduleId:         record.moduleId,
      licenseCode:      record.licenseCode,
      companyId:        record.companyId || undefined,
      status:           record.status,
      plan:             record.plan,
      offlineGraceHours: record.offlineGraceHours ?? 48,
      maxDevices:        record.maxDevices ?? null,
      userIds:          record.userIds || [],
      startDate:        record.startDate ? dayjs(toDate(record.startDate)) : null,
      notes:            record.notes,
    })
    setModalOpen(true)
  }

  const handleValuesChange = (changed, all) => {
    // Auto-set licenseCode from module
    if ('moduleId' in changed && changed.moduleId) {
      const mod = moduleById[changed.moduleId]
      if (mod) form.setFieldValue('licenseCode', mod.licenseCode)
    }
    // Auto-calc expiresAt from plan + startDate
    if (!('plan' in changed) && !('startDate' in changed)) return
    const planConfig = PLANS.find(p => p.value === all.plan)
    if ((!planConfig?.durationMonths && !planConfig?.durationDays) || !all.startDate) return
    const newExpiry = planConfig.durationDays
      ? dayjs(all.startDate).add(planConfig.durationDays, 'day')
      : dayjs(all.startDate).add(planConfig.durationMonths, 'month')
    if (editing) {
      setEditExpiry(newExpiry.format('YYYY-MM-DD'))
      if ('plan' in changed) setEditExpiryChanged(true)
    } else {
      form.setFieldValue('expiresAt', newExpiry)
    }
  }

  const handleSave = () => {
    form.validateFields().then(async values => {
      setSaving(true)
      try {
        const payload = {
          licenseCode:       values.licenseCode,
          moduleId:          values.moduleId || null,
          companyId:         values.companyId || null,
          status:            values.status,
          plan:              values.plan || null,
          userIds:           values.userIds || [],
          offlineGraceHours: values.offlineGraceHours ?? 48,
          maxDevices:        values.maxDevices ?? null,
          startDate:         values.startDate?.format('YYYY-MM-DD') || null,
          expiresAt:         editing ? editExpiry : (values.expiresAt?.format('YYYY-MM-DD') || null),
          notes:             values.notes || null,
        }
        if (editing) {
          await updateDoc(doc(db, 'licenses', editing.id), payload)
          message.success('Licencia actualizada')
        } else {
          await addDoc(collection(db, 'licenses'), { ...payload, createdAt: new Date() })
          message.success('Licencia creada')
        }
        setModalOpen(false)
      } catch (err) {
        console.error(err)
        message.error('No se pudo guardar la licencia')
      } finally {
        setSaving(false)
      }
    })
  }

  const columns = [
    { title: 'Código', dataIndex: 'licenseCode', key: 'code', render: v => <code style={{ fontSize: 12 }}>{v}</code> },
    { title: 'Módulo', dataIndex: 'moduleName',  key: 'module' },
    { title: 'Empresa', key: 'company', render: (_, r) => r.companyName || <span style={{ color: '#bbb' }}>—</span> },
    {
      title: 'Estado', dataIndex: 'status', key: 'status',
      render: s => { const cfg = STATUS_LABELS[s] || { label: s, color: 'default' }; return <Tag color={cfg.color}>{cfg.label}</Tag> },
    },
    {
      title: 'Usuarios', key: 'users',
      render: (_, r) => {
        const count = (r.userIds || []).length
        return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{count}</span>
      },
    },
    { title: 'Grace', dataIndex: 'offlineGraceHours', key: 'grace', render: v => v != null ? `${v}h` : '—' },
    {
      title: 'Vence', dataIndex: 'expiresAt', key: 'expires',
      render: v => {
        if (!v) return '—'
        const d    = dayjs(toDate(v))
        const diff = d.diff(dayjs(), 'day')
        return <span style={{ color: diff <= 7 && diff >= 0 ? '#faad14' : undefined }}>{d.format('DD/MM/YYYY')}</span>
      },
    },
    {
      title: '', key: 'actions', width: 170,
      render: (_, record) => (
        <Space>
          <Tooltip title="Copiar código"><Button icon={<CopyOutlined />} size="small" onClick={() => copyCode(record.licenseCode)} /></Tooltip>
          <Tooltip title="Editar"><Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} /></Tooltip>
          <Tooltip title="Dispositivos"><Button icon={<MobileOutlined />} size="small" onClick={() => openDevices(record)} /></Tooltip>
          {record.status !== 'draft' && (
            <Tooltip title="Renovar">
              <Button icon={<SyncOutlined />} size="small" onClick={() => openRenew(record)} style={{ color: '#2563EB', borderColor: '#2563EB' }} />
            </Tooltip>
          )}
          {record.status !== 'blocked' && record.status !== 'draft' && (
            <Popconfirm title="¿Bloquear esta licencia?" onConfirm={() => handleBlock(record)} okText="Bloquear" okButtonProps={{ danger: true }} cancelText="Cancelar">
              <Tooltip title="Bloquear"><Button icon={<StopOutlined />} size="small" danger /></Tooltip>
            </Popconfirm>
          )}
          <Popconfirm
            title="¿Eliminar esta licencia?"
            description="Se eliminará permanentemente. Los eventos históricos se mantienen."
            onConfirm={() => handleDelete(record)}
            okText="Eliminar"
            okButtonProps={{ danger: true }}
            cancelText="Cancelar"
          >
            <Tooltip title="Eliminar"><Button icon={<DeleteOutlined />} size="small" danger /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (loadingL || loadingC) return <Spin style={{ display: 'block', margin: '80px auto' }} />

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Licencias</Title>
        {role === 'admin' && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Nueva licencia</Button>}
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select value={filterStatus || ''} style={{ width: 160 }}
          onChange={v => setFilterStatus(v || null)}
          options={[
            { value: '', label: 'Todos los estados' },
            ...Object.entries(STATUS_LABELS).map(([v, { label }]) => ({ value: v, label })),
          ]} />
        <Select value={filterModule || ''} style={{ width: 230 }}
          onChange={v => setFilterModule(v || null)}
          options={[
            { value: '', label: 'Todos los módulos' },
            ...allModules.map(m => ({ value: m.id, label: m.label })),
          ]} />
        <Input placeholder="Buscar código, módulo o empresa..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ width: 260 }} allowClear />
      </Space>

      <Table dataSource={filtered} columns={columns} rowKey="id" size="middle"
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}–${r[1]} de ${t}` }} />

      {/* Drawer dispositivos */}
      <Drawer
        title={devTarget ? `Dispositivos — ${devTarget.licenseCode}` : 'Dispositivos'}
        open={devDrawer}
        onClose={() => setDevDrawer(false)}
        width={600}
        extra={devTarget?.maxDevices ? <span style={{ fontSize: 12, color: '#999' }}>Límite: {devTarget.maxDevices} dispositivos</span> : null}
      >
        <Table
          dataSource={devices}
          rowKey="id"
          loading={loadingDevices}
          size="small"
          pagination={false}
          locale={{ emptyText: 'Ningún dispositivo registrado aún. Se registran automáticamente en la primera validación online.' }}
          columns={[
            { title: 'Device ID', dataIndex: 'id', key: 'id', render: v => <code style={{ fontSize: 11 }}>{v}</code> },
            { title: 'Modelo', dataIndex: 'deviceModel', key: 'model', render: v => v || '—' },
            { title: 'Usuario', dataIndex: 'metaUsername', key: 'user', render: v => v || '—' },
            {
              title: 'Estado', dataIndex: 'status', key: 'status',
              render: v => v === 'blocked'
                ? <Tag color="error">Bloqueado</Tag>
                : <Tag color="success">Activo</Tag>,
            },
            {
              title: 'Última conexión', dataIndex: 'lastSeenAt', key: 'last',
              render: v => v ? dayjs(v?.toDate ? v.toDate() : new Date(v)).format('DD/MM/YYYY HH:mm') : '—',
            },
            {
              title: '', key: 'devActions', width: 120,
              render: (_, d) => (
                <Space>
                  {d.status !== 'blocked'
                    ? <Tooltip title="Bloquear"><Button size="small" danger icon={<StopOutlined />} onClick={() => handleDeviceAction(d, 'block')} /></Tooltip>
                    : <Tooltip title="Desbloquear"><Button size="small" icon={<SyncOutlined />} onClick={() => handleDeviceAction(d, 'unblock')} /></Tooltip>
                  }
                  <Popconfirm
                    title="¿Liberar este dispositivo?"
                    description="Se elimina el registro. Un nuevo visor podrá tomar su lugar."
                    onConfirm={() => handleDeviceAction(d, 'release')}
                    okText="Liberar" okButtonProps={{ danger: true }} cancelText="Cancelar"
                  >
                    <Tooltip title="Liberar slot"><Button size="small" icon={<DeleteOutlined />} /></Tooltip>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Drawer>

      {/* Modal renovación */}
      <Modal title={renewTarget ? `Renovar: ${renewTarget.licenseCode}` : 'Renovar'}
        open={renewModal} onOk={handleRenew} onCancel={() => setRenewModal(false)}
        okText="Confirmar renovación" okButtonProps={{ style: { background: '#2563EB', borderColor: '#2563EB' } }}
        cancelText="Cancelar" width={480}
      >
        {renewTarget && (() => {
          const expDate   = toDate(renewTarget.expiresAt)
          const isExpired = expDate && dayjs(expDate).isBefore(dayjs())
          const base      = getRenewBase(renewTarget)
          const newExpiry = applyPeriod(base, renewPeriod)
          const periodLabel = renewPeriod === '3d' ? '3 días' : `${parseInt(renewPeriod)} ${parseInt(renewPeriod) === 1 ? 'mes' : 'meses'}`
          return (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {isExpired && <Alert type="warning" showIcon message="La licencia está vencida — la renovación parte desde hoy." />}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', color: '#999', marginBottom: 4 }}>Módulo</div>
                  <div style={{ fontWeight: 600 }}>{renewTarget.moduleName}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', color: '#999', marginBottom: 4 }}>Vencimiento actual</div>
                  <div style={{ color: isExpired ? '#ff4d4f' : undefined, fontWeight: 600 }}>
                    {expDate ? dayjs(expDate).format('DD/MM/YYYY') : '—'}
                    {isExpired && <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 12 }}>(vencida)</span>}
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', color: '#999', marginBottom: 8 }}>Extender por</div>
                <Radio.Group value={renewPeriod} onChange={e => setRenewPeriod(e.target.value)}>
                  <Radio.Button value="3d">3 días</Radio.Button>
                  <Radio.Button value="1m">1 mes</Radio.Button>
                  <Radio.Button value="3m">3 meses</Radio.Button>
                  <Radio.Button value="6m">6 meses</Radio.Button>
                  <Radio.Button value="12m">12 meses</Radio.Button>
                </Radio.Group>
              </div>
              <div style={{ background: '#f0f7ff', border: '1px solid #bae0ff', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#555', fontSize: 13 }}>
                  {isExpired ? 'Desde hoy' : `Desde ${base.format('DD/MM/YYYY')}`} + {periodLabel}
                </span>
                <span style={{ fontWeight: 700, fontSize: 16, color: '#2563EB' }}>{newExpiry.format('DD/MM/YYYY')}</span>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', color: '#999', marginBottom: 6 }}>Notas (opcional)</div>
                <Input.TextArea rows={2} value={renewNotes} onChange={e => setRenewNotes(e.target.value)} />
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Modal crear/editar */}
      <Modal title={editing ? `Editar: ${editing.licenseCode}` : 'Nueva licencia'}
        open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)}
        okText={editing ? 'Guardar cambios' : 'Crear licencia'} okButtonProps={{ loading: saving }}
        cancelText="Cancelar" width={640}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }} onValuesChange={handleValuesChange}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="moduleId" label="Módulo" rules={[{ required: true, message: 'Elegí un módulo' }]}>
              <Select
                placeholder="Seleccionar módulo"
                options={allModules.map(m => ({ value: m.id, label: `${m.label} — ${m.licenseCode}` }))}
              />
            </Form.Item>
            <Form.Item name="licenseCode" label={
              <span>Código de licencia <Tooltip title="Se auto-completa al elegir módulo. Editá solo para casos especiales como XPL-TEST-001."><InfoCircleOutlined style={{ color: '#999', fontSize: 12 }} /></Tooltip></span>
            } rules={[{ required: true }]}>
              <Input placeholder="Auto desde módulo" style={{ fontFamily: 'monospace' }} />
            </Form.Item>
            <Form.Item name="status" label="Estado" rules={[{ required: true }]}>
              <Select options={Object.entries(STATUS_LABELS).map(([v, { label }]) => ({ value: v, label }))} />
            </Form.Item>
            <Form.Item name="plan" label="Plan">
              <Select options={PLANS.map(p => ({ value: p.value, label: p.label }))} allowClear />
            </Form.Item>
            <Form.Item name="companyId" label="Empresa (opcional)">
              <Select placeholder="Sin empresa" allowClear
                options={companies.map(c => ({ value: c.id, label: c.name }))} />
            </Form.Item>
            <Form.Item name="offlineGraceHours" label="Grace period (horas)">
              <InputNumber min={0} max={720} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="maxDevices" label={
              <span>Máx. dispositivos <Tooltip title="Límite de visores Quest que pueden usar esta licencia. Dejar vacío para sin límite."><InfoCircleOutlined style={{ color: '#999', fontSize: 12 }} /></Tooltip></span>
            }>
              <InputNumber min={1} max={100} placeholder="Sin límite" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="startDate" label="Inicio">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            {editing ? (
              <Form.Item label={
                <span>Vencimiento <Tooltip title="Para extender usá el botón Renovar."><InfoCircleOutlined style={{ marginLeft: 6, color: '#999', fontSize: 12 }} /></Tooltip></span>
              }>
                <Space direction="vertical" style={{ width: '100%' }} size={4}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" value={editExpiry ? dayjs(editExpiry) : null} disabled />
                  {editExpiryChanged && <span style={{ fontSize: 12, color: '#2563EB' }}>Recalculado según el nuevo plan</span>}
                </Space>
              </Form.Item>
            ) : (
              <Form.Item name="expiresAt" label="Vencimiento">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            )}
          </div>

          {/* Selector de usuarios */}
          <Form.Item name="userIds" label="Usuarios autorizados">
            <Select
              mode="multiple"
              placeholder="Seleccionar usuarios del pool..."
              optionFilterProp="label"
              options={users.map(u => ({
                value: u.metaUsername || u.id,
                label: `${u.metaUsername || u.id}${u.name ? ` — ${u.name}` : ''}`,
              }))}
            />
          </Form.Item>

          <Form.Item name="notes" label="Notas internas">
            <Input.TextArea rows={2} placeholder="Solo visible para el equipo Xplash" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
