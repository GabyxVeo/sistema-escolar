import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, createContext, useContext, useCallback, useMemo, useRef } from 'react'
import { School, Users, ClipboardCheck, FileText, BarChart3 } from 'lucide-react'
import Alumnos from './pages/Alumnos'
import Asistencia from './pages/Asistencia'
import Calificaciones from './pages/Calificaciones'
import Reportes from './pages/Reportes'
import Inicio from './pages/Inicio'
import './App.css'

const UnsavedContext = createContext({})

export function useUnsaved() {
  return useContext(UnsavedContext)
}

function TituloPagina() {
  const location = useLocation()
  const titulos = {
    '/': 'Inicio',
    '/alumnos': 'Nómina de Alumnos',
    '/asistencia': 'Control de Asistencia',
    '/calificaciones': 'Calificaciones',
    '/reportes': 'Reportes'
  }
  useEffect(() => {
    const titulo = titulos[location.pathname] || 'Sistema Escolar'
    document.title = `${titulo} - Prof. Yenis`
  }, [location.pathname])
  return null
}

function NavBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { checkUnsaved } = useContext(UnsavedContext)
  const esInicio = location.pathname === '/'
  const links = [
    { to: '/alumnos', icon: Users, label: 'Alumnos' },
    { to: '/asistencia', icon: ClipboardCheck, label: 'Asistencia' },
    { to: '/calificaciones', icon: FileText, label: 'Calificaciones' },
    { to: '/reportes', icon: BarChart3, label: 'Reportes' }
  ]

  async function handleNav(e, to) {
    e.preventDefault()
    if (await checkUnsaved()) navigate(to)
  }

  return (
    <nav className="navbar">
      <Link to="/" style={{ textDecoration: 'none' }} onClick={async (e) => {
        e.preventDefault()
        if (await checkUnsaved()) navigate('/')
      }}>
        <h1><School size={28} style={{ marginRight: '10px', verticalAlign: 'middle' }} />Sistema Escolar</h1>
      </Link>
      {!esInicio && (
        <ul>
          {links.map(link => (
            <li key={link.to}>
              <a
                href={link.to}
                onClick={(e) => handleNav(e, link.to)}
                style={{
                  background: location.pathname === link.to ? 'rgba(255,255,255,0.25)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  cursor: 'pointer'
                }}
              >
                <link.icon size={18} />
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
}

function App() {
  // Usamos un ref para guardar los checks sin provocar re-renders
  const checksRef = useRef([])

  // useCallback garantiza que registerUnsaved y checkUnsaved
  // nunca se recreen entre renders → elimina el loop infinito
  const registerUnsaved = useCallback((checkFn) => {
    checksRef.current = [...checksRef.current, checkFn]
    return () => {
      checksRef.current = checksRef.current.filter(fn => fn !== checkFn)
    }
  }, []) // sin dependencias → se crea una sola vez

  const checkUnsaved = useCallback(async () => {
    for (const check of checksRef.current) {
      const result = await check()
      if (!result) return false
    }
    return true
  }, []) // sin dependencias → se crea una sola vez

  // useMemo evita que el objeto value se recree en cada render
  const contextValue = useMemo(
    () => ({ registerUnsaved, checkUnsaved }),
    [registerUnsaved, checkUnsaved]
  )

  return (
    <UnsavedContext.Provider value={contextValue}>
      <BrowserRouter>
        <div className="app">
          <TituloPagina />
          <NavBar />
          <div className="contenido">
            <Routes>
              <Route path="/" element={<Inicio />} />
              <Route path="/alumnos" element={<Alumnos />} />
              <Route path="/asistencia" element={<Asistencia />} />
              <Route path="/calificaciones" element={<Calificaciones />} />
              <Route path="/reportes" element={<Reportes />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </UnsavedContext.Provider>
  )
}

export default App