import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Asistencia() {
  const [alumnos, setAlumnos] = useState([])
  const [gradoId, setGradoId] = useState(null)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
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
      alert('✅ Asistencia actualizada correctamente')
    } else {
      const registros = Object.entries(asistencias).map(([alumno_id, estado]) => ({
        alumno_id: parseInt(alumno_id), fecha, estado
      }))
      const { error } = await supabase.from('asistencia').insert(registros)
      if (error) {
        alert('Error al guardar la asistencia')
      } else {
        setModoEdicion(true)
        alert('✅ Asistencia guardada correctamente')
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
  }

  return (
    <div>
      <p className="titulo-pagina">📋 Control de Asistencia</p>

      <div className="card" style={{textAlign:'center'}}>
        <p style={{fontSize:'18px', fontWeight:'bold'}}>Grado 4 — Sección "C"</p>
        {modoEdicion && (
          <p style={{color:'#e65100', fontSize:'14px', marginTop:'5px'}}>
            ✏️ Editando asistencia ya registrada para esta fecha
          </p>
        )}
        <div style={{marginTop:'10px'}}>
          <label style={{fontWeight:'bold', marginRight:'10px'}}>Fecha:</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            style={{padding:'8px', borderRadius:'6px', border:'1px solid #ddd', fontSize:'15px'}} />
        </div>
      </div>

      {alumnos.length > 0 && (
        <>
          <div className="card" style={{display:'flex', gap:'30px', alignItems:'center', justifyContent:'center'}}>
            <span style={{color:'#2e7d32', fontWeight:'bold', fontSize:'16px'}}>✅ Asistencia (A): {totalA}</span>
            <span style={{color:'#e65100', fontWeight:'bold', fontSize:'16px'}}>🟡 Permiso (P): {totalP}</span>
            <span style={{color:'#c62828', fontWeight:'bold', fontSize:'16px'}}>❌ PSIN: {totalPSIN}</span>
          </div>

          <div className="card" style={{overflowX:'auto'}}>
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>NIE</th>
                  <th>Nombre del Estudiante</th>
                  <th style={{textAlign:'center'}}>A</th>
                  <th style={{textAlign:'center'}}>P</th>
                  <th style={{textAlign:'center'}}>PSIN</th>
                  <th style={{textAlign:'center'}}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {alumnos.map((a, index) => (
                  <tr key={a.id}>
                    <td>{index + 1}</td>
                    <td>{a.nie}</td>
                    <td>{a.apellido}, {a.nombre}</td>
                    <td style={{textAlign:'center'}}>
                      <input type="radio" name={`est-${a.id}`}
                        checked={asistencias[a.id] === 'A'}
                        onChange={() => cambiarEstado(a.id, 'A')} />
                    </td>
                    <td style={{textAlign:'center'}}>
                      <input type="radio" name={`est-${a.id}`}
                        checked={asistencias[a.id] === 'P'}
                        onChange={() => cambiarEstado(a.id, 'P')} />
                    </td>
                    <td style={{textAlign:'center'}}>
                      <input type="radio" name={`est-${a.id}`}
                        checked={asistencias[a.id] === 'PSIN'}
                        onChange={() => cambiarEstado(a.id, 'PSIN')} />
                    </td>
                    <td style={{textAlign:'center'}}>
                      <span style={{...colorEstado(asistencias[a.id]), padding:'4px 10px', borderRadius:'6px'}}>
                        {asistencias[a.id]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{textAlign:'center', marginTop:'20px'}}>
              <button className="btn btn-success" onClick={guardarAsistencia}>
                {modoEdicion ? '✏️ Actualizar Asistencia' : '💾 Guardar Asistencia del Día'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Asistencia