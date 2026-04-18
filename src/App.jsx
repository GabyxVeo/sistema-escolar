import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { School, Users, ClipboardCheck, FileText, BarChart3 } from 'lucide-react'
import Alumnos from './pages/Alumnos'
import Asistencia from './pages/Asistencia'
import Calificaciones from './pages/Calificaciones'
import Reportes from './pages/Reportes'
import Inicio from './pages/Inicio'
import './App.css'

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
  const esInicio = location.pathname === '/'
  const links = [
    { to: '/alumnos', icon: Users, label: 'Alumnos' },
    { to: '/asistencia', icon: ClipboardCheck, label: 'Asistencia' },
    { to: '/calificaciones', icon: FileText, label: 'Calificaciones' },
    { to: '/reportes', icon: BarChart3, label: 'Reportes' }
  ]
  return (
    <nav className="navbar">
      <Link to="/" style={{textDecoration:'none'}}>
        <h1><School size={28} style={{marginRight:'10px', verticalAlign:'middle'}} />Sistema Escolar</h1>
      </Link>
      {!esInicio && (
        <ul>
          {links.map(link => (
            <li key={link.to}>
              <Link to={link.to}
                style={{
                  background: location.pathname === link.to ? 'rgba(255,255,255,0.25)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                <link.icon size={18} />
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
}

function App() {
  return (
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
  )
}

export default App