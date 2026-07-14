import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import esES from 'antd/locale/es_ES'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import LoginPage from './pages/LoginPage'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import Companies from './pages/Companies'
import Licenses from './pages/Licenses'
import Devices from './pages/Devices'
import Events from './pages/Events'

dayjs.locale('es')

const theme = {
  token: {
    colorPrimary: '#e8173a',
    colorLink: '#e8173a',
    borderRadius: 6,
  },
}

const isLoggedIn = () => Boolean(localStorage.getItem('xplash_admin'))

function PrivateRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <ConfigProvider theme={theme} locale={esES}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="empresas" element={<Companies />} />
          <Route path="licencias" element={<Licenses />} />
          <Route path="visores" element={<Devices />} />
          <Route path="eventos" element={<Events />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ConfigProvider>
  )
}
