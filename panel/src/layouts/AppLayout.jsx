import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Typography } from 'antd'
import {
  DashboardOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  TabletOutlined,
  UnorderedListOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons'

const { Sider, Header, Content } = Layout

const navItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/empresas',  icon: <BankOutlined />,               label: 'Empresas' },
  { key: '/licencias', icon: <SafetyCertificateOutlined />,  label: 'Licencias' },
  { key: '/visores',   icon: <TabletOutlined />,             label: 'Visores' },
  { key: '/eventos',   icon: <UnorderedListOutlined />,      label: 'Eventos' },
]

const userMenuItems = [
  {
    key: 'logout',
    icon: <LogoutOutlined />,
    label: 'Cerrar sesión',
    danger: true,
  },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const handleLogout = () => {
    localStorage.removeItem('xplash_admin')
    navigate('/login')
  }

  const adminEmail = localStorage.getItem('xplash_admin') || 'admin@xplash.com'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={220}
        style={{ background: '#1a1a2e' }}
      >
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography.Text style={{ color: '#e8173a', fontWeight: 700, fontSize: 13, letterSpacing: 3 }}>
            XPLASH
          </Typography.Text>
          <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>Panel de Licencias</div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          onClick={({ key }) => navigate(key)}
          items={navItems}
          style={{
            background: '#1a1a2e',
            border: 'none',
            marginTop: 8,
          }}
          theme="dark"
        />
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderBottom: '1px solid #f0f0f0' }}>
          <Dropdown
            menu={{ items: userMenuItems, onClick: ({ key }) => key === 'logout' && handleLogout() }}
            placement="bottomRight"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} style={{ background: '#e8173a' }} />
              <Typography.Text style={{ fontSize: 13 }}>{adminEmail}</Typography.Text>
            </div>
          </Dropdown>
        </Header>

        <Content style={{ padding: 28, background: '#f5f5f5' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
