document.addEventListener('DOMContentLoaded', () => {
  const pedidoId = document.getElementById('pedido-id-display').innerText;

  // 1. Refrescar totales asincrónicamente
  const actualizarTotales = async () => {
    try {
      const response = await fetch(`/pedidos/${pedidoId}/totales`);
      const data = await response.json();
      if (data.success) {
        document.getElementById('subtotal-val').innerText = `$${data.subtotal.toFixed(2)}`;
        document.getElementById('iva-val').innerText = `$${data.impuestos.toFixed(2)}`;
        document.getElementById('total-val').innerText = `$${data.total.toFixed(2)}`;
      }
    } catch (error) {
      console.error('Error calculando totales:', error);
    }
  };

  actualizarTotales();

  // 2. Vincular ID de detalle al abrir el modal de modificadores
  document.querySelectorAll('.btn-modificador').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const detalleId = e.currentTarget.getAttribute('data-detalle-id');
      document.getElementById('modal-detalle-id').value = detalleId;
    });
  });

  // 3. Selección y guardado de extra via Fetch API
  document.querySelectorAll('.opt-mod').forEach(opt => {
    opt.addEventListener('click', async (e) => {
      const modificadorId = e.currentTarget.getAttribute('data-mod-id');
      const detalleId = document.getElementById('modal-detalle-id').value;

      try {
        const response = await fetch(`/pedidos/item/${detalleId}/modificadores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modificadorId })
        });
        const result = await response.json();
        
        if (result.success) {
          location.reload(); // Recarga limpia para reflejar el extra en la lista y recalcular
        } else {
          alert('No se pudo aplicar el modificador: ' + result.message);
        }
      } catch (error) {
        console.error('Error enviando modificador:', error);
      }
    });
  });

  // 4. Procesar cobro y explosión del pedido
  const btnCobrar = document.getElementById('btn-cobrar');
  if (btnCobrar) {
    btnCobrar.addEventListener('click', async () => {
      if (!confirm('¿Desea cerrar y cobrar la mesa? Esto descontará insumos del inventario.')) return;
      
      try {
        const response = await fetch(`/caja/cobrar/${pedidoId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ almacenId: 1 }) // ID del almacén principal de cocina
        });
        const resData = await response.json();
        
        if (resData.success) {
          alert('¡Cobro exitoso! Descuento de recetas procesado.');
          window.location.href = '/pos/mesas';
        } else {
          alert('Error en cobro: ' + resData.message);
        }
      } catch (error) {
        alert('Error de red al intentar cobrar.');
      }
    });
  }
});