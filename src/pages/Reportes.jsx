import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { BarChart3, Loader2, CheckCircle, AlertCircle, XCircle } from 'lucide-react'

function Reportes() {
  const [mes, setMes] = useState('')
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [reporte, setReporte] = useState([])
  const [semanas, setSemanas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [gradoId, setGradoId] = useState(null)

  useEffect(() => { cargarGradoFijo() }, [])

  async function cargarGradoFijo() {
    const { data } = await supabase
      .from('grados').select('*')
      .eq('nombre', '4').eq('seccion', 'C').single()
    if (data) setGradoId(data.id)
  }

  function obtenerSemanas(anio, mes) {
    const diasNombre = ['', 'L', 'M', 'MI', 'J', 'V']
    const totalDias = new Date(anio, mes, 0).getDate()
    const mesesNombre = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    const semanas = []
    let semanaActual = null
    let numSemana = 1

    for (let d = 1; d <= totalDias; d++) {
      const fecha = new Date(anio, mes - 1, d)
      const diaSemana = fecha.getDay()
      if (diaSemana === 0 || diaSemana === 6) continue

      if (diaSemana === 1 || semanaActual === null) {
        if (semanaActual !== null) semanas.push(semanaActual)
        semanaActual = { numero: numSemana++, inicio: d, fin: d, label: '', dias: [] }
      }

      semanaActual.fin = d
      semanaActual.dias.push({
        fecha: `${anio}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
        label: diasNombre[diaSemana],
        dia: d
      })
    }

    if (semanaActual !== null) semanas.push(semanaActual)
    semanas.forEach(s => { s.label = `${s.inicio}-${s.fin} ${mesesNombre[mes-1]}` })
    return semanas
  }

  async function generarReporte() {
    if (!mes) { alert('Por favor seleccioná el mes'); return }
    setCargando(true)

    const semanasData = obtenerSemanas(parseInt(anio), parseInt(mes))
    setSemanas(semanasData)

    const { data: alumnos } = await supabase
      .from('alumnos').select('*')
      .eq('grado_id', gradoId).order('apellido')

    const mesStr = mes.padStart(2, '0')
    const fechaInicio = `${anio}-${mesStr}-01`
    const fechaFin = `${anio}-${mesStr}-31`

    const reporteData = await Promise.all(alumnos.map(async (alumno, index) => {
      const { data: asistenciasAlumno } = await supabase
        .rpc('get_asistencia_mes', {
          p_alumno_id: alumno.id,
          p_fecha_inicio: fechaInicio,
          p_fecha_fin: fechaFin
        })

      const asistenciaMap = {}
      asistenciasAlumno?.forEach(a => { asistenciaMap[a.fecha] = a.estado })

      const totalDiasHabiles = semanasData.reduce((acc, s) => acc + s.dias.length, 0)
      const totalA = Object.values(asistenciaMap).filter(e => e === 'A').length
      const totalP = Object.values(asistenciaMap).filter(e => e === 'P').length
      const totalPSIN = Object.values(asistenciaMap).filter(e => e === 'PSIN').length
      const porcentaje = totalDiasHabiles > 0 ? Math.round((totalA / totalDiasHabiles) * 100) : 0

      return {
        numero: index + 1,
        nombre: `${alumno.apellido}, ${alumno.nombre}`,
        asistenciaMap, totalA, totalP, totalPSIN, totalDiasHabiles, porcentaje
      }
    }))

    setReporte(reporteData)
    setCargando(false)
  }

  const meses = [
    {valor:'1', nombre:'Enero'}, {valor:'2', nombre:'Febrero'},
    {valor:'3', nombre:'Marzo'}, {valor:'4', nombre:'Abril'},
    {valor:'5', nombre:'Mayo'}, {valor:'6', nombre:'Junio'},
    {valor:'7', nombre:'Julio'}, {valor:'8', nombre:'Agosto'},
    {valor:'9', nombre:'Septiembre'}, {valor:'10', nombre:'Octubre'},
    {valor:'11', nombre:'Noviembre'}, {valor:'12', nombre:'Diciembre'}
  ]

  const mesNombre = meses.find(m => m.valor === mes)?.nombre || ''

  function colorEstado(estado) {
    if (estado === 'A') return { color: '#2e7d32', fontWeight: 'bold' }
    if (estado === 'P') return { color: '#e65100', fontWeight: 'bold' }
    if (estado === 'PSIN') return { color: '#c62828', fontWeight: 'bold' }
    return { color: '#bbb' }
  }

  return (
    <div>
      <p className="titulo-pagina"><BarChart3 style={{marginRight:'8px'}} />Reporte Mensual de Asistencia</p>
      <p style={{textAlign:'center', fontSize:'15px', fontWeight:'bold', color:'#1a73e8', marginBottom:'20px'}}>
        Grado 4 — Sección "C"
      </p>

      {/* Card filtros más angosto y centrado */}
      <div className="card" style={{textAlign:'center', maxWidth:'400px', margin:'0 auto 20px auto'}}>
        <div style={{display:'flex', justifyContent:'center', gap:'20px', flexWrap:'wrap'}}>
          <div>
            <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', fontSize:'15px'}}>Mes</label>
            <select value={mes} onChange={e => setMes(e.target.value)}
              style={{padding:'8px', borderRadius:'6px', border:'1px solid #ddd', fontSize:'15px'}}>
              <option value="">-- Seleccionar mes --</option>
              {meses.map(m => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', fontSize:'15px'}}>Año</label>
            <input type="number" value={anio} onChange={e => setAnio(e.target.value)}
              style={{padding:'8px', borderRadius:'6px', border:'1px solid #ddd', fontSize:'15px', width:'100px'}} />
          </div>
        </div>
        <button className="btn btn-primary" style={{marginTop:'15px'}} onClick={generarReporte}>
          {cargando ? <><Loader2 style={{marginRight:'6px', animation:'spin 1s linear infinite'}} className="spin" />Cargando...</> : <><BarChart3 style={{marginRight:'6px'}} />Generar Reporte</>}
        </button>
      </div>

      {reporte.length > 0 && (
        <div className="card" style={{overflowX:'auto'}}>
          <div style={{textAlign:'center', marginBottom:'15px'}}>
            <p style={{fontWeight:'bold', fontSize:'18px'}}>CONTROL DE ASISTENCIA — AÑO: {anio}</p>
            <p style={{fontSize:'15px'}}>GRADO: 4 Sección: "C" — {mesNombre.toUpperCase()}</p>
          </div>

          <table className="table-desktop">
            <thead>
              <tr>
                <th rowSpan={2} style={{border:'1px solid #ccc', padding:'6px 4px', minWidth:'28px'}}>N°</th>
                <th rowSpan={2} style={{border:'1px solid #ccc', padding:'6px 8px', minWidth:'140px', textAlign:'left'}}>Nombre del Estudiante</th>
                {semanas.map((s, i) => (
                  <th key={i} colSpan={s.dias.length}
                    style={{border:'1px solid #ccc', padding:'5px 3px', textAlign:'center', background:'#1565c0'}}>
                    Sem {s.numero}<br/>({s.label})
                  </th>
                ))}
                <th rowSpan={2} style={{border:'1px solid #ccc', padding:'6px 4px', textAlign:'center', background:'#e8f5e9', color:'#2e7d32', minWidth:'36px'}}>A</th>
                <th rowSpan={2} style={{border:'1px solid #ccc', padding:'6px 4px', textAlign:'center', background:'#fff3e0', color:'#e65100', minWidth:'36px'}}>P</th>
                <th rowSpan={2} style={{border:'1px solid #ccc', padding:'6px 4px', textAlign:'center', background:'#ffebee', color:'#c62828', minWidth:'44px'}}>PSIN</th>
                <th rowSpan={2} style={{border:'1px solid #ccc', padding:'6px 4px', textAlign:'center', background:'#1a73e8', color:'white', minWidth:'55px'}}>%</th>
              </tr>
              <tr>
                {semanas.map(s => s.dias.map(d => (
                  <th key={d.fecha} style={{border:'1px solid #ccc', padding:'5px 2px', textAlign:'center', background:'#1976d2', color:'white', fontWeight:'bold', minWidth:'28px'}}>
                    {d.label}
                  </th>
                )))}
              </tr>
            </thead>
            <tbody>
              {reporte.map((a, idx) => (
                <tr key={a.numero}>
                  <td style={{border:'1px solid #ccc', padding:'6px 4px', textAlign:'center'}}>{a.numero}</td>
                  <td style={{border:'1px solid #ccc', padding:'6px 8px'}}>{a.nombre}</td>
                  {semanas.map(s => s.dias.map(d => (
                    <td key={d.fecha} style={{border:'1px solid #ccc', padding:'5px 2px', textAlign:'center', ...colorEstado(a.asistenciaMap[d.fecha])}}>
                      {a.asistenciaMap[d.fecha] || '-'}
                    </td>
                  )))}
                  <td style={{border:'1px solid #ccc', padding:'6px 4px', textAlign:'center', color:'#2e7d32', fontWeight:'bold'}}>{a.totalA}</td>
                  <td style={{border:'1px solid #ccc', padding:'6px 4px', textAlign:'center', color:'#e65100', fontWeight:'bold'}}>{a.totalP}</td>
                  <td style={{border:'1px solid #ccc', padding:'6px 4px', textAlign:'center', color:'#c62828', fontWeight:'bold'}}>{a.totalPSIN}</td>
                  <td style={{border:'1px solid #ccc', padding:'6px 4px', textAlign:'center', fontWeight:'bold',
                    color: a.porcentaje >= 75 ? '#2e7d32' : a.porcentaje >= 50 ? '#e65100' : '#c62828'}}>
                    {a.porcentaje}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="table-mobile">
            {reporte.map((a, idx) => (
              <div key={a.numero} className="table-row">
                <div className="table-row-header">
                  <span className="table-row-number">{a.numero}</span>
                  <span className="table-row-title">{a.nombre}</span>
                </div>
                <div className="table-row-data" style={{gridTemplateColumns: 'repeat(3, 1fr)'}}>
                  <div className="table-row-item" style={{alignItems: 'center'}}>
                    <span className="table-row-label" style={{color:'#2e7d32'}}>Asistió</span>
                    <span style={{fontSize:'1.25rem', fontWeight:'bold', color:'#2e7d32'}}>{a.totalA}</span>
                  </div>
                  <div className="table-row-item" style={{alignItems: 'center'}}>
                    <span className="table-row-label" style={{color:'#e65100'}}>Permiso</span>
                    <span style={{fontSize:'1.25rem', fontWeight:'bold', color:'#e65100'}}>{a.totalP}</span>
                  </div>
                  <div className="table-row-item" style={{alignItems: 'center'}}>
                    <span className="table-row-label" style={{color:'#c62828'}}>PSIN</span>
                    <span style={{fontSize:'1.25rem', fontWeight:'bold', color:'#c62828'}}>{a.totalPSIN}</span>
                  </div>
                </div>
                <div className="table-row-item">
                  <span className="table-row-label">% Asistencia</span>
                  <span style={{
                    fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center',
                    color: a.porcentaje >= 75 ? '#2e7d32' : a.porcentaje >= 50 ? '#e65100' : '#c62828'
                  }}>
                    {a.porcentaje}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{marginTop:'20px', padding:'15px', background:'#f5f5f5', borderRadius:'8px'}}>
            <p style={{fontWeight:'bold', fontSize:'16px'}}>Resumen del mes:</p>
            <p style={{fontSize:'15px'}}>Total alumnos: {reporte.length}</p>
            <p style={{fontSize:'15px'}}>Promedio de asistencia: {Math.round(reporte.reduce((acc, a) => acc + a.porcentaje, 0) / reporte.length)}%</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reportes