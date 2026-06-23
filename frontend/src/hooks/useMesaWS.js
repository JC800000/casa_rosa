import { useEffect, useRef, useState, useCallback } from 'react'

function wsBase() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}`
}

export function useMesaWS(mesaId, onMessage) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const retryRef = useRef(null)
  const cbRef = useRef(onMessage)
  cbRef.current = onMessage

  const connect = useCallback(() => {
    if (!mesaId) return
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return
    const ws = new WebSocket(`${wsBase()}/ws/mesa/${mesaId}/`)
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
  }, [mesaId])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(retryRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return connected
}
