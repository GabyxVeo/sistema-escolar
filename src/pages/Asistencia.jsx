import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { ClipboardCheck, CheckCircle, XCircle, AlertCircle, Save, Pencil } from 'lucide-react'

function Asistencia() {
  const [alumnos, setAlumnos] = useState([])
  const [gradoId, setGradoId] = useState(null)
  const [fecha, setFecha] = useState(() => {
    const hoy = new Date()
    const anio = hoy.getFullYear()
    const mes = String(hoy.getMonth() + 1).padStart(2, '0')
    const dia = String(hoy.getDate()).padStart(2, '0')
    return `${anio}-${mes}-${dia}`
  })
  const [asistencias, setAsistencias] = useState({})
  const [modoEdicion, setModoEdicion] = useState(false)

  useEffect(() => { cargarGradoFijo() }, [])
  useEffect(() => { if (gradoId) cargarAlumnos() }, [gradoId])
  useEffect(() => { if (gradoId && alumnos.length > 0) verificarAsistencia() }, [fecha, alumnos])

  async function cargarGradoFijo() {
    const { data } = await supabase
      .from('grados').select('*')
      .eq('nombre', '4').eq('seccion', 'C').single()
    if (data) setGradoId(data.id)
  }

  async function cargarAlumnos() {
    const { data } = await supabase
      .from('alumnos').select('*')
      .eq('grado_id', gradoId).order('apellido')
    setAlumnos(data || [])
  }

  async function verificarAsistencia() {
    const inicial = {}
    alumnos.forEach(a => { inicial[a.id] = 'A' })
    const { data } = await supabase
      .from('asistencia').select('*')
      .eq('fecha', fecha)
      .in('alumno_id', alumnos.map(a => a.id))
    if (data && data.length > 0) {
      setModoEdicion(true)
      data.forEach(a => { inicial[a.alumno_id] = a.estado })
    } else {
      setModoEdicion(false)
    }
    setAsistencias(inicial)
  }

  async function guardarAsistencia() {
    if (modoEdicion) {
      for (const [alumno_id, estado] of Object.entries(asistencias)) {
        await supabase.from('asistencia')
          .update({ estado })
          .eq('alumno_id', parseInt(alumno_id))
          .eq('fecha', fecha)
      }
      window.Swal.fire({icon: 'success', title: 'Éxito', text: 'Asistencia actualizada correctamente'})
    } else {
      const registros = Object.entries(asistencias).map(([alumno_id, estado]) => ({
        alumno_id: parseInt(alumno_id), fecha, estado
      }))
      const { error } = await supabase.from('asistencia').insert(registros)
      if (error) {
        window.Swal.fire({icon: 'error', title: 'Error', text: 'Error al guardar la asistencia'})
      } else {
        setModoEdicion(true)
        window.Swal.fire({icon: 'success', title: 'Éxito', text: 'Asistencia guardada correctamente'})
      }
    }
  }

  function cambiarEstado(alumnoId, estado) {
    setAsistencias({ ...asistencias, [alumnoId]: estado })
  }

  const totalA = Object.values(asistencias).filter(e => e === 'A').length
  const totalP = Object.values(asistencias).filter(e => e === 'P').length
  const totalPSIN = Object.values(asistencias).filter(e => e === 'PSIN').length

  function colorEstado(estado) {
    if (estado === 'A') return { background: '#e8f5e9', color: '#2e7d32', fontWeight: 'bold' }
    if (estado === 'P') return { background: '#fff3e0', color: '#e65100', fontWeight: 'bold' }
    if (estado === 'PSIN') return { background: '#ffebee', color: '#c62828', fontWeight: 'bold' }
    return {}
  }

  return (
    <div style={{width:'100%'}}>
      <p className="titulo-pagina"><ClipboardCheck style={{marginRight:'8px'}} />Control de Asistencia</p>

      <div className="card" style={{textAlign:'center', maxWidth:'500px', margin:'0 auto 24px auto'}}>
        <p style={{fontSize:'20px', fontWeight:'bold', color:'#2c3e50'}}>Grado 4 — Sección "C"</p>
        {modoEdicion && (
          <p style={{color:'#e65100', fontSize:'15px', marginTop:'6px'}}>
            <Pencil style={{marginRight:'6px'}} />Editando asistencia ya registrada para esta fecha
          </p>
        )}
        <div style={{marginTop:'12px', display:'flex', alignItems:'center', justifyContent:'center', gap:'12px'}}>
          <label style={{fontWeight:'bold', fontSize:'16px'}}>Fecha:</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            style={{padding:'8px 12px', borderRadius:'6px', border:'1px solid #ddd', fontSize:'16px', width:'auto', marginBottom:'0'}} />
        </div>
      </div>

      {alumnos.length > 0 && (
        <>
          <div className="card" style={{display:'flex', gap:'30px', alignItems:'center', justifyContent:'center', maxWidth:'500px', margin:'0 auto 16px auto'}}>
            <span style={{color:'#2e7d32', fontWeight:'bold', fontSize:'17px'}}><CheckCircle style={{marginRight:'6px'}} />Asistencia (A): {totalA}</span>
            <span style={{color:'#e65100', fontWeight:'bold', fontSize:'17px'}}><AlertCircle style={{marginRight:'6px'}} />Permiso (P): {totalP}</span>
            <span style={{color:'#c62828', fontWeight:'bold', fontSize:'17px'}}><XCircle style={{marginRight:'6px'}} />PSIN: {totalPSIN}</span>
          </div>

          <div className="card">
            <table className="table-desktop">
              <thead>
                <tr>
                  <th style={{background:'#1a73e8', color:'white', padding:'10px', textAlign:'center', fontSize:'15px', whiteSpace:'nowrap'}}>N°</th>
                  <th style={{background:'#1a73e8', color:'white', padding:'10px', textAlign:'left', fontSize:'15px', whiteSpace:'nowrap', width:'175px'}}>Nombre del Estudiante</th>
                  <th style={{background:'#1a73e8', color:'white', padding:'10px 6px', textAlign:'center', fontSize:'15px', whiteSpace:'nowrap'}}>A</th>
                  <th style={{background:'#1a73e8', color:'white', padding:'10px 6px', textAlign:'center', fontSize:'15px', whiteSpace:'nowrap'}}>P</th>
                  <th style={{background:'#1a73e8', color:'white', padding:'10px 6px', textAlign:'center', fontSize:'15px', whiteSpace:'nowrap'}}>PSIN</th>
                  <th style={{background:'#1a73e8', color:'white', padding:'10px 6px', textAlign:'center', fontSize:'15px', whiteSpace:'nowrap'}}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {alumnos.map((a, index) => (
                  <tr key={a.id}>
                    <td style={{padding:'10px', fontSize:'14px', borderBottom:'1px solid #edf2f7', textAlign:'center'}}>{index + 1}</td>
                    <td style={{padding:'10px', fontSize:'15px', borderBottom:'1px solid #edf2f7', whiteSpace:'nowrap', width:'175px'}}>{a.apellido}, {a.nombre}</td>
                    <td style={{padding:'10px 6px', textAlign:'center', borderBottom:'1px solid #edf2f7'}}>
                      <input type="radio" name={`est-${a.id}`}
                        checked={asistencias[a.id] === 'A'}
                        onChange={() => cambiarEstado(a.id, 'A')}
                        style={{width:'18px', height:'18px', cursor:'pointer', margin:0, padding:0}} />
                    </td>
                    <td style={{padding:'10px 6px', textAlign:'center', borderBottom:'1px solid #edf2f7'}}>
                      <input type="radio" name={`est-${a.id}`}
                        checked={asistencias[a.id] === 'P'}
                        onChange={() => cambiarEstado(a.id, 'P')}
                        style={{width:'18px', height:'18px', cursor:'pointer', margin:0, padding:0}} />
                    </td>
                    <td style={{padding:'10px 6px', textAlign:'center', borderBottom:'1px solid #edf2f7'}}>
                      <input type="radio" name={`est-${a.id}`}
                        checked={asistencias[a.id] === 'PSIN'}
                        onChange={() => cambiarEstado(a.id, 'PSIN')}
                        style={{width:'18px', height:'18px', cursor:'pointer', margin:0, padding:0}} />
                    </td>
                    <td style={{padding:'10px 6px', textAlign:'center', borderBottom:'1px solid #edf2f7'}}>
                      <span style={{...colorEstado(asistencias[a.id]), padding:'5px 8px', borderRadius:'6px', fontSize:'15px'}}>
                        {asistencias[a.id]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="table-mobile">
              {alumnos.map((a, index) => (
                <div key={a.id} className="table-row">
                  <div className="table-row-header">
                    <span className="table-row-number">{index + 1}</span>
                    <span className="table-row-title">{a.apellido}, {a.nombre}</span>
                  </div>
                  <div className="table-row-data" style={{gridTemplateColumns: 'repeat(3, 1fr)'}}>
                    <div className="table-row-item" style={{alignItems: 'center'}}>
                      <label style={{cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'}}>
                        <input type="radio" name={`est-mobile-${a.id}`}
                          checked={asistencias[a.id] === 'A'}
                          onChange={() => cambiarEstado(a.id, 'A')}
                          style={{width:'20px', height:'20px', cursor:'pointer'}} />
                        <span style={{color: '#2e7d32', fontWeight: 'bold'}}>A</span>
                      </label>
                    </div>
                    <div className="table-row-item" style={{alignItems: 'center'}}>
                      <label style={{cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'}}>
                        <input type="radio" name={`est-mobile-${a.id}`}
                          checked={asistencias[a.id] === 'P'}
                          onChange={() => cambiarEstado(a.id, 'P')}
                          style={{width:'20px', height:'20px', cursor:'pointer'}} />
                        <span style={{color: '#e65100', fontWeight: 'bold'}}>P</span>
                      </label>
                    </div>
                    <div className="table-row-item" style={{alignItems: 'center'}}>
                      <label style={{cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'}}>
                        <input type="radio" name={`est-mobile-${a.id}`}
                          checked={asistencias[a.id] === 'PSIN'}
                          onChange={() => cambiarEstado(a.id, 'PSIN')}
                          style={{width:'20px', height:'20px', cursor:'pointer'}} />
                        <span style={{color: '#c62828', fontWeight: 'bold'}}>PSIN</span>
                      </label>
                    </div>
                  </div>
                  <div className="table-row-item">
                    <span className="table-row-label">Estado Actual</span>
                    <span style={{...colorEstado(asistencias[a.id]), padding:'8px 16px', borderRadius:'8px', fontWeight: 'bold', textAlign: 'center'}}>
                      {asistencias[a.id]}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{textAlign:'center', marginTop:'20px'}}>
              <button className="btn btn-success" style={{padding:'12px 40px', fontSize:'16px'}} onClick={guardarAsistencia}>
                {modoEdicion ? <><Pencil style={{marginRight:'6px'}} />Actualizar Asistencia</> : <><Save style={{marginRight:'6px'}} />Guardar Asistencia del Día</>}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Asistencia