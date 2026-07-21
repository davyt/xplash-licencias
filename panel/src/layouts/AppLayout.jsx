import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Typography, Tooltip, Button, Drawer, Grid } from 'antd'
import {
  DashboardOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
  UnorderedListOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  TeamOutlined,
  SunOutlined,
  MoonOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAppTheme } from '../App'
import NotificationBell from '../components/NotificationBell'

const { Sider, Header, Content } = Layout
const { useBreakpoint } = Grid

const navItems = [
  { key: '/dashboard',      icon: <DashboardOutlined />,          label: 'Dashboard' },
  { key: '/empresas',       icon: <BankOutlined />,               label: 'Empresas' },
  { key: '/licencias',      icon: <SafetyCertificateOutlined />,  label: 'Licencias' },
  { key: '/accesos',        icon: <EyeOutlined />,                label: 'Accesos' },
  { key: '/eventos',        icon: <UnorderedListOutlined />,      label: 'Eventos' },
  { type: 'divider' },
  { key: '/equipo',         icon: <TeamOutlined />,               label: 'Equipo' },
  { key: '/configuracion',  icon: <SettingOutlined />,            label: 'Configuración' },
]

const userMenuItems = [{ key: 'logout', icon: <LogoutOutlined />, label: 'Cerrar sesión', danger: true }]

const SIDER_BG = '#24364F'

function SiderContent({ onNavigate }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <>
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <img
          src="https://experiencias.xplash.org/xplash_logo.svg"
          alt="Xplash"
          height="32"
          style={{ display: 'block', marginBottom: 4, filter: 'brightness(0) invert(1)' }}
        />
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Panel de Licencias</div>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        onClick={({ key }) => { navigate(key); onNavigate?.() }}
        items={navItems}
        style={{ background: SIDER_BG, border: 'none', marginTop: 8 }}
        theme="dark"
      />
    </>
  )
}

export default function AppLayout() {
  const navigate = useNavigate()
  const { dark, toggle } = useAppTheme()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogout = () => {
    signOut(auth)
    navigate('/login')
  }

  const adminEmail = auth.currentUser?.email || ''

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider width={220} style={{ background: SIDER_BG }}>
          <SiderContent />
        </Sider>
      )}

      <Drawer
        open={isMobile && drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="left"
        closable={false}
        styles={{ body: { padding: 0, background: SIDER_BG }, wrapper: { width: 220 } }}
      >
        <SiderContent onNavigate={() => setDrawerOpen(false)} />
      </Drawer>

      <Layout>
        <Header style={{
          background: dark ? '#141414' : '#fff',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: `1px solid ${dark ? '#303030' : '#f0f0f0'}`,
        }}>
          {isMobile && (
            <Button
              icon={<MenuOutlined />}
              type="text"
              onClick={() => setDrawerOpen(true)}
              style={{ color: dark ? 'rgba(255,255,255,0.65)' : '#2E3953' }}
            />
          )}

          <div style={{ flex: 1 }} />

          <Tooltip title={dark ? 'Modo claro' : 'Modo oscuro'}>
            <div onClick={toggle} style={{ cursor: 'pointer', fontSize: 16, color: dark ? 'rgba(255,255,255,0.65)' : '#2E3953', display: 'flex', alignItems: 'center' }}>
              {dark ? <SunOutlined /> : <MoonOutlined />}
            </div>
          </Tooltip>

          <NotificationBell dark={dark} />

          <Dropdown
            menu={{ items: userMenuItems, onClick: ({ key }) => key === 'logout' && handleLogout() }}
            placement="bottomRight"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} style={{ background: 'linear-gradient(90deg, #F65C7C, #F46E35)', flexShrink: 0 }} />
              {!isMobile && <Typography.Text style={{ fontSize: 13 }}>{adminEmail}</Typography.Text>}
            </div>
          </Dropdown>
        </Header>

        <Content style={{ padding: isMobile ? 16 : 28, background: dark ? '#1f1f1f' : '#f5f5f5' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
