import { useEffect, useRef, useState, useCallback } from 'react'

// En dev, Vite proxea /ws → localhost:8000 (ver vite.config.js)
// En producción, setear VITE_WS_URL=wss://tu-backend.up.railway.app
function wsBase() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}`
}

export function useCocinaWS(onMessage) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const retryRef = useRef(null)
  const cbRef = useRef(onMessage)
  cbRef.current = onMessage

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return
    const ws = new WebSocket(`${wsBase()}/ws/cocina/`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)

    ws.onmessage = (e) => {
      try { cbRef.current(JSON.parse(e.data)) } catch {}
    }

    ws.onclose = () => {
      setConnected(false)
      retryRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => ws.close()
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(retryRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return connected
}
