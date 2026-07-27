import { useState, useMemo } from 'react'
import { Table, Button, Tag, Input, Select, Modal, Form, Checkbox, InputNumber, DatePicker,
         Typography, Space, Tooltip, message, Popconfirm, Radio, Alert, Switch, Spin } from 'antd'
import { PlusOutlined, EditOutlined, CopyOutlined, StopOutlined, SyncOutlined, InfoCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { collection, doc, addDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useCollection } from '../hooks/useCollection'
import { MODULES, PLANS, STATUS_LABELS } from '../mock/data'

const { Title } = Typography

function toDate(v) { return v?.toDate ? v.toDate() : v ? new Date(v) : null }

function genCode(companyId, companyById) {
  const name = companyById[companyId]?.name || 'XPL'
  const slug  = name.toUpperCase().slice(0, 6).replace(/\s+/g, '')
  return `XPL-${slug}-${String(Date.now()).slice(-3)}`
}

export default function Licenses() {
  const [licenses,   loadingL] = useCollection('licenses')
  const [companies,  loadingC] = useCollection('companies')
  const [userAccess, loadingU] = useCollection('userAccess')

  const [search, setSearch]               = useState('')
  const [filterStatus, setFilterStatus]   = useState(null)
  const [filterCompany, setFilterCompany] = useState(null)
  const [modalOpen, setModalOpen]         = useState(false)
  const [editing, setEditing]             = useState(null)
  const [saving, setSaving]               = useState(false)
  const [form] = Form.useForm()

  const [editExpiry, setEditExpiry]               = useState(null)
  const [editExpiryChanged, setEditExpiryChanged] = useState(false)

  const [renewModal, setRenewModal]   = useState(false)
  const [renewTarget, setRenewTarget] = useState(null)
  const [renewMonths, setRenewMonths] = useState(6)
  const [renewNotes, setRenewNotes]   = useState('')

  const companyById = useMemo(
    () => Object.fromEntries(companies.map(c => [c.id, c])),
    [companies]
  )

  const accessCountByLicense = useMemo(() => {
    const map = {}
    userAccess.forEach(u => { if (u.licenseId) map[u.licenseId] = (map[u.licenseId] || 0) + 1 })
    return map
  }, [userAccess])

  const licensesWithNames = useMemo(() => licenses.map(l => ({
    ...l, companyName: l.companyName || companyById[l.companyId]?.name || '—',
  })), [licenses, companyById])

  const filtered = useMemo(() => licensesWithNames.filter(l => {
    if (filterStatus  && l.status    !== filterStatus)  return false
    if (filterCompany && l.companyId !== filterCompany) return false
    if (search && !l.licenseCode.toLowerCase().includes(search.toLowerCase()) &&
        !(l.companyName || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [licensesWithNames, filterStatus, filterCompany, search])

  const getRenewBase = (lic) => {
    const exp = toDate(lic.expiresAt)
    return exp && dayjs(exp).isBefore(dayjs()) ? dayjs() : dayjs(exp)
  }

  const openRenew = (record) => { setRenewTarget(record); setRenewMonths(6); setRenewNotes(''); setRenewModal(true) }

  const handleRenew = async () => {
    const base      = getRenewBase(renewTarget)
    const newExpiry = base.add(renewMonths, 'month').format('YYYY-MM-DD')
    try {
      await updateDoc(doc(db, 'licenses', renewTarget.id), { expiresAt: newExpiry, status: 'active' })
      await addDoc(collection(db, 'contracts'), {
        companyId: renewTarget.companyId,
        plan:      renewTarget.plan || null,
        maxUsers:  renewTarget.maxUsers,
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

  const handleBlock = async (record) => {
    try {
      await updateDoc(doc(db, 'licenses', record.id), { status: 'blocked' })
      message.warning(`Licencia ${record.licenseCode} bloqueada`)
    } catch (err) {
      console.error(err)
      message.error('No se pudo bloquear')
    }
  }

  const copyCode = (code) => { navigator.clipboard.writeText(code); message.success(`Código copiado: ${code}`) }

  const openCreate = () => {
    setEditing(null); setEditExpiry(null); setEditExpiryChanged(false)
    form.resetFields()
    form.setFieldsValue({ status: 'draft', offlineGraceHours: 48, maxUsers: 1, enabledModules: [], requiresActivation: false })
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    const exp = record.expiresAt ? (toDate(record.expiresAt).toISOString().slice(0, 10)) : null
    setEditExpiry(exp)
    setEditExpiryChanged(false)
    form.setFieldsValue({
      ...record,
      startDate:  record.startDate ? dayjs(toDate(record.startDate)) : null,
      expiresAt:  undefined, // manejado aparte
    })
    setModalOpen(true)
  }

  const handleValuesChange = (changed, all) => {
    if (!('plan' in changed) && !('startDate' in changed)) return
    const planConfig = PLANS.find(p => p.value === all.plan)
    if (!planConfig?.durationMonths || !all.startDate) return
    const newExpiry = dayjs(all.startDate).add(planConfig.durationMonths, 'month')
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
          companyId:          values.companyId,
          licenseCode:        values.licenseCode || genCode(values.companyId, companyById),
          status:             values.status,
          plan:               values.plan || null,
          maxUsers:           values.maxUsers,
          offlineGraceHours:  values.offlineGraceHours ?? 48,
          startDate:          values.startDate?.format('YYYY-MM-DD') || null,
          expiresAt:          editing ? editExpiry : (values.expiresAt?.format('YYYY-MM-DD') || null),
          enabledModules:     values.enabledModules || [],
          requiresActivation: values.requiresActivation || false,
          notes:              values.notes || null,
        }
        if (editing) {
          await updateDoc(doc(db, 'licenses', editing.id), payload)
          message.success('Licencia actualizada')
        } else {
          await addDoc(collection(db, 'licenses'), payload)
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
    { title: 'Empresa', dataIndex: 'companyName', key: 'company' },
    {
      title: 'Estado', dataIndex: 'status', key: 'status',
      render: s => { const cfg = STATUS_LABELS[s] || { label: s, color: 'default' }; return <Tag color={cfg.color}>{cfg.label}</Tag> },
    },
    {
      title: 'Módulos', dataIndex: 'enabledModules', key: 'modules',
      render: mods => !mods?.length
        ? <span style={{ color: '#ccc' }}>—</span>
        : mods.map(m => { const f = MODULES.find(x => x.id === m); return <Tag key={m} style={{ marginBottom: 2 }}>{f ? f.label : m}</Tag> }),
    },
    {
      title: 'Usuarios', key: 'users',
      render: (_, r) => {
        const reg = accessCountByLicense[r.id] || 0
        const atMax   = reg >= r.maxUsers
        const nearMax = !atMax && reg >= r.maxUsers - 1 && r.maxUsers > 1
        return <span style={{ color: atMax ? '#ff4d4f' : nearMax ? '#faad14' : undefined, fontVariantNumeric: 'tabular-nums' }}>{reg}/{r.maxUsers}</span>
      },
    },
    {
      title: 'Activación', key: 'activation',
      render: (_, r) => r.requiresActivation ? <Tag color="blue">Por código</Tag> : <Tag color="default">Libre</Tag>,
    },
    { title: 'Grace', dataIndex: 'offlineGraceHours', key: 'grace', render: v => v != null ? `${v}h` : '—' },
    {
      title: 'Vence', dataIndex: 'expiresAt', key: 'expires',
      render: v => {
        if (!v) return '—'
        const d = dayjs(toDate(v))
        const diff = d.diff(dayjs(), 'day')
        return <span style={{ color: diff <= 7 && diff >= 0 ? '#faad14' : undefined }}>{d.format('DD/MM/YYYY')}</span>
      },
    },
    {
      title: '', key: 'actions', width: 130,
      render: (_, record) => (
        <Space>
          <Tooltip title="Copiar código"><Button icon={<CopyOutlined />} size="small" onClick={() => copyCode(record.licenseCode)} /></Tooltip>
          <Tooltip title="Editar"><Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} /></Tooltip>
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
        </Space>
      ),
    },
  ]

  if (loadingL || loadingC) return <Spin style={{ display: 'block', margin: '80px auto' }} />

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Licencias</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Nueva licencia</Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select placeholder="Estado" allowClear style={{ width: 140 }} onChange={setFilterStatus}
          options={Object.entries(STATUS_LABELS).map(([v, { label }]) => ({ value: v, label }))} />
        <Select placeholder="Empresa" allowClear style={{ width: 200 }} onChange={setFilterCompany}
          options={companies.map(c => ({ value: c.id, label: c.name }))} />
        <Input placeholder="Buscar código o empresa..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: 240 }} allowClear />
      </Space>

      <Table dataSource={filtered} columns={columns} rowKey="id" size="middle"
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}–${r[1]} de ${t}` }} />

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
          const newExpiry = base.add(renewMonths, 'month')
          return (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {isExpired && <Alert type="warning" showIcon message="La licencia está vencida — la renovación parte desde hoy." />}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', color: '#999', marginBottom: 4 }}>Empresa</div>
                  <div style={{ fontWeight: 600 }}>{renewTarget.companyName}</div>
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
                <Radio.Group value={renewMonths} onChange={e => setRenewMonths(e.target.value)}>
                  <Radio.Button value={1}>1 mes</Radio.Button>
                  <Radio.Button value={3}>3 meses</Radio.Button>
                  <Radio.Button value={6}>6 meses</Radio.Button>
                  <Radio.Button value={12}>12 meses</Radio.Button>
                </Radio.Group>
              </div>
              <div style={{ background: '#f0f7ff', border: '1px solid #bae0ff', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#555', fontSize: 13 }}>
                  {isExpired ? 'Desde hoy' : `Desde ${base.format('DD/MM/YYYY')}`} + {renewMonths} {renewMonths === 1 ? 'mes' : 'meses'}
                </span>
                <span style={{ fontWeight: 700, fontSize: 16, color: '#2563EB' }}>{newExpiry.format('DD/MM/YYYY')}</span>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', color: '#999', marginBottom: 6 }}>Notas (opcional)</div>
                <Input.TextArea rows={2} placeholder="Ej: Renovación manual — pago recibido por transferencia"
                  value={renewNotes} onChange={e => setRenewNotes(e.target.value)} />
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
            <Form.Item name="companyId" label="Empresa" rules={[{ required: true }]}>
              <Select options={companies.map(c => ({ value: c.id, label: c.name }))} />
            </Form.Item>
            <Form.Item name="licenseCode" label="Código de licencia">
              <Input placeholder="Se genera automáticamente" />
            </Form.Item>
            <Form.Item name="status" label="Estado" rules={[{ required: true }]}>
              <Select options={Object.entries(STATUS_LABELS).map(([v, { label }]) => ({ value: v, label }))} />
            </Form.Item>
            <Form.Item name="plan" label="Plan">
              <Select options={PLANS.map(p => ({ value: p.value, label: p.label }))} allowClear />
            </Form.Item>
            <Form.Item name="maxUsers" label="Usuarios permitidos" rules={[{ required: true }]}>
              <InputNumber min={1} max={200} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="offlineGraceHours" label="Grace period (horas)">
              <InputNumber min={0} max={720} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="startDate" label="Inicio">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            {editing ? (
              <Form.Item label={
                <span>Vencimiento <Tooltip title="Para extender usá el botón Renovar en la tabla."><InfoCircleOutlined style={{ marginLeft: 6, color: '#999', fontSize: 12 }} /></Tooltip></span>
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
          <Form.Item name="requiresActivation" label="Activación por código" valuePropName="checked"
            help="Si está activo, el visor necesita un código personal en el primer uso.">
            <Switch checkedChildren="Requerida" unCheckedChildren="No requerida" />
          </Form.Item>
          <Form.Item name="enabledModules" label="Módulos habilitados">
            <Checkbox.Group options={MODULES.map(m => ({ label: m.label, value: m.id }))}
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }} />
          </Form.Item>
          <Form.Item name="notes" label="Notas internas">
            <Input.TextArea rows={2} placeholder="Solo visible para el equipo Xplash" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
