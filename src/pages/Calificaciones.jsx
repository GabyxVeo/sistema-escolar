import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle, HeightRule } from 'docx'
import { saveAs } from 'file-saver'
import { FileText, Save, FileDown, Plus, Trash2 } from 'lucide-react'
import { useUnsaved } from '../App'

const esExamen = (nombre) => nombre.trim().toLowerCase().includes('examen trimestral')

const NOMBRES_GRADO = { '4': 'CUARTO', '5': 'QUINTO', '6': 'SEXTO' }

function calcularPesos(actividades) {
  const conExamen = actividades.some(a => esExamen(a.nombre))
  return actividades.map(a => {
    if (esExamen(a.nombre)) return { ...a, peso: 0.30 }
    const otras = actividades.filter(x => !esExamen(x.nombre)).length
    const pesoResto = conExamen ? 0.70 : 1.00
    return { ...a, peso: otras > 0 ? pesoResto / otras : 0 }
  })
}

function Calificaciones() {
  const { registerUnsaved } = useUnsaved()
  const [grados, setGrados] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [gradoSeleccionado, setGradoSeleccionado] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [notas, setNotas] = useState({})
  const [notasOriginales, setNotasOriginales] = useState({})
  const [hayCambiosSinGuardar, setHayCambiosSinGuardar] = useState(false)
  const [actividades, setActividades] = useState([])
  const [cargandoActividades, setCargandoActividades] = useState(false)

  const hayCambiosRef = useRef(false)
  const materia = 'Ciudadanía y Valores'

  const gradoActual = grados.find(g => g.id === parseInt(gradoSeleccionado))
  const actividadesConPeso = calcularPesos(actividades)
  const nombreGradoWord = NOMBRES_GRADO[gradoActual?.nombre] || `GRADO ${gradoActual?.nombre}`

  useEffect(() => { cargarGrados() }, [])
  useEffect(() => { if (gradoSeleccionado) cargarAlumnos() }, [gradoSeleccionado])
  useEffect(() => { if (gradoSeleccionado && periodo) cargarActividades() }, [gradoSeleccionado, periodo])
  useEffect(() => {
    if (gradoSeleccionado && periodo && alumnos.length > 0) cargarCalificaciones()
  }, [gradoSeleccionado, periodo, alumnos.length, actividades.length])

  useEffect(() => { hayCambiosRef.current = hayCambiosSinGuardar }, [hayCambiosSinGuardar])
  useEffect(() => {
    if (!hayCambiosSinGuardar) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hayCambiosSinGuardar])
  useEffect(() => {
    setHayCambiosSinGuardar(JSON.stringify(notas) !== JSON.stringify(notasOriginales))
  }, [notas, notasOriginales])
  useEffect(() => {
    return registerUnsaved(async () => {
      if (!hayCambiosRef.current) return true
      const result = await window.Swal.fire({
        icon: 'warning', title: 'Datos sin guardar',
        text: 'Hay calificaciones que no se han guardado. ¿Desea continuar y perder los cambios?',
        showCancelButton: true, confirmButtonText: 'Continuar', cancelButtonText: 'Quedarme aquí',
        confirmButtonColor: '#e65100', reverseButtons: true
      })
      return result.isConfirmed
    })
  }, [registerUnsaved])

  async function cargarGrados() {
    const { data } = await supabase.from('grados').select('*')
    setGrados(data || [])
  }

  async function cargarAlumnos() {
    const { data } = await supabase.from('alumnos').select('*')
      .eq('grado_id', gradoSeleccionado).order('apellido')
    setAlumnos(data || [])
  }

  async function cargarActividades() {
    setCargandoActividades(true)
    const { data } = await supabase.from('actividades_definidas').select('*')
      .eq('grado_id', parseInt(gradoSeleccionado)).eq('periodo', periodo).order('orden')
    setActividades(data || [])
    setCargandoActividades(false)
  }

  async function agregarActividad() {
    const orden = actividades.length
    const { data, error } = await supabase.from('actividades_definidas')
      .insert([{ grado_id: parseInt(gradoSeleccionado), periodo, nombre: `Actividad ${orden + 1}`, orden }])
      .select()
    if (!error && data) setActividades(prev => [...prev, data[0]])
  }

  async function actualizarNombreActividad(id, nombre) {
    setActividades(prev => prev.map(a => a.id === id ? { ...a, nombre } : a))
    await supabase.from('actividades_definidas').update({ nombre }).eq('id', id)
  }

  async function eliminarActividad(id) {
    const result = await window.Swal.fire({
      icon: 'warning', title: '¿Eliminar actividad?',
      text: 'Se eliminarán también las notas de esta actividad para todos los alumnos.',
      showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33', reverseButtons: true
    })
    if (!result.isConfirmed) return
    await supabase.from('calificaciones').delete()
      .eq('tipo', `actividad_${id}`).eq('materia', materia).eq('periodo', periodo)
    await supabase.from('actividades_definidas').delete().eq('id', id)
    setActividades(prev => prev.filter(a => a.id !== id))
    setNotas(prev => {
      const nuevas = { ...prev }
      Object.keys(nuevas).forEach(alumnoId => {
        const copia = { ...nuevas[alumnoId] }
        delete copia[`actividad_${id}`]
        nuevas[alumnoId] = copia
      })
      return nuevas
    })
  }

  async function cargarCalificaciones() {
    const notasNuevas = {}
    alumnos.forEach(a => {
      notasNuevas[a.id] = {}
      actividades.forEach(act => { notasNuevas[a.id][`actividad_${act.id}`] = '' })
    })
    for (const alumno of alumnos) {
      const { data } = await supabase.from('calificaciones').select('*')
        .eq('alumno_id', alumno.id).eq('materia', materia).eq('periodo', periodo)
      if (data && data.length > 0) {
        data.forEach(c => { if (notasNuevas[alumno.id] !== undefined) notasNuevas[alumno.id][c.tipo] = c.nota })
      }
    }
    setNotas(notasNuevas)
    setNotasOriginales(JSON.parse(JSON.stringify(notasNuevas)))
    setHayCambiosSinGuardar(false)
  }

  function limpiarNotas() {
    setNotas({})
    setNotasOriginales({})
    setActividades([])
    setHayCambiosSinGuardar(false)
  }

  function calcularNota(alumnoId) {
    const n = notas[alumnoId]
    if (!n || actividadesConPeso.length === 0) return null
    let total = 0
    let pesoUsado = 0
    for (const act of actividadesConPeso) {
      const val = n[`actividad_${act.id}`]
      if (val !== '' && val !== null && val !== undefined) {
        total += parseFloat(val) * act.peso
        pesoUsado += act.peso
      }
    }
    if (pesoUsado === 0) return null
    return (total / pesoUsado).toFixed(2)
  }

  async function guardarCalificaciones() {
    if (!periodo) {
      window.Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Por favor seleccioná el periodo' })
      return
    }
    let hayNotas = false
    for (const alumno of alumnos) {
      for (const act of actividades) {
        const key = `actividad_${act.id}`
        const nota = notas[alumno.id]?.[key]
        if (nota !== '' && nota !== null && nota !== undefined) {
          hayNotas = true
          await supabase.from('calificaciones').upsert({
            alumno_id: alumno.id, materia, nota: parseFloat(nota), periodo, tipo: key
          }, { onConflict: 'alumno_id,materia,periodo,tipo' })
        }
      }
    }
    if (!hayNotas) {
      window.Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Por favor ingresá al menos una nota' })
      return
    }
    setNotasOriginales(JSON.parse(JSON.stringify(notas)))
    setHayCambiosSinGuardar(false)
    window.Swal.fire({ icon: 'success', title: 'Éxito', text: 'Calificaciones guardadas correctamente' })
  }

  async function generarWord() {
    if (!periodo || !gradoSeleccionado) {
      window.Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Por favor seleccioná el grado y el periodo primero' })
      return
    }
    
    const borderCell = { style: BorderStyle.SINGLE, size: 1, color: '000000' }
    const borders = { top: borderCell, bottom: borderCell, left: borderCell, right: borderCell }

    function celda(texto, opts = {}) {
      return new TableCell({
        borders,
        width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
        shading: opts.shading ? { fill: opts.shading } : undefined,
        verticalAlign: 'center',
        children: [new Paragraph({
          alignment: opts.left ? AlignmentType.LEFT : AlignmentType.CENTER,
          spacing: { before: 60, after: 60 },
          children: [new TextRun({ text: texto, bold: opts.bold || false, size: opts.size || 18, font: 'Arial' })]
        })]
      })
    }

    const filaEnc1 = new TableRow({
      height: { value: 400, rule: HeightRule.EXACT },
      children: [
        new TableCell({
          borders, rowSpan: 2, columnSpan: 3, verticalAlign: 'center', shading: { fill: 'D6E4F0' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NOMINA DE ALUMNOS/AS', bold: true, size: 18, font: 'Arial' })] })]
        }),
        new TableCell({
          borders, columnSpan: actividadesConPeso.length, verticalAlign: 'center', shading: { fill: 'D6E4F0' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'EVALUACIONES', bold: true, size: 18, font: 'Arial' })] })]
        }),
        celda('Nota Final', { bold: true, size: 18, shading: 'D6E4F0' })
      ]
    })

    const filaEnc2 = new TableRow({
      height: { value: 900, rule: HeightRule.EXACT },
      children: [
        ...actividadesConPeso.map(act =>
          celda(`${act.nombre}\n(${(act.peso * 100).toFixed(1)}%)`, { bold: true, size: 16, shading: esExamen(act.nombre) ? 'FFF3E0' : 'EBF5FB' })
        ),
        celda('', { shading: 'EBF5FB' })
      ]
    })

    const filasAlumnos = alumnos.map((alumno, index) => {
      const nota = calcularNota(alumno.id)
      const n = notas[alumno.id] || {}
      return new TableRow({
        height: { value: 400, rule: HeightRule.EXACT },
        children: [
          new TableCell({
            borders, width: { size: 400, type: WidthType.DXA }, verticalAlign: 'center',
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: `${index + 1}`, size: 16, font: 'Arial' })] })]
          }),
          new TableCell({
            borders, width: { size: 3200, type: WidthType.DXA }, columnSpan: 2, verticalAlign: 'center',
            children: [new Paragraph({ alignment: AlignmentType.LEFT, spacing: { before: 60, after: 60 }, indent: { left: 100 }, children: [new TextRun({ text: `${alumno.apellido}, ${alumno.nombre}`, size: 16, font: 'Arial' })] })]
          }),
          ...actividadesConPeso.map(act => celda(n[`actividad_${act.id}`] !== '' && n[`actividad_${act.id}`] !== undefined ? `${n[`actividad_${act.id}`]}` : '', { size: 16 })),
          celda(nota ? `${nota}` : '', { bold: true, size: 16 })
        ]
      })
    })

    const porcentajesStr = actividadesConPeso.map(a => `${a.nombre} ${(a.peso * 100).toFixed(1)}%`).join(' | ')
    const tabla = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [filaEnc1, filaEnc2, ...filasAlumnos] })

    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Registro de Evaluaciones', bold: true, size: 28, font: 'Arial' })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: materia, size: 20, font: 'Arial' })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Institución: ', bold: true, size: 20, font: 'Arial' }), new TextRun({ text: 'Centro Escolar "Sor Henríquez"  ', size: 20, font: 'Arial' }), new TextRun({ text: 'Año: ', bold: true, size: 20, font: 'Arial' }), new TextRun({ text: '2026', size: 20, font: 'Arial' })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'Docente: ', bold: true, size: 20, font: 'Arial' }), new TextRun({ text: 'Yenis Gissela Martínez Portillo', size: 20, font: 'Arial' })] }),
          new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Grado: ', bold: true, size: 20, font: 'Arial' }), new TextRun({ text: `${nombreGradoWord}               `, size: 20, font: 'Arial' }), new TextRun({ text: 'Sección: ', bold: true, size: 20, font: 'Arial' }), new TextRun({ text: `${gradoActual?.seccion}`, size: 20, font: 'Arial' })] }),
          new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: 'Asignatura: ', bold: true, size: 20, font: 'Arial' }), new TextRun({ text: `${materia}               `, size: 20, font: 'Arial' }), new TextRun({ text: 'Trimestre: ', bold: true, size: 20, font: 'Arial' }), new TextRun({ text: `${periodo}`, size: 20, font: 'Arial' })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: porcentajesStr, size: 18, font: 'Arial', color: '666666' })] }),
          tabla
        ]
      }]
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `Calificaciones_${nombreGradoWord}_Sec${gradoActual?.seccion}_${periodo}.docx`)
  }

  const hayAlumnosYPeriodo = alumnos.length > 0 && periodo
  const descripcionPesos = actividadesConPeso.length > 0
    ? actividadesConPeso.map(a => `${a.nombre} ${(a.peso * 100).toFixed(1)}%`).join(' | ')
    : null

  return (
    <div>
      <p className="titulo-pagina"><FileText style={{ marginRight: '8px' }} />Calificaciones — Ciudadanía y Valores</p>

      <div className="card" style={{ maxWidth: '500px', margin: '0 auto 24px auto' }}>
        <div className="form-grid">
          <div>
            <label style={{ fontWeight: 'bold' }}>Grado</label>
            <select value={gradoSeleccionado} onChange={async (e) => {
              if (hayCambiosSinGuardar) {
                const result = await window.Swal.fire({
                  icon: 'warning', title: 'Datos sin guardar',
                  text: 'Hay calificaciones sin guardar. ¿Desea cambiar de grado y perder los cambios?',
                  showCancelButton: true, confirmButtonText: 'Cambiar', cancelButtonText: 'Cancelar',
                  confirmButtonColor: '#e65100', reverseButtons: true
                })
                if (!result.isConfirmed) return
              }
              setGradoSeleccionado(e.target.value)
              setPeriodo('')
              limpiarNotas()
            }}>
              <option value="">-- Seleccionar grado --</option>
              {grados.map(g => <option key={g.id} value={g.id}>Grado {g.nombre} Sección {g.seccion}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 'bold' }}>Materia</label>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#1a73e8', marginTop: '8px' }}>Ciudadanía y Valores</p>
          </div>
          <div>
            <label style={{ fontWeight: 'bold' }}>Periodo</label>
            <select value={periodo} onChange={async (e) => {
              if (hayCambiosSinGuardar) {
                const result = await window.Swal.fire({
                  icon: 'warning', title: 'Datos sin guardar',
                  text: 'Hay calificaciones sin guardar. ¿Desea cambiar de periodo y perder los cambios?',
                  showCancelButton: true, confirmButtonText: 'Cambiar', cancelButtonText: 'Cancelar',
                  confirmButtonColor: '#e65100', reverseButtons: true
                })
                if (!result.isConfirmed) return
              }
              setPeriodo(e.target.value)
              limpiarNotas()
            }}>
              <option value="">-- Seleccionar periodo --</option>
              <option value="1er Trimestre">1er Trimestre</option>
              <option value="2do Trimestre">2do Trimestre</option>
              <option value="3er Trimestre">3er Trimestre</option>
            </select>
          </div>
        </div>
      </div>

      {gradoSeleccionado && periodo && (
        <div className="card" style={{ maxWidth: '700px', margin: '0 auto 24px auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <p style={{ fontWeight: 'bold', fontSize: '15px', margin: 0 }}>📋 Actividades a calificar</p>
              <p style={{ color: '#888', fontSize: '12px', margin: '2px 0 0 0' }}>
                Si agregás "Examen Trimestral" vale 30% automáticamente. El resto se reparte el 70% en partes iguales.
              </p>
            </div>
            <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '13px', whiteSpace: 'nowrap' }} onClick={agregarActividad}>
              <Plus size={14} style={{ marginRight: '4px' }} />Agregar
            </button>
          </div>

          {cargandoActividades ? (
            <p style={{ color: '#999', textAlign: 'center', fontSize: '14px' }}>Cargando...</p>
          ) : actividades.length === 0 ? (
            <p style={{ color: '#bbb', textAlign: 'center', fontSize: '14px' }}>
              No hay actividades. Agregá al menos una para poder ingresar notas.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {actividadesConPeso.map((act, index) => (
                <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#888', fontSize: '13px', minWidth: '20px' }}>{index + 1}.</span>
                  <input
                    value={act.nombre}
                    onChange={e => setActividades(prev => prev.map(a => a.id === act.id ? { ...a, nombre: e.target.value } : a))}
                    onBlur={e => actualizarNombreActividad(act.id, e.target.value)}
                    style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: `1px solid ${esExamen(act.nombre) ? '#e65100' : '#ddd'}`, fontSize: '14px', width: 'auto', marginBottom: '0' }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 'bold', minWidth: '45px', textAlign: 'right', color: esExamen(act.nombre) ? '#e65100' : '#1a73e8' }}>
                    {(act.peso * 100).toFixed(1)}%
                  </span>
                  <button
                    onClick={() => eliminarActividad(act.id)}
                    style={{ background: '#ffebee', border: 'none', borderRadius: '6px', padding: '7px 10px', cursor: 'pointer', color: '#c62828' }}
                    title="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hayAlumnosYPeriodo && actividades.length > 0 && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <p style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px', textAlign: 'center' }}>
            {materia} — {periodo} — Grado {gradoActual?.nombre} Sección {gradoActual?.seccion}
          </p>
          {descripcionPesos && (
            <p style={{ textAlign: 'center', color: '#999', fontSize: '13px', marginBottom: '15px' }}>
              {descripcionPesos}
            </p>
          )}

          <table className="table-desktop" style={{ fontSize: '15px', tableLayout: 'auto', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>N°</th>
                <th style={{ width: '180px', paddingRight: '16px' }}>Nombre completo</th>
                {actividadesConPeso.map(act => (
                  <th key={act.id} style={{ textAlign: 'center', minWidth: '100px' }}>
                    <span style={{ display: 'block', color: esExamen(act.nombre) ? '#ffcc80' : 'white', fontWeight: 'bold' }}>
                      {act.nombre}
                    </span>
                    <span style={{ display: 'block', fontWeight: 'normal', fontSize: '11px', color: 'rgba(255,255,255,0.75)' }}>
                      {(act.peso * 100).toFixed(1)}%
                    </span>
                  </th>
                ))}
                <th style={{ textAlign: 'center', minWidth: '90px' }}>Nota Final</th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map((a, index) => {
                const nota = calcularNota(a.id)
                return (
                  <tr key={a.id}>
                    <td>{index + 1}</td>
                    <td style={{ fontSize: '15px', paddingRight: '16px' }}>{a.apellido}, {a.nombre}</td>
                    {actividadesConPeso.map(act => (
                      <td key={act.id} style={{ padding: '8px 4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <input type="number" min="1" max="10" step="0.1" placeholder="1-10"
                            value={notas[a.id]?.[`actividad_${act.id}`] || ''}
                            onChange={e => setNotas(prev => ({ ...prev, [a.id]: { ...prev[a.id], [`actividad_${act.id}`]: e.target.value } }))}
                            style={{ width: '75px', textAlign: 'center', boxSizing: 'border-box' }} />
                        </div>
                      </td>
                    ))}
                    <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', color: nota === null ? 'gray' : nota >= 6 ? 'green' : 'red' }}>
                      {nota === null ? '-' : nota}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="table-mobile">
            {alumnos.map((a, index) => {
              const nota = calcularNota(a.id)
              return (
                <div key={a.id} className="table-row">
                  <div className="table-row-header">
                    <span className="table-row-number">{index + 1}</span>
                    <span className="table-row-title">{a.apellido}, {a.nombre}</span>
                  </div>
                  <div className="table-row-data">
                    {actividadesConPeso.map(act => (
                      <div key={act.id} className="table-row-item">
                        <span className="table-row-label" style={{ color: esExamen(act.nombre) ? '#e65100' : '#1a73e8' }}>
                          {act.nombre} ({(act.peso * 100).toFixed(1)}%)
                        </span>
                        <input type="number" min="1" max="10" step="0.1" placeholder="1-10"
                          value={notas[a.id]?.[`actividad_${act.id}`] || ''}
                          onChange={e => setNotas(prev => ({ ...prev, [a.id]: { ...prev[a.id], [`actividad_${act.id}`]: e.target.value } }))}
                          style={{ width: '100%', textAlign: 'center', padding: '10px' }} />
                      </div>
                    ))}
                    <div className="table-row-item">
                      <span className="table-row-label">Nota Final</span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.25rem', textAlign: 'center', color: nota === null ? 'gray' : nota >= 6 ? 'green' : 'red' }}>
                        {nota === null ? '-' : nota}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-success" onClick={guardarCalificaciones}>
              <Save style={{ marginRight: '6px' }} />Guardar
            </button>
            <button className="btn btn-primary" onClick={generarWord}>
              <FileDown style={{ marginRight: '6px' }} />Generar Word
            </button>
          </div>
        </div>
      )}

      {hayAlumnosYPeriodo && actividades.length === 0 && !cargandoActividades && (
        <div className="card" style={{ textAlign: 'center', color: '#999' }}>
          <p>Primero agregá las actividades a calificar en el panel de arriba.</p>
        </div>
      )}

      {gradoSeleccionado && alumnos.length === 0 && (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#999' }}>No hay alumnos en este grado aún</p>
        </div>
      )}
    </div>
  )
}

export default Calificaciones