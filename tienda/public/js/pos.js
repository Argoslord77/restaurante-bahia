// POS — carrito en memoria, cobro contra /api/ventas.
(function () {
    'use strict';
    var IVA = Number(window.CAJAFACIL_IVA || 0);
    var carrito = []; // {id, nombre, precio, stock, cantidad}
    var $ = function (id) { return document.getElementById(id); };
    var dinero = function (n) { return '$' + Number(n || 0).toFixed(2); };

    function totales() {
        var sub = 0;
        carrito.forEach(function (l) { sub += l.precio * l.cantidad; });
        var desc = Math.min(Math.max(Number($('descuento').value) || 0, 0), sub);
        var base = sub - desc;
        var iva = base * IVA / 100;
        return { sub: sub, desc: desc, iva: iva, total: base + iva };
    }

    function pintado() {
        var t = totales();
        var pagado = ['p-efectivo', 'p-tarjeta', 'p-transferencia', 'p-otro']
            .reduce(function (a, id) { return a + (Number($(id).value) || 0); }, 0);
        $('t-sub').textContent = dinero(t.sub);
        $('t-desc').textContent = dinero(t.desc);
        $('t-iva').textContent = dinero(t.iva);
        $('t-total').textContent = dinero(t.total);
        $('t-recibido').textContent = dinero(pagado);
        $('t-cambio').textContent = dinero(Math.max(pagado - t.total, 0));

        var caja = $('carrito');
        caja.innerHTML = '';
        if (!carrito.length) {
            caja.innerHTML = '<p style="color:#64748b;">Carrito vacío.</p>';
            return;
        }
        carrito.forEach(function (l, i) {
            var div = document.createElement('div');
            div.className = 'carrito-linea';
            div.innerHTML =
                '<div><strong></strong><br><small></small></div>' +
                '<div class="num"><strong></strong></div>' +
                '<div class="controles"><button type="button" class="cant-btn" data-a="-">−</button>' +
                '<span></span>' +
                '<button type="button" class="cant-btn" data-a="+">+</button>' +
                '<button type="button" class="cant-btn" data-a="x" title="Quitar">×</button></div>';
            div.querySelector('strong').textContent = l.nombre;
            div.querySelector('small').textContent = dinero(l.precio) + ' c/u · stock: ' + l.stock;
            div.querySelector('.num strong').textContent = dinero(l.precio * l.cantidad);
            div.querySelector('.controles span').textContent = l.cantidad + ' pza';
            div.querySelectorAll('button').forEach(function (b) {
                b.addEventListener('click', function () {
                    var a = b.getAttribute('data-a');
                    if (a === '+') { if (l.cantidad < l.stock) l.cantidad++; }
                    else if (a === '-') { l.cantidad--; if (l.cantidad <= 0) carrito.splice(i, 1); }
                    else { carrito.splice(i, 1); }
                    pintado();
                });
            });
            caja.appendChild(div);
        });
    }

    function agregar(p) {
        var l = null;
        carrito.forEach(function (x) { if (x.id === p.id) l = x; });
        if (l) {
            if (l.cantidad >= p.stock) { $('pos-error').textContent = 'Sin stock suficiente de "' + p.nombre + '".'; return; }
            l.cantidad++;
        } else {
            if (p.stock < 1) { $('pos-error').textContent = 'Sin stock de "' + p.nombre + '".'; return; }
            carrito.push({ id: p.id, nombre: p.nombre, precio: Number(p.precio_venta), stock: p.stock, cantidad: 1 });
        }
        $('pos-error').textContent = '';
        pintado();
    }

    var temporizador = null;
    $('buscador').addEventListener('input', function () {
        clearTimeout(temporizador);
        var q = this.value.trim();
        var res = $('resultados');
        if (!q) { res.innerHTML = '<p style="color:#64748b;">Escriba al menos 1 letra para buscar.</p>'; return; }
        temporizador = setTimeout(function () {
            fetch('/api/productos?q=' + encodeURIComponent(q), { headers: { 'Accept': 'application/json' } })
                .then(function (r) { return r.json(); })
                .then(function (d) {
                    res.innerHTML = '';
                    if (!d.success) {
                        res.innerHTML = '<p style="color:#b91c1c;">' + (d.message || 'Error al buscar.') + '</p>';
                        return;
                    }
                    if (!d.items.length) {
                        res.innerHTML = '<p style="color:#64748b;">Sin resultados.</p>';
                        return;
                    }
                    d.items.forEach(function (p) {
                        var b = document.createElement('button');
                        b.type = 'button';
                        b.className = 'producto-hit';
                        b.style.width = '100%';
                        b.style.textAlign = 'left';
                        b.innerHTML = '<div><div class="nombre"></div><div class="detalle"></div></div><div class="precio"></div>';
                        b.querySelector('.nombre').textContent = p.nombre;
                        b.querySelector('.detalle').textContent = (p.sku ? p.sku + ' · ' : '') + 'stock: ' + p.stock;
                        b.querySelector('.precio').textContent = dinero(p.precio_venta);
                        b.addEventListener('click', function () { agregar(p); });
                        res.appendChild(b);
                    });
                })
                .catch(function () { res.innerHTML = '<p style="color:#b91c1c;">Error al buscar.</p>'; });
        }, 250);
    });

    ['descuento', 'p-efectivo', 'p-tarjeta', 'p-transferencia', 'p-otro'].forEach(function (id) {
        $(id).addEventListener('input', pintado);
    });

    $('btn-limpiar').addEventListener('click', function () {
        carrito = [];
        $('descuento').value = 0;
        ['p-efectivo', 'p-tarjeta', 'p-transferencia', 'p-otro'].forEach(function (id) { $(id).value = 0; });
        $('pos-error').textContent = '';
        pintado();
    });

    $('btn-cobrar').addEventListener('click', function () {
        $('pos-error').textContent = '';
        var t = totales();
        if (!carrito.length) { $('pos-error').textContent = 'El carrito está vacío.'; return; }
        var pagos = [
            { metodo: 'efectivo', monto: Number($('p-efectivo').value) || 0 },
            { metodo: 'tarjeta', monto: Number($('p-tarjeta').value) || 0 },
            { metodo: 'transferencia', monto: Number($('p-transferencia').value) || 0 },
            { metodo: 'otro', monto: Number($('p-otro').value) || 0 }
        ].filter(function (p) { return p.monto > 0; });
        var btn = this;
        btn.disabled = true;
        fetch('/api/ventas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                items: carrito.map(function (l) { return { producto_id: l.id, cantidad: l.cantidad }; }),
                descuento: t.desc,
                pagos: pagos
            })
        })
            .then(function (r) { return r.json().then(function (d) { return { status: r.status, body: d }; }); })
            .then(function (r) {
                btn.disabled = false;
                if (!r.body.success) { $('pos-error').textContent = r.body.message || 'No se pudo cobrar.'; return; }
                window.location.href = '/ventas/' + r.body.venta_id + '/ticket';
            })
            .catch(function () { btn.disabled = false; $('pos-error').textContent = 'Error de conexión al cobrar.'; });
    });

    pintado();
})();
