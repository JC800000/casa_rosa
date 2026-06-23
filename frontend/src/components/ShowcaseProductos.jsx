import { useState, useRef } from 'react'
import { useQuery } from '@apollo/client/react'
import { Link } from 'react-router-dom'
import { GET_ITEMS_SHOWCASE } from '../graphql/configuracion'
import { PALETA, TEMA_DEFAULT } from '../lib/showcasePaleta'

const PLAYFAIR = "'Playfair Display', Georgia, serif"

function getTema(item) {
  if (item?.colorTema && PALETA[item.colorTema]) return PALETA[item.colorTema]
  return TEMA_DEFAULT
}

const FLOAT_POS = [
  { top: '10%',    left: '7%',   fontSize: '1.9rem', dur: '3.2s', delay: '0s'   },
  { top: '22%',    right: '8%',  fontSize: '1.5rem', dur: '4.1s', delay: '0.8s' },
  { top: '60%',    left: '5%',   fontSize: '1.3rem', dur: '3.7s', delay: '1.5s' },
  { bottom: '22%', right: '7%',  fontSize: '1.7rem', dur: '2.9s', delay: '0.4s' },
  { bottom: '14%', left: '13%',  fontSize: '1.2rem', dur: '3.5s', delay: '2.1s' },
]

// EXIT_MS + ENTER_MS = total ≈ 1040ms (dentro del rango 0.8–1.2s)
const EXIT_MS  = 420
const ENTER_MS = 620

export default function ShowcaseProductos() {
  const { data, loading } = useQuery(GET_ITEMS_SHOWCASE)

  // idx       → índice lógico (actualiza inmediato; para dots y contador)
  // renderIdx → índice visual (actualiza al terminar el exit; para contenido y tema)
  // phase     → 'idle' | 'exit' | 'enter'
  // dir       → 'next' | 'prev'   (controla desde qué lado entra el nuevo)
  const [idx,       setIdx]       = useState(0)
  const [renderIdx, setRenderIdx] = useState(0)
  const [phase,     setPhase]     = useState('idle')
  const [dir,       setDir]       = useState('next')
  const [touchX,    setTouchX]    = useState(null)
  const busy = useRef(false)

  const productos = (data?.itemsShowcase || []).filter(p => p.activo && p.fotoUrl)
  const safeRender = Math.min(renderIdx, Math.max(0, productos.length - 1))
  const prod       = productos[safeRender]
  const tema       = prod ? getTema(prod) : TEMA_DEFAULT

  // Clase CSS para el contenido — determina la animación de salida/entrada
  function contentClass() {
    if (phase === 'exit')  return dir === 'next' ? 'sc-exit-left'    : 'sc-exit-right'
    if (phase === 'enter') return dir === 'next' ? 'sc-enter-right'  : 'sc-enter-left'
    return ''
  }

  // Calcula la dirección al ir de currentIdx → targetIdx
  function calcDir(from, to, total) {
    if (total <= 1) return 'next'
    // Salto normal
    if (to > from) return 'next'
    if (to < from) return 'prev'
    // Wrap-around: 0 → last es "prev", last → 0 es "next"
    return 'next'
  }

  const goTo = (newIdx) => {
    if (busy.current || newIdx === idx || productos.length === 0) return
    const currentSafe = Math.min(idx, productos.length - 1)

    // Dirección semántica (para la animación)
    let direction
    if (newIdx === 0 && currentSafe === productos.length - 1) direction = 'next'
    else if (newIdx === productos.length - 1 && currentSafe === 0) direction = 'prev'
    else direction = newIdx > currentSafe ? 'next' : 'prev'

    busy.current = true
    setDir(direction)
    setIdx(newIdx)          // dots actualizan de inmediato
    setPhase('exit')

    setTimeout(() => {
      setRenderIdx(newIdx)  // contenido y fondo cambian aquí (producto invisible)
      setPhase('enter')

      setTimeout(() => {
        setPhase('idle')
        busy.current = false
      }, ENTER_MS)
    }, EXIT_MS)
  }

  const prev = () => {
    const safe = Math.min(idx, Math.max(0, productos.length - 1))
    goTo((safe - 1 + productos.length) % productos.length)
  }
  const next = () => {
    const safe = Math.min(idx, Math.max(0, productos.length - 1))
    goTo((safe + 1) % productos.length)
  }

  const onTouchStart = (e) => setTouchX(e.touches[0].clientX)
  const onTouchEnd   = (e) => {
    if (touchX === null) return
    const diff = touchX - e.changedTouches[0].clientX
    if (Math.abs(diff) > 48) diff > 0 ? next() : prev()
    setTouchX(null)
  }

  /* ── Skeleton / vacío ── */
  if (loading) {
    return (
      <section id="especialidades" className="py-20 px-4" style={{ background: '#fffbf9' }}>
        <div className="max-w-6xl mx-auto text-center">
          <div className="h-5 bg-pink-100 rounded-full animate-pulse w-40 mx-auto mb-8" />
          <div className="h-64 bg-pink-50 rounded-3xl animate-pulse max-w-lg mx-auto" />
        </div>
      </section>
    )
  }

  if (productos.length === 0) {
    return (
      <section id="especialidades" className="py-20 px-4" style={{ background: '#fffbf9' }}>
        <div className="max-w-6xl mx-auto text-center">
          <p className="eyebrow mb-4">Nuestras Especialidades</p>
          <p className="text-gray-400 text-sm mt-3">
            Agrega items desde Configuración → Menú Página de Inicio.
          </p>
        </div>
      </section>
    )
  }

  const safeIdx = Math.min(idx, productos.length - 1)
  const isExiting = phase === 'exit'

  /* ── Showcase ── */
  return (
    <section
      id="especialidades"
      className="showcase-section relative overflow-hidden"
      style={{
        minHeight: 'clamp(580px, 96vh, 860px)',
        background: tema.bg,
        transition: 'background 0.85s ease-in-out',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >

      {/* Título de sección */}
      <div className="absolute top-6 left-0 right-0 flex flex-col items-center z-20 pointer-events-none">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: `${tema.accent}cc` }}>
          Casa Rosa
        </p>
        <h2
          className="font-black text-white text-center leading-tight"
          style={{ fontFamily: PLAYFAIR, fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', opacity: 0.9 }}
        >
          Algunos de nuestros productos estrella
        </h2>
      </div>

      {/* Elementos flotantes — remontán cuando cambia renderIdx */}
      {FLOAT_POS.map((pos, i) => {
        const { dur, delay, ...style } = pos
        return (
          <div
            key={`${safeRender}-${i}`}
            className="showcase-float absolute pointer-events-none select-none z-[2]"
            style={{
              ...style,
              '--sf-dur':   dur,
              '--sf-delay': delay,
              opacity:    isExiting ? 0 : 0.52,
              transition: 'opacity 0.38s ease',
            }}
          >
            {tema.flotantes[i % tema.flotantes.length]}
          </div>
        )
      })}

      {/* Texto gigante de fondo */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-[1]">
        <span
          className="font-black uppercase text-white select-none whitespace-nowrap"
          style={{
            fontSize:      'clamp(5rem, 20vw, 15rem)',
            letterSpacing: '0.04em',
            fontFamily:    PLAYFAIR,
            opacity:       isExiting ? 0 : 0.055,
            transition:    'opacity 0.38s ease',
          }}
        >
          {prod.nombre}
        </span>
      </div>

      {/* ── Contenido principal — recibe la clase de animación ── */}
      <div
        key={safeRender}                    // fuerza re-mount para resetear la animación CSS
        className={`relative z-10 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 px-6 py-24 ${contentClass()}`}
        style={{ minHeight: 'clamp(580px, 96vh, 860px)' }}
      >

        {/* Imagen del producto */}
        <div
          className="relative flex-shrink-0"
          style={{
            width:  'clamp(230px, 36vw, 400px)',
            height: 'clamp(230px, 36vw, 400px)',
          }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: tema.glow,
              filter:     'blur(80px)',
              transform:  'scale(0.85)',
            }}
          />
          <img
            src={prod.fotoUrl}
            alt={prod.nombre}
            className="showcase-product-img relative w-full h-full object-contain"
            style={{ filter: `drop-shadow(0 22px 44px ${tema.glow})` }}
          />
        </div>

        {/* Texto */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-md">

          <span
            className="text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5"
            style={{
              background: `${tema.accent}22`,
              color:      tema.accent,
              border:     `1px solid ${tema.accent}44`,
            }}
          >
            Especialidad
          </span>

          <h2
            className="font-black text-white leading-none mb-4"
            style={{ fontFamily: PLAYFAIR, fontSize: 'clamp(2rem, 5.5vw, 3.4rem)' }}
          >
            {prod.nombre}
          </h2>

          {prod.descripcion && (
            <p className="text-white/55 text-sm leading-relaxed mb-7 max-w-sm">
              {prod.descripcion}
            </p>
          )}

          <div className="flex items-center gap-5 flex-wrap justify-center lg:justify-start">
            <span className="font-black text-2xl leading-none" style={{ color: tema.accent }}>
              Bs. {Number(prod.precio).toFixed(2)}
            </span>
            <Link
              to="/online"
              className="px-7 py-3 rounded-full text-sm font-bold text-white hover:scale-105 active:scale-95 transition-transform duration-200"
              style={{
                background: `linear-gradient(135deg, ${tema.accent}cc, ${tema.accent}88)`,
                boxShadow:  `0 8px 28px ${tema.glow}`,
              }}
            >
              Pedir ahora ›
            </Link>
          </div>
        </div>
      </div>

      {/* Flechas de navegación */}
      {productos.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Anterior"
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold text-white hover:scale-110 active:scale-95 transition-transform duration-200"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)' }}
          >
            ‹
          </button>
          <button
            onClick={next}
            aria-label="Siguiente"
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold text-white hover:scale-110 active:scale-95 transition-transform duration-200"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)' }}
          >
            ›
          </button>
        </>
      )}

      {/* Dots — usan `safeIdx` (idx lógico) para respuesta inmediata */}
      {productos.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {productos.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Ir al producto ${i + 1}`}
              className="rounded-full transition-all duration-300"
              style={{
                width:      i === safeIdx ? '28px' : '8px',
                height:     '8px',
                background: i === safeIdx ? tema.accent : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>
      )}

      {/* Contador */}
      <div
        className="absolute top-5 right-5 z-20 text-xs font-semibold"
        style={{ color: 'rgba(255,255,255,0.3)' }}
      >
        {safeIdx + 1} / {productos.length}
      </div>
    </section>
  )
}
