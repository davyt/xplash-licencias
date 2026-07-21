import { useState } from 'react'
import { Badge, Popover, Typography, Tooltip } from 'antd'
import {
  BellOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CheckOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../hooks/useNotifications'
import { auth } from '../firebase'
import { mockAdminUsers } from '../mock/data'

const SEVERITY = {
  critical: { color: '#F65C7C', bg: '#FEE2E2', icon: <ExclamationCircleOutlined /> },
  warning:  { color: '#D97706', bg: '#FEF3C7', icon: <WarningOutlined /> },
  info:     { color: '#2563EB', bg: '#DBEAFE', icon: <InfoCircleOutlined /> },
}

function getMockRole() {
  const email = auth.currentUser?.email || ''
  const user  = mockAdminUsers.find(u => u.email === email)
  return user?.role || 'admin'
}

export default function NotificationBell({ dark }) {
  const [open, setOpen]         = useState(false)
  const [dismissed, setDismissed] = useState(new Set())
  const navigate = useNavigate()

  const role    = getMockRole()
  const all     = useNotifications(role)
  const visible = all.filter(n => !dismissed.has(n.id))

  const criticalCount = visible.filter(n => n.severity === 'critical').length
  const warningCount  = visible.filter(n => n.severity === 'warning').length
  const badgeColor    = criticalCount > 0 ? '#F65C7C' : warningCount > 0 ? '#D97706' : '#2563EB'

  const bg       = dark ? '#1f1f1f' : '#fff'
  const border   = dark ? '#303030' : '#f0f0f0'
  const textCol  = dark ? 'rgba(255,255,255,0.88)' : '#1f1f1f'
  const mutedCol = dark ? 'rgba(255,255,255,0.4)'  : '#999'
  const hoverBg  = dark ? 'rgba(255,255,255,0.05)' : '#fafafa'

  const dismissOne = (e, id) => {
    e.stopPropagation()
    setDismissed(prev => new Set([...prev, id]))
  }
  const dismissAll = () => setDismissed(new Set(all.map(n => n.id)))

  const content = (
    <div style={{ width: 340, background: bg, borderRadius: 8 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 10px', borderBottom: `1px solid ${border}` }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: textCol }}>
          Notificaciones
          {visible.length > 0 && (
            <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 400, color: mutedCol }}>
              ({visible.length})
            </span>
          )}
        </span>
        {visible.length > 0 && (
          <Typography.Link onClick={dismissAll} style={{ fontSize: 12 }}>
            Marcar todas como leídas
          </Typography.Link>
        )}
      </div>

      {/* Empty state */}
      {visible.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: '#DCFCE7', color: '#16A34A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 10px', fontSize: 18,
          }}>
            <CheckOutlined />
          </div>
          <span style={{ color: mutedCol, fontSize: 13 }}>Todo al día</span>
        </div>
      ) : (
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {visible.map(n => {
            const cfg = SEVERITY[n.severity]
            return (
              <div
                key={n.id}
                style={{ display: 'flex', gap: 10, padding: '11px 16px', borderBottom: `1px solid ${border}`, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => { navigate(n.link); setOpen(false) }}
              >
                {/* Icon */}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: cfg.bg, color: cfg.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 14, marginTop: 1,
                }}>
                  {cfg.icon}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: 13, color: textCol, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {n.desc}
                  </div>
                  <div style={{ fontSize: 12, color: mutedCol, marginTop: 1 }}>
                    {n.detail}
                  </div>
                </div>

                {/* Dismiss */}
                <Tooltip title="Marcar como leída" placement="left">
                  <div
                    style={{ color: mutedCol, fontSize: 13, lineHeight: 1, paddingTop: 3, flexShrink: 0, opacity: 0.7 }}
                    onClick={e => dismissOne(e, n.id)}
                  >
                    ✕
                  </div>
                </Tooltip>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      content={content}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      overlayStyle={{ padding: 0 }}
      overlayInnerStyle={{
        padding: 0,
        border: `1px solid ${border}`,
        borderRadius: 8,
        boxShadow: dark
          ? '0 8px 24px rgba(0,0,0,.6)'
          : '0 8px 24px rgba(0,0,0,.1)',
        overflow: 'hidden',
      }}
    >
      <Tooltip title="Notificaciones">
        <Badge
          count={visible.length}
          size="small"
          color={visible.length > 0 ? badgeColor : undefined}
        >
          <div style={{
            cursor: 'pointer',
            fontSize: 17,
            color: dark ? 'rgba(255,255,255,0.65)' : '#2E3953',
            display: 'flex',
            alignItems: 'center',
            padding: '0 2px',
          }}>
            <BellOutlined />
          </div>
        </Badge>
      </Tooltip>
    </Popover>
  )
}
