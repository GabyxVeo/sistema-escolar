import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle, HeightRule } from 'docx'
import { saveAs } from 'file-saver'

function Calificaciones() {
  const [grados, setGrados] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [gradoSeleccionado, setGradoSeleccionado] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [notas, setNotas] = useState({})

  const materia = 'Ciudadanía y Valores'

  const TIPOS_4 = [
    { key: 'cuaderno', label: 'Cuaderno', emoji: '📓', peso: 0.20 },
    { key: 'exposicion', label: 'Exposición', emoji: '🎤', peso: 0.30 },
    { key: 'examen', label: 'Examen Trimestral', emoji: '📝', peso: 0.30 },
    { key: 'actividades', label: 'Actividades', emoji: '✏️', peso: 0.20 }
  ]

  const TIPOS_OTROS = [
    { key: 'cuaderno', label: 'Cuaderno', emoji: '📓', peso: 0.10 },
    { key: 'libro', label: 'Libro', emoji: '📚', peso: 0.30 },
    { key: 'exposicion', label: 'Exposición', emoji: '🎤', peso: 0.20 },
    { key: 'examen', label: 'Examen Trimestral', emoji: '📝', peso: 0.30 },
    { key: 'actividades', label: 'Actividades', emoji: '✏️', peso: 0.10 }
  ]

  const gradoActual = grados.find(g => g.id === parseInt(gradoSeleccionado))
  const es4 = gradoActual?.nombre === '4'
  const TIPOS = es4 ? TIPOS_4 : TIPOS_OTROS

  useEffect(() => { cargarGrados() }, [])
  useEffect(() => { if (gradoSeleccionado) cargarAlumnos() }, [gradoSeleccionado])
  useEffect(() => { if (gradoSeleccionado && periodo && alumnos.length > 0) cargarCalificaciones() }, [gradoSeleccionado, periodo, alumnos.length])

  async function cargarGrados() {
    const { data } = await supabase.from('grados').select('*')
    setGrados(data || [])
  }

  async function cargarAlumnos() {
    const { data } = await supabase
      .from('alumnos')
      .select('*')
      .eq('grado_id', gradoSeleccionado)
      .order('apellido')
    setAlumnos(data || [])
    const inicial = {}
    data?.forEach(a => {
      inicial[a.id] = { cuaderno: '', libro: '', exposicion: '', examen: '', actividades: '' }
    })
    setNotas(inicial)
  }

  async function cargarCalificaciones() {
    for (const alumno of alumnos) {
      const { data } = await supabase
        .from('calificaciones')
        .select('*')
        .eq('alumno_id', alumno.id)
        .eq('materia', materia)
        .eq('periodo', periodo)
      if (data && data.length > 0) {
        const notasAlumno = {}
        data.forEach(c => { notasAlumno[c.tipo] = c.nota })
        setNotas(prev => ({
          ...prev,
          [alumno.id]: {
            cuaderno: notasAlumno.cuaderno || '',
            libro: notasAlumno.libro || '',
            exposicion: notasAlumno.exposicion || '',
            examen: notasAlumno.examen || '',
            actividades: notasAlumno.actividades || ''
          }
        }))
      }
    }
  }

  function limpiarNotas() {
    const inicial = {}
    alumnos.forEach(a => {
      inicial[a.id] = { cuaderno: '', libro: '', exposicion: '', examen: '', actividades: '' }
    })
    setNotas(inicial)
  }

  function calcularNota(alumnoId) {
    const n = notas[alumnoId]
    if (!n) return null
    let total = 0
    let pesoTotal = 0
    for (const tipo of TIPOS) {
      const val = n[tipo.key]
      if (val !== '' && val !== null && val !== undefined) {
        total += parseFloat(val) * tipo.peso
        pesoTotal += tipo.peso
      }
    }
    if (pesoTotal === 0) return null
    return (total / pesoTotal).toFixed(2)
  }

  async function guardarCalificaciones() {
    if (!periodo) { alert('Por favor seleccioná el periodo'); return }
    let hayNotas = false
    for (const alumno of alumnos) {
      for (const tipo of TIPOS) {
        const nota = notas[alumno.id]?.[tipo.key]
        if (nota !== '' && nota !== null && nota !== undefined) {
          hayNotas = true
          await supabase.from('calificaciones').upsert({
            alumno_id: alumno.id,
            materia,
            nota: parseFloat(nota),
            periodo,
            tipo: tipo.key
          }, { onConflict: 'alumno_id,materia,periodo,tipo' })
        }
      }
    }
    if (!hayNotas) { alert('Por favor ingresá al menos una nota'); return }
    alert('✅ Calificaciones guardadas correctamente')
  }

  async function generarWord() {
    if (!periodo || !gradoSeleccionado) {
      alert('Por favor seleccioná el grado y el periodo primero')
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
          children: [new TextRun({
            text: texto,
            bold: opts.bold || false,
            size: opts.size || 18,
            font: 'Arial'
          })]
        })]
      })
    }

    const filaEncabezado1 = new TableRow({
      height: { value: 400, rule: HeightRule.EXACT },
      children: [
        new TableCell({
          borders,
          rowSpan: 2,
          columnSpan: 3,
          verticalAlign: 'center',
          shading: { fill: 'D6E4F0' },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'NOMINA DE ALUMNOS/AS', bold: true, size: 18, font: 'Arial' })]
          })]
        }),
        new TableCell({
          borders,
          columnSpan: TIPOS.length,
          verticalAlign: 'center',
          shading: { fill: 'D6E4F0' },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'EVALUACIONES', bold: true, size: 18, font: 'Arial' })]
          })]
        }),
        celda('Nota Final', { bold: true, size: 18, shading: 'D6E4F0' })
      ]
    })

    const filaEncabezado2 = new TableRow({
      height: { value: 900, rule: HeightRule.EXACT },
      children: [
        ...TIPOS.map(t => celda(`${t.label}\n(${t.peso * 100}%)`, { bold: true, size: 16, shading: 'EBF5FB' })),
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
            borders,
            width: { size: 400, type: WidthType.DXA },
            verticalAlign: 'center',
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 60 },
              children: [new TextRun({ text: `${index + 1}`, size: 16, font: 'Arial' })]
            })]
          }),
          new TableCell({
            borders,
            width: { size: 3200, type: WidthType.DXA },
            columnSpan: 2,
            verticalAlign: 'center',
            children: [new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { before: 60, after: 60 },
              indent: { left: 100 },
              children: [new TextRun({ text: `${alumno.apellido}, ${alumno.nombre}`, size: 16, font: 'Arial' })]
            })]
          }),
          ...TIPOS.map(t => celda(n[t.key] ? `${n[t.key]}` : '', { size: 16 })),
          celda(nota ? `${nota}` : '', { bold: true, size: 16 })
        ]
      })
    })

    const subtitulo = es4
      ? 'Revisión de Cuaderno, Exposición, Examen Trimestral y Actividades'
      : 'Revisión de Cuaderno y Libro, Exposición, Examen Trimestral y Actividades'

    const porcentajes = es4
      ? 'Cuaderno 20% | Exposición 30% | Examen 30% | Actividades 20%'
      : 'Cuaderno 10% | Libro 30% | Exposición 20% | Examen 30% | Actividades 10%'

    const tabla = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [filaEncabezado1, filaEncabezado2, ...filasAlumnos]
    })

    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Registro de Evaluaciones', bold: true, size: 28, font: 'Arial' })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: subtitulo, size: 20, font: 'Arial' })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Institución: ', bold: true, size: 20, font: 'Arial' }),
              new TextRun({ text: 'Centro Escolar "Sor Henríquez"  ', size: 20, font: 'Arial' }),
              new TextRun({ text: 'Año: ', bold: true, size: 20, font: 'Arial' }),
              new TextRun({ text: '2026', size: 20, font: 'Arial' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({ text: 'Docente: ', bold: true, size: 20, font: 'Arial' }),
              new TextRun({ text: 'Yenis Gissela Martínez Portillo', size: 20, font: 'Arial' })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'Grado: ', bold: true, size: 20, font: 'Arial' }),
              new TextRun({ text: `${gradoActual?.nombre}               `, size: 20, font: 'Arial' }),
              new TextRun({ text: 'Sección: ', bold: true, size: 20, font: 'Arial' }),
              new TextRun({ text: `${gradoActual?.seccion}`, size: 20, font: 'Arial' })
            ]
          }),
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({ text: 'Asignatura: ', bold: true, size: 20, font: 'Arial' }),
              new TextRun({ text: `${materia}               `, size: 20, font: 'Arial' }),
              new TextRun({ text: 'Trimestre: ', bold: true, size: 20, font: 'Arial' }),
              new TextRun({ text: `${periodo}`, size: 20, font: 'Arial' })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: porcentajes, size: 18, font: 'Arial', color: '666666' })]
          }),
          tabla
        ]
      }]
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `Calificaciones_Grado${gradoActual?.nombre}_Sec${gradoActual?.seccion}_${periodo}.docx`)
  }

  return (
    <div>
      <p className="titulo-pagina">📝 Calificaciones — Ciudadanía y Valores</p>

      <div className="card">
        <div className="form-grid">
          <div>
            <label style={{fontWeight:'bold'}}>Grado</label>
            <select value={gradoSeleccionado} onChange={e => {
              setGradoSeleccionado(e.target.value)
              setPeriodo('')
              limpiarNotas()
            }}>
              <option value="">-- Seleccionar grado --</option>
              {grados.map(g => <option key={g.id} value={g.id}>Grado {g.nombre} Sección {g.seccion}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontWeight:'bold'}}>Materia</label>
            <p style={{fontSize:'16px', fontWeight:'bold', color:'#1a73e8', marginTop:'8px'}}>Ciudadanía y Valores</p>
          </div>
          <div>
            <label style={{fontWeight:'bold'}}>Periodo</label>
            <select value={periodo} onChange={e => {
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

      {alumnos.length > 0 && periodo && (
        <div className="card" style={{overflowX:'auto'}}>
          <p style={{fontWeight:'bold', fontSize:'16px', marginBottom:'5px', textAlign:'center'}}>
            {materia} — {periodo} — Grado {gradoActual?.nombre} Sección {gradoActual?.seccion}
          </p>
          <p style={{textAlign:'center', color:'#999', fontSize:'13px', marginBottom:'15px'}}>
            {es4
              ? 'Cuaderno 20% | Exposición 30% | Examen 30% | Actividades 20%'
              : 'Cuaderno 10% | Libro 30% | Exposición 20% | Examen 30% | Actividades 10%'
            }
          </p>
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Nombre completo</th>
                {TIPOS.map(t => (
                  <th key={t.key} style={{textAlign:'center'}}>
                    {t.emoji} {t.label}<br/>
                    <span style={{fontSize:'11px', fontWeight:'normal'}}>({t.peso * 100}%)</span>
                  </th>
                ))}
                <th style={{textAlign:'center'}}>📊 Nota Final</th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map((a, index) => {
                const nota = calcularNota(a.id)
                return (
                  <tr key={a.id}>
                    <td>{index + 1}</td>
                    <td>{a.apellido}, {a.nombre}</td>
                    {TIPOS.map(t => (
                      <td key={t.key} style={{textAlign:'center'}}>
                        <input type="number" min="1" max="10" step="0.1"
                          placeholder="1-10"
                          value={notas[a.id]?.[t.key] || ''}
                          onChange={e => setNotas({...notas, [a.id]: {...notas[a.id], [t.key]: e.target.value}})}
                          style={{width:'65px', textAlign:'center'}} />
                      </td>
                    ))}
                    <td style={{textAlign:'center', fontWeight:'bold', fontSize:'16px',
                      color: nota === null ? 'gray' : nota >= 6 ? 'green' : 'red'}}>
                      {nota === null ? '-' : nota}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{textAlign:'center', marginTop:'20px', display:'flex', gap:'15px', justifyContent:'center'}}>
            <button className="btn btn-success" onClick={guardarCalificaciones}>
              💾 Guardar Calificaciones
            </button>
            <button className="btn btn-primary" onClick={generarWord}>
              📄 Generar Word
            </button>
          </div>
        </div>
      )}

      {gradoSeleccionado && alumnos.length === 0 && (
        <div className="card">
          <p style={{textAlign:'center', color:'#999'}}>No hay alumnos en este grado aún</p>
        </div>
      )}
    </div>
  )
}

export default Calificaciones