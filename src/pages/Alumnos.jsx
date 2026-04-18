import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Users, Pencil, Trash2, UserPlus, Contact, Phone, MapPin, AlertTriangle, X, User as UserIcon } from 'lucide-react'

function Alumnos() {
  const [alumnos, setAlumnos] = useState([])
  const [grados, setGrados] = useState([])
  const [gradoFiltro, setGradoFiltro] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [modalAlumno, setModalAlumno] = useState(null)

  const formularioVacio = {
    nie: '', nombre: '', apellido: '', fecha_nacimiento: '',
    sexo: '', alergias: '', grado_id: '',
    responsable_nombre: '', responsable_apellido: '',
    responsable_telefono: '', responsable_parentesco: '',
    responsable_dui: '', responsable_id: '', responsable_direccion: ''
  }

  const [formulario, setFormulario] = useState(formularioVacio)

  useEffect(() => { cargarGrados() }, [])

  useEffect(() => {
    if (gradoFiltro) {
      cargarAlumnos()
      setMostrarFormulario(false)
      setEditandoId(null)
      setFormulario(formularioVacio)
    }
  }, [gradoFiltro])

  async function cargarGrados() {
    const { data } = await supabase.from('grados').select('*')
    setGrados(data || [])
  }

  async function cargarAlumnos() {
    const { data } = await supabase
      .from('alumnos')
      .select('*, grados(nombre, seccion), responsables(id, nombre, apellido, telefono, parentesco, dui, direccion)')
      .eq('grado_id', gradoFiltro)
      .order('apellido')
    setAlumnos(data || [])
  }

  function editarAlumno(a) {
    setFormulario({
      nie: a.nie, nombre: a.nombre, apellido: a.apellido,
      fecha_nacimiento: a.fecha_nacimiento || '', sexo: a.sexo || '',
      alergias: a.alergias || '', grado_id: a.grado_id,
      responsable_nombre: a.responsables?.nombre || '',
      responsable_apellido: a.responsables?.apellido || '',
      responsable_telefono: a.responsables?.telefono || '',
      responsable_parentesco: a.responsables?.parentesco || '',
      responsable_dui: a.responsables?.dui || '',
      responsable_id: a.responsables?.id || '',
      responsable_direccion: a.responsables?.direccion || ''
    })
    setEditandoId(a.id)
    setMostrarFormulario(true)
    window.scrollTo(0, 0)
  }

  async function guardarAlumno() {
    if (!formulario.nie || !formulario.nombre || !formulario.apellido) {
      alert('Por favor completá NIE, nombre y apellido')
      return
    }
    if (es4C && !formulario.fecha_nacimiento) {
      alert('Por favor ingresá la fecha de nacimiento')
      return
    }

    let edad = null
    if (formulario.fecha_nacimiento) {
      const hoy = new Date()
      const nacimiento = new Date(formulario.fecha_nacimiento)
      edad = hoy.getFullYear() - nacimiento.getFullYear()
      const mes = hoy.getMonth() - nacimiento.getMonth()
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--
    }

    if (editandoId) {
      if (es4C && formulario.responsable_id) {
        await supabase.from('responsables').update({
          nombre: formulario.responsable_nombre,
          apellido: formulario.responsable_apellido,
          telefono: formulario.responsable_telefono,
          parentesco: formulario.responsable_parentesco,
          dui: formulario.responsable_dui,
          direccion: formulario.responsable_direccion
        }).eq('id', formulario.responsable_id)
      }

      await supabase.from('alumnos').update({
        nie: formulario.nie,
        nombre: formulario.nombre,
        apellido: formulario.apellido,
        fecha_nacimiento: formulario.fecha_nacimiento || null,
        edad,
        sexo: formulario.sexo,
        alergias: es4C ? formulario.alergias : null,
        grado_id: parseInt(gradoFiltro)
      }).eq('id', editandoId)

      alert('✅ Alumno actualizado correctamente')
    } else {
      let responsable_id = null

      if (es4C) {
        const { data: responsable } = await supabase
          .from('responsables')
          .insert([{
            nombre: formulario.responsable_nombre,
            apellido: formulario.responsable_apellido,
            telefono: formulario.responsable_telefono,
            parentesco: formulario.responsable_parentesco,
            dui: formulario.responsable_dui,
            direccion: formulario.responsable_direccion
          }]).select()
        responsable_id = responsable[0].id
      }

      const { error: errorAlumno } = await supabase.from('alumnos').insert([{
        nie: formulario.nie,
        nombre: formulario.nombre,
        apellido: formulario.apellido,
        fecha_nacimiento: formulario.fecha_nacimiento || null,
        edad,
        sexo: formulario.sexo,
        alergias: es4C ? formulario.alergias : null,
        grado_id: parseInt(gradoFiltro),
        responsable_id
      }])

      if (errorAlumno) {
        if (responsable_id) await supabase.from('responsables').delete().eq('id', responsable_id)
        if (errorAlumno.code === '23505') {
          alert('⚠️ El NIE ' + formulario.nie + ' ya existe en la base de datos.')
        } else {
          alert('⚠️ Error al guardar: ' + errorAlumno.message)
        }
        return
      }
      alert('✅ Alumno guardado correctamente')
    }

    setFormulario(formularioVacio)
    setMostrarFormulario(false)
    setEditandoId(null)
    cargarAlumnos()
  }

  async function eliminarAlumno(id) {
    if (confirm('¿Estás seguro de eliminar este alumno?')) {
      const alumno = alumnos.find(a => a.id === id)
      await supabase.from('asistencia').delete().eq('alumno_id', id)
      await supabase.from('calificaciones').delete().eq('alumno_id', id)
      await supabase.from('alumnos').delete().eq('id', id)
      if (alumno?.responsable_id) {
        await supabase.from('responsables').delete().eq('id', alumno.responsable_id)
      }
      cargarAlumnos()
      alert('✅ Alumno eliminado correctamente')
    }
  }

  const gradoActual = grados.find(g => g.id === parseInt(gradoFiltro))
  const es4C = gradoActual?.nombre === '4' && gradoActual?.seccion === 'C'

  const thStyle = {
    background: '#1a73e8',
    color: 'white',
    padding: '12px 10px',
    fontSize: '15px',
    whiteSpace: 'nowrap'
  }

  const tdStyle = {
    padding: '11px 10px',
    borderBottom: '1px solid #edf2f7',
    fontSize: '15px',
    verticalAlign: 'middle'
  }

  return (
    <div style={{width:'100%'}}>
      <p className="titulo-pagina"><Users style={{marginRight:'8px'}} />Nómina de Alumnos</p>

      <div className="card" style={{textAlign:'center', maxWidth:'550px', margin:'0 auto 16px auto'}}>
        <div style={{display:'flex', justifyContent:'center', alignItems:'center', gap:'15px', flexWrap:'wrap'}}>
          <div>
            <label style={{fontWeight:'bold', marginRight:'8px', fontSize:'15px'}}>Seleccionar Grado:</label>
            <select value={gradoFiltro} onChange={e => setGradoFiltro(e.target.value)}
              style={{padding:'8px', borderRadius:'6px', border:'1px solid #ddd', fontSize:'15px', width:'auto', marginBottom:'0'}}>
              <option value="">-- Seleccionar grado --</option>
              {grados.map(g => <option key={g.id} value={g.id}>Grado {g.nombre} Sección {g.seccion}</option>)}
            </select>
          </div>
          {gradoFiltro && (
            <button className="btn btn-primary" style={{whiteSpace:'nowrap'}} onClick={() => {
              setMostrarFormulario(!mostrarFormulario)
              setEditandoId(null)
              setFormulario(formularioVacio)
            }}>
              {mostrarFormulario ? 'Cancelar' : '+ Agregar Alumno'}
            </button>
          )}
        </div>

        {gradoFiltro && gradoActual && (
          <p style={{marginTop:'10px', fontSize:'14px', color:'#555'}}>
            Grado {gradoActual.nombre} — Sección "{gradoActual.seccion}" | Total: {alumnos.length} alumnos
          </p>
        )}

        {mostrarFormulario && (
          <div style={{marginTop:'20px', textAlign:'left'}}>
            <p style={{fontWeight:'bold', marginBottom:'10px', fontSize:'15px'}}>
              {editandoId ? <><Pencil style={{marginRight:'6px'}} />Editar Alumno</> : <><UserPlus style={{marginRight:'6px'}} />Datos del Alumno</>}
            </p>
            <div className="form-grid">
              <input placeholder="NIE *" value={formulario.nie} onChange={e => setFormulario({...formulario, nie: e.target.value})} />
              <input placeholder="Nombre *" value={formulario.nombre} onChange={e => setFormulario({...formulario, nombre: e.target.value})} />
              <input placeholder="Apellido *" value={formulario.apellido} onChange={e => setFormulario({...formulario, apellido: e.target.value})} />
              <select value={formulario.sexo} onChange={e => setFormulario({...formulario, sexo: e.target.value})}>
                <option value="">Sexo</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
              {es4C && (
                <>
                  <input type="date" value={formulario.fecha_nacimiento} onChange={e => setFormulario({...formulario, fecha_nacimiento: e.target.value})} />
                  <input placeholder="Alergias (opcional)" value={formulario.alergias} onChange={e => setFormulario({...formulario, alergias: e.target.value})} />
                </>
              )}
            </div>

            {es4C && (
              <>
                <p style={{fontWeight:'bold', margin:'15px 0 10px', fontSize:'15px'}}><Contact style={{marginRight:'6px'}} />Datos del Responsable</p>
                <div className="form-grid">
                  <input placeholder="Nombre del responsable" value={formulario.responsable_nombre} onChange={e => setFormulario({...formulario, responsable_nombre: e.target.value})} />
                  <input placeholder="Apellido del responsable" value={formulario.responsable_apellido} onChange={e => setFormulario({...formulario, responsable_apellido: e.target.value})} />
                  <input placeholder="DUI (ej: 04511014-1)" value={formulario.responsable_dui} onChange={e => setFormulario({...formulario, responsable_dui: e.target.value})} />
                  <input placeholder="Teléfono (ej: 7569-7912)" value={formulario.responsable_telefono} onChange={e => setFormulario({...formulario, responsable_telefono: e.target.value})} />
                  <input placeholder="Parentesco (ej: madre, padre)" value={formulario.responsable_parentesco} onChange={e => setFormulario({...formulario, responsable_parentesco: e.target.value})} />
                  <input placeholder="Dirección" value={formulario.responsable_direccion} onChange={e => setFormulario({...formulario, responsable_direccion: e.target.value})} />
                </div>
              </>
            )}

            <button className="btn btn-success" style={{marginTop:'10px'}} onClick={guardarAlumno}>
              <Users style={{marginRight:'6px'}} />{editandoId ? 'Actualizar Alumno' : 'Guardar Alumno'}
            </button>
          </div>
        )}
      </div>

{gradoFiltro && (
        <div className="card">
          <table className="table-desktop">
            <thead>
              <tr>
                <th style={{...thStyle, width:'35px', textAlign:'center'}}>N°</th>
                <th style={{...thStyle, width:'90px'}}>NIE</th>
                <th style={{...thStyle, width:'175px'}}>Nombre completo</th>
                <th style={{...thStyle, width:'55px', textAlign:'center'}}>Sexo</th>
                <th style={{...thStyle, width:'60px', textAlign:'center'}}>Grado</th>
                <th style={{...thStyle, width:'70px', textAlign:'center'}}>Sección</th>
                {es4C && (
                  <>
                    <th style={{...thStyle, width:'100px'}}>Fecha Nac.</th>
                    <th style={{...thStyle, width:'50px', textAlign:'center'}}>Edad</th>
                  </>
                )}
                <th style={{...thStyle, width:'90px', textAlign:'center'}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map((a, index) => (
                <tr key={a.id}>
                  <td style={{...tdStyle, textAlign:'center'}}>{index + 1}</td>
                  <td style={tdStyle}>{a.nie}</td>
                  <td style={{...tdStyle, width:'175px'}}>{a.apellido}, {a.nombre}</td>
                  <td style={{...tdStyle, textAlign:'center'}}>{a.sexo}</td>
                  <td style={{...tdStyle, textAlign:'center'}}>{a.grados?.nombre}</td>
                  <td style={{...tdStyle, textAlign:'center'}}>{a.grados?.seccion}</td>
                  {es4C && (
                    <>
                      <td style={tdStyle}>{a.fecha_nacimiento}</td>
                      <td style={{...tdStyle, textAlign:'center'}}>{a.edad}</td>
                    </>
                  )}
                  <td style={{...tdStyle, textAlign:'center'}}>
                    <div style={{display:'flex', gap:'6px', alignItems:'center', justifyContent:'center'}}>
                      <button className="btn btn-info" title="Ver detalles" style={{padding:'5px 10px', background:'#17a2b8', color:'white'}} onClick={() => setModalAlumno(a)}><UserIcon size={16} /></button>
                      <button className="btn btn-primary" title="Editar" style={{padding:'5px 10px'}} onClick={() => editarAlumno(a)}><Pencil size={16} /></button>
                      <button className="btn btn-danger" title="Eliminar" style={{padding:'5px 10px'}} onClick={() => eliminarAlumno(a.id)}><Trash2 size={16} /></button>
                    </div>
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
                <div className="table-row-data">
                  <div className="table-row-item">
                    <span className="table-row-label">NIE</span>
                    <span className="table-row-value">{a.nie}</span>
                  </div>
                  <div className="table-row-item">
                    <span className="table-row-label">Sexo</span>
                    <span className="table-row-value">{a.sexo || '-'}</span>
                  </div>
                  <div className="table-row-item">
                    <span className="table-row-label">Grado</span>
                    <span className="table-row-value">{a.grados?.nombre}</span>
                  </div>
                  <div className="table-row-item">
                    <span className="table-row-label">Sección</span>
                    <span className="table-row-value">{a.grados?.seccion}</span>
                  </div>
                  {es4C && (
                    <>
                      <div className="table-row-item">
                        <span className="table-row-label">Fecha Nac.</span>
                        <span className="table-row-value">{a.fecha_nacimiento || '-'}</span>
                      </div>
                      <div className="table-row-item">
                        <span className="table-row-label">Edad</span>
                        <span className="table-row-value">{a.edad || '-'}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="table-row-actions">
                  <button className="btn btn-info" onClick={() => setModalAlumno(a)}><UserIcon size={16} />Detalles</button>
                  <button className="btn btn-primary" onClick={() => editarAlumno(a)}><Pencil size={16} />Editar</button>
                  <button className="btn btn-danger" onClick={() => eliminarAlumno(a.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
          {alumnos.length === 0 && <p style={{textAlign:'center', marginTop:'20px', color:'#999', fontSize:'15px'}}>No hay alumnos en este grado aún</p>}
        </div>
      )}

      {!gradoFiltro && (
        <div className="card" style={{textAlign:'center', color:'#999', fontSize:'16px'}}>
          <Users style={{marginRight:'6px'}} />Seleccioná un grado para ver la nómina
        </div>
      )}

      {modalAlumno && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setModalAlumno(null)}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '24px',
            maxWidth: '500px', width: '90%', maxHeight: '90vh', overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2 style={{fontSize: '20px', fontWeight: 'bold', color: '#1a73e8', margin: 0}}>
                <UserIcon style={{marginRight: '8px', verticalAlign: 'middle'}} />
                {modalAlumno.apellido}, {modalAlumno.nombre}
              </h2>
              <button onClick={() => setModalAlumno(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px'
              }}>
                <X size={24} />
              </button>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
              <div style={{
                background: '#f8f9fa', borderRadius: '12px', padding: '16px',
                display: 'flex', alignItems: 'center', gap: '12px'
              }}>
                <div style={{background: '#e3f2fd', borderRadius: '10px', padding: '10px'}}>
                  <UserIcon size={20} color="#1976d2" />
                </div>
                <div>
                  <p style={{fontSize: '11px', color: '#666', margin: 0}}>NIE</p>
                  <p style={{fontSize: '14px', fontWeight: 'bold', color: '#333', margin: 0}}>{modalAlumno.nie}</p>
                </div>
              </div>

              <div style={{
                background: '#f8f9fa', borderRadius: '12px', padding: '16px',
                display: 'flex', alignItems: 'center', gap: '12px'
              }}>
                <div style={{background: '#e3f2fd', borderRadius: '10px', padding: '10px'}}>
                  <Users size={20} color="#1976d2" />
                </div>
                <div>
                  <p style={{fontSize: '11px', color: '#666', margin: 0}}>Sexo</p>
                  <p style={{fontSize: '14px', fontWeight: 'bold', color: '#333', margin: 0}}>{modalAlumno.sexo || '-'}</p>
                </div>
              </div>

              <div style={{
                background: '#f8f9fa', borderRadius: '12px', padding: '16px',
                display: 'flex', alignItems: 'center', gap: '12px'
              }}>
                <div style={{background: '#fff3e0', borderRadius: '10px', padding: '10px'}}>
                  <Contact size={20} color="#e65100" />
                </div>
                <div>
                  <p style={{fontSize: '11px', color: '#666', margin: 0}}>Responsable</p>
                  <p style={{fontSize: '14px', fontWeight: 'bold', color: '#333', margin: 0}}>
                    {modalAlumno.responsables?.nombre} {modalAlumno.responsables?.apellido}
                  </p>
                </div>
              </div>

              <div style={{
                background: '#f8f9fa', borderRadius: '12px', padding: '16px',
                display: 'flex', alignItems: 'center', gap: '12px'
              }}>
                <div style={{background: '#fff3e0', borderRadius: '10px', padding: '10px'}}>
                  <Contact size={20} color="#e65100" />
                </div>
                <div>
                  <p style={{fontSize: '11px', color: '#666', margin: 0}}>DUI</p>
                  <p style={{fontSize: '14px', fontWeight: 'bold', color: '#333', margin: 0}}>
                    {modalAlumno.responsables?.dui || '-'}
                  </p>
                </div>
              </div>

              <div style={{
                background: '#f8f9fa', borderRadius: '12px', padding: '16px',
                display: 'flex', alignItems: 'center', gap: '12px'
              }}>
                <div style={{background: '#e8f5e9', borderRadius: '10px', padding: '10px'}}>
                  <Phone size={20} color="#2e7d32" />
                </div>
                <div>
                  <p style={{fontSize: '11px', color: '#666', margin: 0}}>Teléfono</p>
                  <p style={{fontSize: '14px', fontWeight: 'bold', color: '#333', margin: 0}}>
                    {modalAlumno.responsables?.telefono || '-'}
                  </p>
                </div>
              </div>

              <div style={{
                background: '#f8f9fa', borderRadius: '12px', padding: '16px',
                display: 'flex', alignItems: 'center', gap: '12px'
              }}>
                <div style={{background: '#e8f5e9', borderRadius: '10px', padding: '10px'}}>
                  <MapPin size={20} color="#2e7d32" />
                </div>
                <div>
                  <p style={{fontSize: '11px', color: '#666', margin: 0}}>Dirección</p>
                  <p style={{fontSize: '14px', fontWeight: 'bold', color: '#333', margin: 0}}>
                    {modalAlumno.responsables?.direccion || '-'}
                  </p>
                </div>
              </div>

              {(modalAlumno.alergias) && (
                <div style={{
                  background: '#ffebee', borderRadius: '12px', padding: '16px',
                  display: 'flex', alignItems: 'center', gap: '12px', gridColumn: 'span 2'
                }}>
                  <div style={{background: '#ffcdd2', borderRadius: '10px', padding: '10px'}}>
                    <AlertTriangle size={20} color="#c62828" />
                  </div>
                  <div>
                    <p style={{fontSize: '11px', color: '#c62828', margin: 0}}>Alergias</p>
                    <p style={{fontSize: '14px', fontWeight: 'bold', color: '#c62828', margin: 0}}>
                      {modalAlumno.alergias}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Alumnos