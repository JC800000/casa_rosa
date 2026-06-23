import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { DIVIDIR_CUENTA } from '../graphql/mesas'

const bs = (n) => `Bs ${Number(n ?? 0).toFixed(2)}`

export default function SplitBillModal({ pedido, cajeraId, onClose, onCompleted }) {
  // selectedQuantities: { [detalleId]: cantidadSeleccionada }
  const [selectedQuantities, setSelectedQuantities] = useState({})
  const [medio, setMedio] = useState('efectivo')

  const [dividirCuenta, { loading }] = useMutation(DIVIDIR_CUENTA, {
    onCompleted: (data) => {
      onCompleted(data.dividirCuenta)
      onClose()
    },
    onError: (err) => {
      alert(err.message || 'Error al dividir la cuenta')
    }
  })

  const toggleSelect = (d) => {
    const dId = parseInt(d.id)
    setSelectedQuantities(prev => {
      const copy = { ...prev }
      if (copy[dId]) {
        delete copy[dId]
      } else {
        copy[dId] = d.cantidad
      }
      return copy
    })
  }

  const toggleSelectAll = () => {
    const allSelected = pedido.detalles.every(d => selectedQuantities[parseInt(d.id)] === d.cantidad)
    if (allSelected) {
      setSelectedQuantities({})
    } else {
      const next = {}
      pedido.detalles.forEach(d => {
        next[parseInt(d.id)] = d.cantidad
      })
      setSelectedQuantities(next)
    }
  }

  const adjustQty = (d, increment) => {
    const dId = parseInt(d.id)
    const currentQty = selectedQuantities[dId] || 0
    const nextQty = currentQty + increment
    if (nextQty <= 0) {
      setSelectedQuantities(prev => {
        const copy = { ...prev }
        delete copy[dId]
        return copy
      })
    } else if (nextQty <= d.cantidad) {
      setSelectedQuantities(prev => ({
        ...prev,
        [dId]: nextQty
      }))
    }
  }

  const totalCobrar = pedido.detalles.reduce((sum, d) => {
    const qty = selectedQuantities[parseInt(d.id)] || 0
    const unitPrice = Number(d.subtotal) / d.cantidad
    return sum + unitPrice * qty
  }, 0)

  const handleConfirmar = () => {
    const detallesDiv = Object.entries(selectedQuantities).map(([id, qty]) => ({
      detalleId: parseInt(id),
      cantidad: qty
    }))
    if (detallesDiv.length === 0) return
    dividirCuenta({
      variables: {
        pedidoId: parseInt(pedido.id),
        detallesDiv,
        medio,
        cajeraId: parseInt(cajeraId)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-tinta/65 backdrop-blur-md" onClick={onClose} />
      
      {/* Content */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] border border-linea animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-linea bg-crema/60">
          <div>
            <h3 className="font-fraunces font-bold text-tinta text-lg">Dividir Cuenta</h3>
            <p className="text-xs text-gris font-outfit mt-0.5">Pedido #{pedido.numeroPedido || pedido.id} — Mesa {pedido.nombreMesa}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-gris hover:text-tinta hover:bg-linea transition-all text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Instrucciones */}
          <p className="text-xs text-gris font-outfit leading-relaxed">
            Seleccioná los platos/bebidas y la cantidad que vas a cobrar por separado. El resto se mantendrá en la mesa.
          </p>

          {/* Seleccionar Todos */}
          <div className="flex justify-between items-center pb-2 border-b border-linea/60">
            <span className="text-xs font-outfit font-semibold text-gris uppercase tracking-wider">Productos en comanda</span>
            <button 
              type="button" 
              onClick={toggleSelectAll} 
              className="text-xs font-outfit font-bold text-rosa hover:text-rosa-vivo transition-colors"
            >
              {pedido.detalles.every(d => selectedQuantities[parseInt(d.id)] === d.cantidad) ? 'Desmarcar todos' : 'Marcar todos'}
            </button>
          </div>

          {/* Lista de detalles */}
          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
            {pedido.detalles.map(d => {
              const dId = parseInt(d.id)
              const selectedQty = selectedQuantities[dId] || 0
              const activo = selectedQty > 0
              const unitPrice = Number(d.subtotal) / d.cantidad
              const splitSubtotal = unitPrice * selectedQty

              return (
                <div 
                  key={d.id}
                  className={`flex flex-col gap-2 p-3 rounded-2xl border transition-all duration-250 cursor-pointer select-none ${
                    activo 
                      ? 'bg-rosa-niebla/70 border-rosa/50 shadow-sm' 
                      : 'bg-white border-linea hover:border-gris/40'
                  }`}
                  onClick={() => toggleSelect(d)}
                >
                  <div className="flex items-center gap-3 w-full">
                    {/* Custom Checkbox */}
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                      activo ? 'bg-rosa border-rosa text-white' : 'border-linea bg-white'
                    }`}>
                      {activo && (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                        </svg>
                      )}
                    </div>

                    {/* Nombre y Cantidad */}
                    <div className="flex-1 font-outfit">
                      <p className={`text-sm font-semibold transition-colors ${activo ? 'text-vino' : 'text-tinta'}`}>
                        {d.nombreItem}
                      </p>
                      <span className="text-[10px] text-gris">
                        Total en mesa: {d.cantidad} ud. · {bs(unitPrice)}/u
                      </span>
                    </div>

                    {/* Subtotal */}
                    <span className="font-fraunces font-bold text-tinta text-sm">
                      {bs(activo ? splitSubtotal : d.subtotal)}
                    </span>
                  </div>

                  {/* Quantity controls inside detail card */}
                  {activo && d.cantidad > 1 && (
                    <div className="flex items-center justify-between mt-1 pt-2 border-t border-dashed border-rosa-claro/50 pl-8" onClick={e => e.stopPropagation()}>
                      <span className="text-[10px] text-vino/70 font-outfit font-semibold">Cantidad a cobrar:</span>
                      <div className="flex items-center border border-rosa/30 rounded-lg overflow-hidden bg-white shadow-xs">
                        <button
                          type="button"
                          onClick={() => adjustQty(d, -1)}
                          className="w-5.5 h-5.5 flex items-center justify-center bg-rosa-niebla text-rosa hover:bg-rosa-claro/30 font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="px-2.5 text-xs font-bold text-vino">{selectedQty}</span>
                        <button
                          type="button"
                          onClick={() => adjustQty(d, 1)}
                          className="w-5.5 h-5.5 flex items-center justify-center bg-rosa-niebla text-rosa hover:bg-rosa-claro/30 font-bold text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {d.nota && (
                    <p className="text-[10px] text-gris italic mt-0.5 pl-8">Nota: "{d.nota}"</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Método de pago */}
          <div className="space-y-2">
            <span className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider">Método de pago</span>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: 'efectivo', label: '💵 Efectivo', activeCls: 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold' },
                { val: 'qr', label: '📱 Pago QR', activeCls: 'bg-blue-50 border-blue-500 text-blue-700 font-bold' },
              ].map(m => {
                const isSelected = medio === m.val
                return (
                  <button
                    key={m.val}
                    type="button"
                    onClick={() => setMedio(m.val)}
                    className={`py-3 rounded-2xl border text-sm font-outfit transition-all duration-200 shadow-sm flex items-center justify-center gap-1.5 ${
                      isSelected 
                        ? m.activeCls 
                        : 'bg-white border-linea text-gris hover:border-gris/40'
                    }`}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Resumen Total */}
          <div className="flex justify-between items-center bg-rosa-niebla/80 border border-rosa-claro/50 px-4 py-3.5 rounded-2xl shadow-inner">
            <span className="font-outfit font-semibold text-tinta text-sm">Total a cobrar</span>
            <span className="font-fraunces font-bold text-rosa text-lg">{bs(totalCobrar)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-crema/40 border-t border-linea flex gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="flex-1 py-3 border border-linea rounded-2xl text-gris hover:bg-crema font-outfit text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            disabled={loading || Object.keys(selectedQuantities).length === 0}
            onClick={handleConfirmar}
            className="flex-1 py-3 bg-vino hover:bg-rosa disabled:bg-gris/60 text-white rounded-2xl font-outfit font-semibold text-sm transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            {loading ? 'Procesando...' : 'Confirmar Cobro'}
          </button>
        </div>
      </div>
    </div>
  )
}
