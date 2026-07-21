import { createContext, useContext, useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme as antTheme } from 'antd'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
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
import Settings from './pages/Settings'
import Team from './pages/Team'

dayjs.locale('es')

export const ThemeContext = createContext({ dark: false, toggle: () => {} })
export const useAppTheme = () => useContext(ThemeContext)

function PrivateRoute({ user, children }) {
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('xplash_dark') === '1')
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u ?? null))
  }, [])

  useEffect(() => {
    document.body.classList.toggle('xplash-dark', dark)
  }, [dark])

  const toggle = () => setDark(prev => {
    const next = !prev
    localStorage.setItem('xplash_dark', next ? '1' : '0')
    return next
  })

  const theme = {
    algorithm: dark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
    token: {
      colorPrimary: '#F65C7C',
      colorLink: '#F65C7C',
      borderRadius: 6,
      ...(!dark && { colorText: '#2E3953' }),
    },
  }

  if (user === undefined) return null

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <ConfigProvider theme={theme} locale={esES}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute user={user}>
                <AppLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="empresas" element={<Companies />} />
            <Route path="licencias" element={<Licenses />} />
            <Route path="accesos" element={<Devices />} />
            <Route path="eventos" element={<Events />} />
            <Route path="equipo" element={<Team />} />
            <Route path="configuracion" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}
