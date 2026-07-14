import { useState } from 'react'
import { Table, Button, Tag, Input, Select, Modal, Form, Checkbox, InputNumber, DatePicker, Typography, Space, Tooltip, message, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, CopyOutlined, StopOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { mockLicenses, mockCompanies, MODULES, STATUS_LABELS } from '../mock/data'

const { Title } = Typography

const PLANS = [
  { value: '1m_1_visor', label: '1 mes · 1 visor' },
  { value: '3m_1_visor', label: '3 meses · 1 visor' },
  { value: '3m_2_visores', label: '3 meses · 2 visores' },
  { value: '6m_1_visor', label: '6 meses · 1 visor' },
  { value: '6m_3_visores', label: '6 meses · 3 visores' },
  { value: '12m_5_visores', label: '12 meses · 5 visores' },
  { value: 'custom', label: 'Personalizado' },
]

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
    form.resetFields()
    form.setFieldsValue({ status: 'draft', offlineGraceHours: 48, maxDevices: 1, enabledModules: [] })
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      ...record,
      startDate: record.startDate ? dayjs(record.startDate) : null,
      expiresAt: record.expiresAt ? dayjs(record.expiresAt) : null,
    })
    setModalOpen(true)
  }

  const handleSave = () => {
    form.validateFields().then(values => {
      const companyName = mockCompanies.find(c => c.id === values.companyId)?.name || ''
      const payload = {
        ...values,
        companyName,
        startDate: values.startDate?.format('YYYY-MM-DD') || null,
        expiresAt: values.expiresAt?.format('YYYY-MM-DD') || null,
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
      title: 'Visores', key: 'devices',
      render: (_, r) => `${r.maxDevices}`,
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
      title: '', key: 'actions', width: 100,
      render: (_, record) => (
        <Space>
          <Tooltip title="Copiar código"><Button icon={<CopyOutlined />} size="small" onClick={() => copyCode(record.licenseCode)} /></Tooltip>
          <Tooltip title="Editar"><Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} /></Tooltip>
          {record.status !== 'blocked' && (
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
          style={{ background: '#e8173a', borderColor: '#e8173a' }}>
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
        pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}–${r[1]} de ${t}` }}
      />

      <Modal
        title={editing ? `Editar: ${editing.licenseCode}` : 'Nueva licencia'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Guardar cambios' : 'Crear licencia'}
        okButtonProps={{ style: { background: '#e8173a', borderColor: '#e8173a' } }}
        cancelText="Cancelar"
        width={620}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
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
              <Select options={PLANS} />
            </Form.Item>
            <Form.Item name="maxDevices" label="Visores permitidos" rules={[{ required: true }]}>
              <InputNumber min={1} max={50} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="offlineGraceHours" label="Grace period (horas)">
              <InputNumber min={0} max={720} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="startDate" label="Inicio">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="expiresAt" label="Vencimiento">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
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
