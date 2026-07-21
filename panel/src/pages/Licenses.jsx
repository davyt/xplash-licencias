import { useState } from 'react'
import { Table, Button, Tag, Input, Select, Modal, Form, Checkbox, InputNumber, DatePicker, Typography, Space, Tooltip, message, Popconfirm, Radio, Alert } from 'antd'
import { PlusOutlined, EditOutlined, CopyOutlined, StopOutlined, SyncOutlined, InfoCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { mockLicenses, mockCompanies, mockUserAccess, MODULES, PLANS, STATUS_LABELS } from '../mock/data'

const { Title } = Typography

function genCode(companyName) {
  const slug = companyName.toUpperCase().slice(0, 6).replace(/\s/g, '')
  return `XPL-${slug}-${String(Date.now()).slice(-3)}`
}

export default function Licenses() {
  const [licenses, setLicenses] = useState(mockLicenses)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState(null)
  const [filterCompany, setFilterCompany] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const [editExpiry, setEditExpiry]             = useState(null)
  const [editExpiryChanged, setEditExpiryChanged] = useState(false)

  const [renewModal, setRenewModal]   = useState(false)
  const [renewTarget, setRenewTarget] = useState(null)
  const [renewMonths, setRenewMonths] = useState(6)
  const [renewNotes, setRenewNotes]   = useState('')

  const getRenewBase = (lic) => {
    const exp = dayjs(lic.expiresAt)
    return exp.isBefore(dayjs()) ? dayjs() : exp
  }

  const openRenew = (record) => {
    setRenewTarget(record)
    setRenewMonths(6)
    setRenewNotes('')
    setRenewModal(true)
  }

  const handleRenew = () => {
    const base      = getRenewBase(renewTarget)
    const newExpiry = base.add(renewMonths, 'month').format('YYYY-MM-DD')
    setLicenses(prev => prev.map(l =>
      l.id === renewTarget.id ? { ...l, expiresAt: newExpiry, status: 'active' } : l
    ))
    message.success(`${renewTarget.licenseCode} renovada hasta ${dayjs(newExpiry).format('DD/MM/YYYY')}`)
    setRenewModal(false)
  }

  const filtered = licenses.filter(l => {
    if (filterStatus && l.status !== filterStatus) return false
    if (filterCompany && l.companyId !== filterCompany) return false
    if (search && !l.licenseCode.toLowerCase().includes(search.toLowerCase()) &&
        !l.companyName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    message.success(`Código copiado: ${code}`)
  }

  const handleBlock = (record) => {
    setLicenses(prev => prev.map(l => l.id === record.id ? { ...l, status: 'blocked' } : l))
    message.warning(`Licencia ${record.licenseCode} bloqueada`)
  }

  const openCreate = () => {
    setEditing(null)
    setEditExpiry(null)
    setEditExpiryChanged(false)
    form.resetFields()
    form.setFieldsValue({ status: 'draft', offlineGraceHours: 48, maxUsers: 1, enabledModules: [] })
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    setEditExpiry(record.expiresAt || null)
    setEditExpiryChanged(false)
    form.setFieldsValue({
      ...record,
      startDate: record.startDate ? dayjs(record.startDate) : null,
      // expiresAt omitted — displayed as read-only, managed via editExpiry state
    })
    setModalOpen(true)
  }

  const handleValuesChange = (changed, all) => {
    const planChanged  = 'plan' in changed
    const startChanged = 'startDate' in changed
    if (!planChanged && !startChanged) return

    const planConfig = PLANS.find(p => p.value === all.plan)
    const startDate  = all.startDate
    if (!planConfig?.durationMonths || !startDate) return

    const newExpiry = dayjs(startDate).add(planConfig.durationMonths, 'month')

    if (editing) {
      setEditExpiry(newExpiry.format('YYYY-MM-DD'))
      if (planChanged) setEditExpiryChanged(true)
    } else {
      form.setFieldValue('expiresAt', newExpiry)
    }
  }

  const handleSave = () => {
    form.validateFields().then(values => {
      const companyName = mockCompanies.find(c => c.id === values.companyId)?.name || ''
      const payload = {
        ...values,
        companyName,
        startDate:  values.startDate?.format('YYYY-MM-DD') || null,
        expiresAt:  editing ? editExpiry : (values.expiresAt?.format('YYYY-MM-DD') || null),
        licenseCode: values.licenseCode || genCode(companyName),
      }
      if (editing) {
        setLicenses(prev => prev.map(l => l.id === editing.id ? { ...l, ...payload } : l))
        message.success('Licencia actualizada')
      } else {
        setLicenses(prev => [...prev, { ...payload, id: `l${Date.now()}` }])
        message.success('Licencia creada')
      }
      setModalOpen(false)
    })
  }

  const columns = [
    {
      title: 'Código', dataIndex: 'licenseCode', key: 'code',
      render: v => <code style={{ fontSize: 12 }}>{v}</code>,
    },
    { title: 'Empresa', dataIndex: 'companyName', key: 'company' },
    {
      title: 'Estado', dataIndex: 'status', key: 'status',
      render: s => {
        const cfg = STATUS_LABELS[s] || { label: s, color: 'default' }
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      },
    },
    {
      title: 'Módulos', dataIndex: 'enabledModules', key: 'modules',
      render: mods => mods.length === 0
        ? <span style={{ color: '#ccc' }}>—</span>
        : mods.map(m => {
            const found = MODULES.find(x => x.id === m)
            return <Tag key={m} style={{ marginBottom: 2 }}>{found ? found.label : m}</Tag>
          }),
    },
    {
      title: 'Usuarios', key: 'users',
      render: (_, r) => {
        const registered = mockUserAccess.filter(u => u.licenseId === r.id).length
        const atMax = registered >= r.maxUsers
        const nearMax = !atMax && registered >= r.maxUsers - 1 && r.maxUsers > 1
        return (
          <span style={{ color: atMax ? '#ff4d4f' : nearMax ? '#faad14' : undefined, fontVariantNumeric: 'tabular-nums' }}>
            {registered}/{r.maxUsers}
          </span>
        )
      },
    },
    {
      title: 'Grace', dataIndex: 'offlineGraceHours', key: 'grace',
      render: v => v != null ? `${v}h` : '—',
    },
    {
      title: 'Vence', dataIndex: 'expiresAt', key: 'expires',
      render: v => {
        if (!v) return '—'
        const d = dayjs(v)
        const soon = d.diff(dayjs(), 'day') <= 7 && d.diff(dayjs(), 'day') >= 0
        return <span style={{ color: soon ? '#faad14' : undefined }}>{d.format('DD/MM/YYYY')}</span>
      },
    },
    {
      title: '', key: 'actions', width: 120,
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

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Licencias</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: '#F65C7C', borderColor: '#F65C7C' }}>
          Nueva licencia
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="Estado"
          allowClear
          style={{ width: 140 }}
          onChange={setFilterStatus}
          options={Object.entries(STATUS_LABELS).map(([v, { label }]) => ({ value: v, label }))}
        />
        <Select
          placeholder="Empresa"
          allowClear
          style={{ width: 200 }}
          onChange={setFilterCompany}
          options={mockCompanies.map(c => ({ value: c.id, label: c.name }))}
        />
        <Input
          placeholder="Buscar código o empresa..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 240 }}
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

      {/* Modal renovación */}
      <Modal
        title={renewTarget ? `Renovar: ${renewTarget.licenseCode}` : 'Renovar licencia'}
        open={renewModal}
        onOk={handleRenew}
        onCancel={() => setRenewModal(false)}
        okText="Confirmar renovación"
        okButtonProps={{ style: { background: '#2563EB', borderColor: '#2563EB' } }}
        cancelText="Cancelar"
        width={480}
      >
        {renewTarget && (() => {
          const isExpired = renewTarget.expiresAt && dayjs(renewTarget.expiresAt).isBefore(dayjs())
          const base      = getRenewBase(renewTarget)
          const newExpiry = base.add(renewMonths, 'month')
          return (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {isExpired && (
                <Alert
                  type="warning"
                  showIcon
                  message="La licencia está vencida — la renovación parte desde hoy."
                />
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', color: '#999', marginBottom: 4 }}>Empresa</div>
                  <div style={{ fontWeight: 600 }}>{renewTarget.companyName}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', color: '#999', marginBottom: 4 }}>Vencimiento actual</div>
                  <div style={{ color: isExpired ? '#ff4d4f' : undefined, fontWeight: 600 }}>
                    {renewTarget.expiresAt ? dayjs(renewTarget.expiresAt).format('DD/MM/YYYY') : '—'}
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
                <span style={{ fontWeight: 700, fontSize: 16, color: '#2563EB' }}>
                  {newExpiry.format('DD/MM/YYYY')}
                </span>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', color: '#999', marginBottom: 6 }}>Notas (opcional)</div>
                <Input.TextArea
                  rows={2}
                  placeholder="Ej: Renovación manual — pago recibido por transferencia"
                  value={renewNotes}
                  onChange={e => setRenewNotes(e.target.value)}
                />
              </div>
            </div>
          )
        })()}
      </Modal>

      <Modal
        title={editing ? `Editar: ${editing.licenseCode}` : 'Nueva licencia'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Guardar cambios' : 'Crear licencia'}
        okButtonProps={{ style: { background: '#F65C7C', borderColor: '#F65C7C' } }}
        cancelText="Cancelar"
        width={620}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }} onValuesChange={handleValuesChange}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="companyId" label="Empresa" rules={[{ required: true }]}>
              <Select options={mockCompanies.map(c => ({ value: c.id, label: c.name }))} />
            </Form.Item>
            <Form.Item name="licenseCode" label="Código de licencia">
              <Input placeholder="Se genera automáticamente" />
            </Form.Item>
            <Form.Item name="status" label="Estado" rules={[{ required: true }]}>
              <Select options={Object.entries(STATUS_LABELS).map(([v, { label }]) => ({ value: v, label }))} />
            </Form.Item>
            <Form.Item name="plan" label="Plan">
              <Select options={PLANS.map(p => ({ value: p.value, label: p.label }))} />
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
              <Form.Item
                label={
                  <span>
                    Vencimiento
                    <Tooltip title="Para extender el vencimiento usá el botón Renovar en la tabla.">
                      <InfoCircleOutlined style={{ marginLeft: 6, color: '#999', fontSize: 12 }} />
                    </Tooltip>
                  </span>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }} size={4}>
                  <DatePicker
                    style={{ width: '100%' }}
                    format="DD/MM/YYYY"
                    value={editExpiry ? dayjs(editExpiry) : null}
                    disabled
                  />
                  {editExpiryChanged && (
                    <span style={{ fontSize: 12, color: '#2563EB' }}>
                      Recalculado según el nuevo plan
                    </span>
                  )}
                </Space>
              </Form.Item>
            ) : (
              <Form.Item name="expiresAt" label="Vencimiento">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            )}
          </div>
          <Form.Item name="enabledModules" label="Módulos habilitados">
            <Checkbox.Group
              options={MODULES.map(m => ({ label: m.label, value: m.id }))}
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
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
