import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Alumnos from './pages/Alumnos'
import Asistencia from './pages/Asistencia'
import Calificaciones from './pages/Calificaciones'
import Reportes from './pages/Reportes'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <h1>🏫 Sistema Escolar</h1>
          <ul>
            <li><Link to="/">Alumnos</Link></li>
            <li><Link to="/asistencia">Asistencia</Link></li>
            <li><Link to="/calificaciones">Calificaciones</Link></li>
            <li><Link to="/reportes">Reportes</Link></li>
          </ul>
        </nav>
        <div className="contenido">
          <Routes>
            <Route path="/" element={<Alumnos />} />
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