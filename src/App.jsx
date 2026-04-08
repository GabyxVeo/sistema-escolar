import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Alumnos from './pages/Alumnos'
import Asistencia from './pages/Asistencia'
import Calificaciones from './pages/Calificaciones'
import Reportes from './pages/Reportes'
import Inicio from './pages/Inicio'
import './App.css'

function NavBar() {
  const location = useLocation()
  const esInicio = location.pathname === '/'
  const links = [
    { to: '/alumnos', label: '👨‍🎓 Alumnos' },
    { to: '/asistencia', label: '📋 Asistencia' },
    { to: '/calificaciones', label: '📝 Calificaciones' },
    { to: '/reportes', label: '📊 Reportes' }
  ]
  return (
    <nav className="navbar">
      <Link to="/" style={{textDecoration:'none'}}>
        <h1>🏫 Sistema Escolar</h1>
      </Link>
      {!esInicio && (
        <ul>
          {links.map(link => (
            <li key={link.to}>
              <Link to={link.to}
                style={{
                  background: location.pathname === link.to ? 'rgba(255,255,255,0.25)' : 'transparent'
                }}>
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