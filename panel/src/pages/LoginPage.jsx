import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, Alert } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'

const DEMO_USER = 'admin@xplash.com'
const DEMO_PASS = 'xplash2026'

export default function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const onFinish = async ({ email, password }) => {
    setLoading(true)
    setError(null)
    try {
      // TODO: reemplazar con Firebase Auth real
      await new Promise(r => setTimeout(r, 600))
      if (email === DEMO_USER && password === DEMO_PASS) {
        localStorage.setItem('xplash_admin', email)
        navigate('/dashboard')
      } else {
        setError('Email o contraseña incorrectos')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a2e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Card style={{ width: 380, borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Typography.Text style={{ color: '#e8173a', fontWeight: 700, fontSize: 14, letterSpacing: 3 }}>
            XPLASH
          </Typography.Text>
          <Typography.Title level={4} style={{ margin: '8px 0 0', color: '#1a1a2e' }}>
            Panel de Licencias
          </Typography.Title>
        </div>

        {error && <Alert message={error} type="error" style={{ marginBottom: 16 }} />}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Ingresá tu email' }, { type: 'email', message: 'Email inválido' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Ingresá tu contraseña' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Contraseña" size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              style={{ background: '#e8173a', borderColor: '#e8173a' }}
            >
              Ingresar
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
