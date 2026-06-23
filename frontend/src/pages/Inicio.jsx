import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@apollo/client/react'
import { GET_CONFIGURACION } from '../graphql/configuracion'
import ShowcaseProductos from '../components/ShowcaseProductos'
import logo      from '../assets/logo.webp'
import letrasLogo from '../assets/letras_logo.webp'
import heroImage  from '../assets/casa_rosa_hero.png'
import fotoChef   from '../assets/foto_chef.webp'
import './Inicio.css'

const PLAYFAIR = "'Playfair Display', Georgia, serif"


const STATS = [
  { value: '100%',        label: 'Artesanal' },
  { value: '20+',         label: 'Creaciones' },
  { value: 'Bolivia',     label: 'Vallegrande' },
  { value: 'Fresco',      label: 'Cada Día' },
]

const PETALS = [
  { left: '6%',  dur: '13s', delay: '0s',   e: '🌸' },
  { left: '20%', dur: '11s', delay: '3.5s', e: '🌹' },
  { left: '38%', dur: '17s', delay: '7s',   e: '🌸' },
  { left: '56%', dur: '12s', delay: '1.5s', e: '✿'  },
  { left: '72%', dur: '15s', delay: '5.5s', e: '🌸' },
  { left: '88%', dur: '10s', delay: '9s',   e: '🌹' },
]

export default function Inicio() {
  const [menuOpen, setMenuOpen]   = useState(false)
  const [scrolled, setScrolled]   = useState(false)
  const pageRef                   = useRef(null)

  const { data: confData } = useQuery(GET_CONFIGURACION)
  const conf = confData?.configuracion

  const infoItems = [
    { icon: '📍', title: 'Dirección',           detail: conf?.direccionFisica      || 'Av. Las Rosas #123, Zona Central, Bolivia' },
    { icon: '📞', title: 'Contacto & WhatsApp', detail: conf?.telefonoWhatsapp     || '+591 76543210' },
    { icon: '🕒', title: 'Horario de Atención', detail: conf?.horarioAtencion      || 'Lunes a Domingo: 8:00 AM – 10:00 PM' },
    { icon: '🅿️', title: 'Estacionamiento',     detail: conf?.estacionamientoDetalle || 'Disponible frente al local' },
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 55)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!pageRef.current) return
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('anim-visible')
      }),
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
    )
    pageRef.current.querySelectorAll('[data-anim]').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-x-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >

      {/* ══════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════ */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-white/96 backdrop-blur-xl shadow-sm shadow-pink-100/60'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">

          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src={logo}
              alt="Casa Rosa"
              className="w-10 h-10 sm:w-11 sm:h-11 object-contain rounded-full flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
            />
            <span
              className={`font-bold text-lg sm:text-xl transition-colors duration-300 ${
                scrolled ? 'text-rose-800' : 'text-white'
              }`}
              style={{ fontFamily: PLAYFAIR }}
            >
              Casa Rosa
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className={`text-sm font-semibold transition-colors duration-300 nav-link-slide ${
                scrolled ? 'text-rose-700 hover:text-rose-900' : 'text-white hover:text-pink-200'
              }`}
            >
              Inicio
            </Link>
            <Link
              to="/online"
              className={`text-sm font-medium transition-colors duration-300 nav-link-slide ${
                scrolled ? 'text-gray-600 hover:text-rose-700' : 'text-white/75 hover:text-white'
              }`}
            >
              Pedidos en Línea
            </Link>
            <Link
              to="/login"
              className={`text-sm font-semibold px-5 py-2 rounded-full border-2 transition-all duration-300 ${
                scrolled
                  ? 'border-rose-500 text-rose-600 hover:bg-rose-500 hover:text-white hover:shadow-lg hover:shadow-rose-200'
                  : 'border-white/40 text-white hover:border-white hover:bg-white/10'
              }`}
            >
              Acceso Personal
            </Link>
          </nav>

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(m => !m)}
            className={`md:hidden flex flex-col gap-[6px] p-2 transition-colors ${
              scrolled ? 'text-rose-700' : 'text-white'
            } ${menuOpen ? 'ham-open' : ''}`}
            aria-label="Menú"
          >
            <span className="ham-line ham-line-1" />
            <span className="ham-line ham-line-2" />
            <span className="ham-line ham-line-3" />
          </button>
        </div>

        {/* Mobile menu */}
        <div className={`mobile-menu md:hidden bg-white/97 backdrop-blur-xl border-t border-pink-100 ${menuOpen ? 'open' : ''}`}>
          <div className="px-6 py-5 flex flex-col gap-4">
            <Link to="/"       onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-rose-700">Inicio</Link>
            <Link to="/online" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-600">Pedidos en Línea</Link>
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="text-sm font-semibold text-center text-rose-600 border-2 border-rose-300 py-3 rounded-full hover:bg-rose-50 transition-colors"
            >
              Acceso Personal
            </Link>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════
          HERO — cinematic dark luxury + chef
      ══════════════════════════════════════════ */}
      <section className="hero-gradient relative min-h-screen flex flex-col justify-center items-center overflow-hidden">

        {/* Background orbs */}
        <div className="orb orb-1" style={{ width: 'clamp(260px, 36vw, 460px)', height: 'clamp(260px, 36vw, 460px)', background: 'rgba(236,72,153,0.17)', filter: 'blur(90px)', top: '12%', left: '30%' }} />
        <div className="orb orb-2" style={{ width: 'clamp(220px, 30vw, 380px)', height: 'clamp(220px, 30vw, 380px)', background: 'rgba(251,113,133,0.1)', filter: 'blur(80px)', bottom: '18%', right: '-2%' }} />
        <div className="orb orb-3" style={{ width: 'clamp(280px, 45vw, 560px)', height: 'clamp(280px, 45vw, 560px)', background: 'rgba(159,18,57,0.08)', filter: 'blur(130px)', top: '50%', left: '55%', transform: 'translate(-50%, -50%)' }} />
        {/* Warm glow behind chef */}
        <div className="orb orb-1" style={{ width: 'clamp(200px, 28vw, 380px)', height: 'clamp(200px, 28vw, 380px)', background: 'rgba(190,24,93,0.22)', filter: 'blur(70px)', bottom: '5%', left: '-4%' }} />

        {/* Falling petals — first 3 show on mobile too, last 3 desktop-only */}
        {PETALS.map((p, i) => (
          <div
            key={i}
            className={`petal${i >= 3 ? ' petal-extra' : ''}`}
            style={{ left: p.left, animationDuration: p.dur, animationDelay: p.delay }}
          >
            {p.e}
          </div>
        ))}

        {/* ── Chef — desktop: columna izquierda / mobile: esquina inferior derecha ── */}
        <div className="chef-container absolute z-[5] flex items-end pointer-events-none">
          <img
            src={fotoChef}
            alt="Chef Abel Silva"
            className="chef-img"
          />
        </div>

        {/* ── Chef name badge — bottom left ── */}
        <div className="absolute bottom-20 sm:bottom-10 left-4 sm:left-8 z-[8] flex chef-badge">
          <div className="chef-badge-icon">👨‍🍳</div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Abel Silva</p>
            <p className="text-pink-300/70 font-semibold uppercase tracking-widest mt-0.5" style={{ fontSize: '0.6rem' }}>Chef Ejecutivo</p>
          </div>
        </div>

        {/* ── Main content — shifted right to complement chef ── */}
        <div className="hero-content-col relative z-10 flex flex-col items-center text-center w-full pt-20 pb-16">

          {/* Logo with orbital rings */}
          <div className="hero-logo-reveal relative mb-8 sm:mb-12 mx-auto">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="orbit-ring" style={{ width: 'calc(100% + 60px)', height: 'calc(100% + 60px)', border: '1px solid rgba(244,114,182,0.22)' }} />
              <div className="orbit-ring" style={{ width: 'calc(100% + 110px)', height: 'calc(100% + 110px)', border: '1px solid rgba(244,114,182,0.11)', animationDirection: 'reverse', animationDuration: '42s' }} />
              <div className="orbit-ring" style={{ width: 'calc(100% + 168px)', height: 'calc(100% + 168px)', border: '1px solid rgba(244,114,182,0.05)', animationDuration: '62s' }} />
            </div>
            <div className="logo-glow logo-float relative" style={{ width: 'clamp(110px, 16vw, 168px)', height: 'clamp(110px, 16vw, 168px)' }}>
              <img src={logo} alt="Casa Rosa" className="w-full h-full object-contain" style={{ filter: 'drop-shadow(0 0 24px rgba(244,114,182,0.5))' }} />
            </div>
          </div>

          {/* Tag */}
          <p className="hero-tag eyebrow mb-4" style={{ color: 'rgba(244,114,182,0.65)' }}>
            El mejor café de Vallegrande
          </p>

          {/* Title */}
          <h1 className="hero-title text-white leading-none tracking-tighter mb-5"
            style={{ fontFamily: PLAYFAIR, fontSize: 'clamp(2.8rem, 9vw, 6.5rem)', fontWeight: 800 }}>
            Casa <em className="text-rose-gradient not-italic">Rosa</em>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle text-white/52 leading-relaxed mb-9 max-w-sm mx-auto"
            style={{ fontSize: 'clamp(0.85rem, 2.2vw, 1.05rem)' }}>
            Donde cada bocado es una historia y cada café es un abrazo.
            Pastelería artesanal con sabor vallegrandino.
          </p>

          {/* CTAs */}
          <div className="hero-cta flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full sm:w-auto">
            <Link to="/online"
              className="btn-glow px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-700 text-white font-semibold rounded-full shadow-2xl hover:scale-105 hover:shadow-pink-600/40 transition-all duration-300 text-sm text-center"
              style={{ boxShadow: '0 16px 48px rgba(159,18,57,0.45)' }}>
              Hacer un Pedido <span className="arrow inline-block transition-transform duration-300">&rsaquo;</span>
            </Link>
            <a href="#especialidades"
              className="px-8 py-4 text-white/65 font-medium rounded-full border border-white/20 hover:border-pink-400/50 hover:bg-white/5 hover:text-white transition-all duration-300 text-sm text-center">
              Explorar el Menú
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
          <span className="text-white/28 font-semibold uppercase tracking-[0.25em]" style={{ fontSize: '0.58rem' }}>Scroll</span>
          <div className="w-px h-9 bg-gradient-to-b from-pink-400/45 to-transparent" />
          <div className="scroll-dot w-1.5 h-1.5 rounded-full bg-pink-400/50" />
        </div>

        {/* Wave to next section */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 72" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full"
            style={{ height: 'clamp(40px, 6vw, 72px)', fill: '#fffbf9' }}>
            <path d="M0,36 C320,72 640,0 960,36 C1100,54 1320,22 1440,36 L1440,72 L0,72 Z" />
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════ */}
      <section style={{ background: '#fffbf9' }} className="py-10 sm:py-12 px-4 border-b border-pink-100/70">
        <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4">
          {STATS.map((s, i) => (
            <div
              key={i}
              className="stat-item text-center py-4 px-2"
              data-anim="fade-up"
              style={{ '--anim-delay': `${i * 80}ms` }}
            >
              <div
                className="text-rose-gradient font-black leading-none"
                style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)' }}
              >
                {s.value}
              </div>
              <div className="text-gray-400 font-semibold uppercase tracking-widest mt-2" style={{ fontSize: '0.65rem' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          ESPECIALIDADES — showcase interactivo
      ══════════════════════════════════════════ */}
      <ShowcaseProductos />

      {/* ══════════════════════════════════════════
          ABOUT / EXPERIENCE
      ══════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 bg-white">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Visual */}
          <div className="relative flex justify-center" data-anim="fade-right">
            <div className="relative w-full max-w-sm sm:max-w-md">
              {/* Decorative offset shapes */}
              <div
                className="absolute -inset-4 rounded-[2.5rem] rotate-3"
                style={{ background: 'linear-gradient(135deg, #fce7f3, #fdf2f8)' }}
              />
              <div
                className="absolute -inset-4 rounded-[2.5rem] -rotate-2 opacity-55"
                style={{ background: 'linear-gradient(225deg, #ffe4f0, #fff0f5)' }}
              />

              {/* Image card */}
              <div className="relative rounded-[1.75rem] overflow-hidden shadow-2xl aspect-[4/3]">
                <img
                  src={conf?.fotoHistoriaUrl || heroImage}
                  alt="Casa Rosa delicias"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-rose-900/30 to-transparent" />
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-5 -right-5 sm:-bottom-6 sm:-right-6 bg-white rounded-2xl shadow-xl p-3 sm:p-4 flex items-center gap-3 border border-pink-100">
                <span className="text-3xl">🌹</span>
                <div>
                  <p className="font-bold text-sm text-gray-900 leading-none">100% Artesanal</p>
                  <p className="text-xs text-gray-400 mt-0.5">Hecho con amor</p>
                </div>
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="space-y-6" data-anim="fade-left">
            <p className="eyebrow">Nuestra Historia</p>
            <h2
              className="font-bold text-gray-900 leading-tight"
              style={{ fontFamily: PLAYFAIR, fontSize: 'clamp(1.65rem, 4.5vw, 2.8rem)' }}
            >
              Un rincón de amor<br />
              <span className="text-rose-gradient">hecho para ti</span>
            </h2>
            <p className="text-gray-500 leading-relaxed" style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
              Casa Rosa nació del sueño de crear un espacio en Vallegrande donde la pastelería
              artesanal se encuentre con el café de especialidad. Cada receta es una tradición,
              cada ingrediente una elección consciente.
            </p>
            <p className="text-gray-500 leading-relaxed" style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
              Nuestro salón está diseñado para que te sientas en casa: íntimo, cálido y lleno de
              detalles que hacen de cada visita una experiencia única e irrepetible.
            </p>
            <Link
              to="/online"
              className="btn-glow inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-rose-600 to-pink-500 text-white text-sm font-semibold rounded-full shadow-lg hover:scale-105 hover:shadow-rose-200 transition-all duration-300"
            >
              Ver Nuestro Menú <span className="arrow inline-block transition-transform duration-300">&rsaquo;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════ */}
      <section className="cta-gradient relative py-20 sm:py-24 px-4 overflow-hidden">

        {/* Background orbs */}
        <div
          className="orb orb-1"
          style={{
            width: '320px', height: '320px',
            background: 'rgba(244,114,182,0.18)',
            filter: 'blur(70px)',
            top: '-10%', left: '-5%',
          }}
        />
        <div
          className="orb orb-2"
          style={{
            width: '280px', height: '280px',
            background: 'rgba(251,113,133,0.12)',
            filter: 'blur(60px)',
            bottom: '-10%', right: '-5%',
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto text-center">

          {/* Sparkle row */}
          <div className="flex justify-center items-center gap-5 mb-7">
            <span className="text-pink-300/70 text-xl sp1">✦</span>
            <span className="text-pink-200/80 text-2xl sp2">🌸</span>
            <span className="text-pink-300/70 text-xl sp3">✦</span>
          </div>

          <h2
            className="text-white font-bold mb-5 leading-tight"
            data-anim="fade-up"
            style={{ fontFamily: PLAYFAIR, fontSize: 'clamp(1.65rem, 5.5vw, 3.1rem)' }}
          >
            ¿Listo para darte un capricho?
          </h2>
          <p
            className="text-white/55 mb-10 max-w-xl mx-auto leading-relaxed"
            data-anim="fade-up"
            style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)', '--anim-delay': '110ms' }}
          >
            Realizá tu pedido en línea y recíbelo en casa o pasa a recogerlo sin esperas.
            Pura delicia, sin complicaciones.
          </p>

          <div
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4"
            data-anim="fade-up"
            style={{ '--anim-delay': '220ms' }}
          >
            <Link
              to="/online"
              className="btn-glow px-8 py-4 bg-white text-rose-700 font-bold text-sm rounded-full shadow-2xl hover:scale-105 hover:shadow-white/20 transition-all duration-300 text-center"
              style={{ boxShadow: '0 16px 40px rgba(0,0,0,0.35)' }}
            >
              Pedir Ahora <span className="arrow inline-block transition-transform duration-300">&rsaquo;</span>
            </Link>
            <a
              href={`https://wa.me/${(conf?.telefonoWhatsapp || '59176543210').replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 text-white font-semibold text-sm rounded-full border-2 border-white/28 hover:border-white/55 hover:bg-white/8 transition-all duration-300 text-center"
            >
              WhatsApp <span className="arrow inline-block transition-transform duration-300">&rsaquo;</span>
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          LOCATION
      ══════════════════════════════════════════ */}
      <section style={{ background: '#fffbf9' }} className="py-20 sm:py-28 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center mb-12" data-anim="fade-up">
            <p className="eyebrow mb-4">¿Dónde encontrarnos?</p>
            <h2
              className="font-bold text-gray-900 leading-tight"
              style={{ fontFamily: PLAYFAIR, fontSize: 'clamp(1.5rem, 4.5vw, 2.6rem)' }}
            >
              Ven a disfrutar<br />
              <span className="text-rose-gradient">la experiencia completa</span>
            </h2>
          </div>

          {/* Info cards — fila horizontal */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-anim="fade-up" style={{ '--anim-delay': '100ms' }}>
            {infoItems.map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-3 p-5 rounded-2xl bg-white border border-pink-100 shadow-sm hover:shadow-md hover:border-pink-200 transition-all duration-200">
                <div className="w-11 h-11 rounded-xl bg-pink-50 flex items-center justify-center text-xl">
                  {item.icon}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-snug">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Botón cómo llegar */}
          <div className="flex justify-center mb-10" data-anim="fade-up" style={{ '--anim-delay': '180ms' }}>
            <a
              href={conf?.googleMapsUrl || `https://maps.google.com/maps?q=${encodeURIComponent(conf?.direccionFisica || 'Av. Las Rosas #123, Bolivia')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-rose-600 to-pink-500 text-white text-sm font-semibold rounded-full shadow-lg hover:scale-105 hover:shadow-rose-200 transition-all duration-300"
            >
              Cómo llegar <span className="arrow inline-block transition-transform duration-300">&rsaquo;</span>
            </a>
          </div>

          {/* Mapa ancho completo */}
          <div data-anim="fade-up" style={{ '--anim-delay': '240ms' }}>
            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl" style={{ height: '420px', border: '3px solid rgba(244,114,182,0.22)' }}>
              {conf?.googleMapsEmbedUrl ? (
                <iframe
                  title="Ubicación Casa Rosa"
                  src={conf.googleMapsEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0, display: 'block' }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center text-center p-10"
                  style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fdf2f8 50%, #f9d5e6 100%)' }}
                >
                  <div className="pin-float text-6xl mb-5">📍</div>
                  <p className="text-rose-900 font-bold text-xl mb-2" style={{ fontFamily: PLAYFAIR }}>¡Te esperamos!</p>
                  <p className="text-rose-700/60 text-sm max-w-xs leading-relaxed">
                    {conf?.direccionFisica || 'Av. Las Rosas #123, Zona Central, Bolivia'}
                  </p>
                  <p className="text-rose-400/50 text-xs mt-6">Configurá el mapa desde el panel de administración</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer className="footer-bg px-4 sm:px-6 pt-14 pb-8">
        <div className="max-w-6xl mx-auto">

          {/* Top row */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-10 pb-10 border-b border-white/[0.07]">

            {/* Brand */}
            <div className="flex flex-col items-center sm:items-start gap-4">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Casa Rosa" className="w-12 h-12 object-contain rounded-full" />
                <img src={letrasLogo} alt="Casa Rosa" className="h-8 object-contain opacity-85" />
              </div>
              <p className="text-white/35 text-xs max-w-[220px] text-center sm:text-left leading-relaxed">
                Arte artesanal boliviano. Momentos dulces, recuerdos inolvidables.
              </p>
            </div>

            {/* Nav links */}
            <nav className="flex flex-col sm:flex-row items-center gap-4 sm:gap-10">
              <Link to="/"       className="text-white/40 hover:text-white text-sm font-medium transition-colors duration-200">Inicio</Link>
              <Link to="/online" className="text-white/40 hover:text-white text-sm font-medium transition-colors duration-200">Pedidos en Línea</Link>
              <Link to="/login"  className="text-white/40 hover:text-white text-sm font-medium transition-colors duration-200">Acceso Personal</Link>
            </nav>
          </div>

          {/* Bottom row */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <p className="text-white/22 text-xs">© 2026 Casa Rosa. Todos los derechos reservados.</p>
            <p className="text-white/22 text-xs">Hecho con amor en Vallegrande, Bolivia</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
