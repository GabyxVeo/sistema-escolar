import { useNavigate } from 'react-router-dom'
import { Sunrise, Sun, Moon, Users, ClipboardCheck, FileText, BarChart3 } from 'lucide-react'

function Inicio() {
  const navigate = useNavigate()

  const hora = new Date().getHours()
  let saludo = ''
  let IconSaludo = Sunrise

  if (hora >= 5 && hora < 12) {
    saludo = '¡Buenos días, Profe Yenis!'
    IconSaludo = Sunrise
  } else if (hora >= 12 && hora < 18) {
    saludo = '¡Buenas tardes, Profe Yenis!'
    IconSaludo = Sun
  } else {
    saludo = '¡Buenas noches, Profe Yenis!'
    IconSaludo = Moon
  }

  const hora12 = new Date().getHours()
  let actividad = ''
  if (hora12 >= 5 && hora12 < 8) actividad = '¿Lista para comenzar el día?'
  else if (hora12 >= 8 && hora12 < 12) actividad = '¿Qué realizará en estos momentos?'
  else if (hora12 >= 12 && hora12 < 14) actividad = '¿Revisando calificaciones o reportes?'
  else if (hora12 >= 14 && hora12 < 18) actividad = '¿Qué realizará en estos momentos?'
  else actividad = 'Queremos que hay tenido un excelente día.'

  const opciones = [
    { to: '/alumnos', icon: Users, label: 'Nómina de Alumnos', desc: 'Ver y gestionar alumnos por grado' },
    { to: '/asistencia', icon: ClipboardCheck, label: 'Asistencia', desc: 'Pasar lista al Grado 4 "C"' },
    { to: '/calificaciones', icon: FileText, label: 'Calificaciones', desc: 'Registrar notas por trimestre' },
    { to: '/reportes', icon: BarChart3, label: 'Reportes', desc: 'Ver reporte mensual de asistencia' }
  ]

  return (
    <div style={{width:'100%', maxWidth:'800px', margin:'0 auto'}}>
      <div className="card" style={{textAlign:'center', padding:'40px 30px'}}>
        <IconSaludo size={48} style={{marginBottom:'10px', color:'#f59e0b'}} />
        <h2 style={{fontSize:'28px', fontWeight:'bold', color:'#2c3e50', marginBottom:'8px'}}>{saludo}</h2>
        <p style={{fontSize:'17px', color:'#666', marginBottom:'0'}}>{actividad}</p>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
        {opciones.map(op => (
          <div key={op.to} className="card"
            onClick={() => navigate(op.to)}
            style={{cursor:'pointer', textAlign:'center', padding:'30px 20px', transition:'transform 0.2s, box-shadow 0.2s'}}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'
            }}>
            <op.icon size={40} style={{marginBottom:'10px', color:'#1a73e8'}} />
            <p style={{fontSize:'17px', fontWeight:'bold', color:'#1a73e8', marginBottom:'6px'}}>{op.label}</p>
            <p style={{fontSize:'13px', color:'#888'}}>{op.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Inicio