// clienteController.test.js — anti-duplicación de pre-pedidos
const ClienteController = require('./clienteController');

jest.mock('../config/db');
jest.mock('../services/settingService');
jest.mock('../models/platilloDiaModel');
jest.mock('../services/turnoService');
jest.mock('../services/precioService', () => ({
  obtenerContextoCobro: jest.fn().mockResolvedValue({}),
  validarPrecioConfigurado: jest.fn()
}));

const db = require('../config/db');
const turnoService = require('../services/turnoService');

const PLATILLO = [{ id: 10, nombre: 'Ceviche', precio: 8.5, precio_alt: 300, precio_usd: 8.5 }];

function crearReq(items, idMesa = '1') {
  return { params: { id_mesa: idMesa }, body: { items } };
}
function crearRes() {
  return {
    statusCode: null,
    payload: null,
    status(c) { this.statusCode = c; return this; },
    json(p) { this.payload = p; return this; }
  };
}

describe('clienteController.agregarAPreorden — anti-duplicados', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    turnoService.obtenerTurnoActivo.mockResolvedValue({ id: 1 });
    // db.query: primer SELECT devuelve el platillo, INSERT resuelve vacío
    db.query.mockImplementation(async (sql) => {
      if (/INSERT INTO pre_pedidos/i.test(sql)) return [[]];
      return [PLATILLO];
    });
  });

  test('la misma carga repetida dentro de la ventana se marca duplicada y no reinserta', async () => {
    const items = [{ id_platillo: 10, cantidad: 2, notas_especiales: 'sin cebolla' }];

    const res1 = await ClienteController.agregarAPreorden(crearReq(items), crearRes());
    expect(res1.payload).toEqual(expect.objectContaining({ success: true }));
    const inserts1 = db.query.mock.calls.filter(([sql]) => /INSERT INTO pre_pedidos/i.test(sql));
    expect(inserts1).toHaveLength(1);

    // Segundo envío idéntico (doble toque / reintento)
    const res2 = await ClienteController.agregarAPreorden(crearReq(items), crearRes());
    expect(res2.payload).toEqual(expect.objectContaining({ success: true, duplicado: true }));
    const inserts2 = db.query.mock.calls.filter(([sql]) => /INSERT INTO pre_pedidos/i.test(sql));
    expect(inserts2).toHaveLength(1); // sigue habiendo un solo INSERT en total
  });

  test('contenido distinto para la misma mesa NO se considera duplicado', async () => {
    const primera = [{ id_platillo: 10, cantidad: 1 }];
    const segunda = [{ id_platillo: 10, cantidad: 1 }, { id_platillo: 10, cantidad: 1 }];

    const res1 = await ClienteController.agregarAPreorden(crearReq(primera, '7'), crearRes());
    const res2 = await ClienteController.agregarAPreorden(crearReq(segunda, '7'), crearRes());
    expect(res2.payload.duplicado).toBeUndefined();
    const inserts = db.query.mock.calls.filter(([sql]) => /INSERT INTO pre_pedidos/i.test(sql));
    expect(inserts).toHaveLength(2);
  });

  test('los ítems idénticos dentro de una misma solicitud se fusionan sumando cantidad', async () => {
    const items = [
      { id_platillo: 10, cantidad: 1, notas_especiales: 'sin sal' },
      { id_platillo: 10, cantidad: 3, notas_especiales: 'Sin Sal' } // misma clave, mayúsculas
    ];
    const res = await ClienteController.agregarAPreorden(crearReq(items, '9'), crearRes());
    expect(res.payload.success).toBe(true);

    const insert = db.query.mock.calls.find(([sql]) => /INSERT INTO pre_pedidos/i.test(sql));
    const placeholders = insert[0].match(/\(\?, \?, \?, \?, \?\)/g) || [];
    expect(placeholders).toHaveLength(1); // una sola fila
    // values: id_mesa, id_platillo, esDia, cantidad fusionada, notas
    expect(insert[1]).toEqual([ '9', 10, 0, 4, 'sin sal' ]);
  });

  test('un pedido repetido pero de otra mesa sí se inserta', async () => {
    const items = [{ id_platillo: 10, cantidad: 2 }];
    await ClienteController.agregarAPreorden(crearReq(items, '3'), crearRes());
    const res = await ClienteController.agregarAPreorden(crearReq(items, '4'), crearRes());
    expect(res.payload.duplicado).toBeUndefined();
    const inserts = db.query.mock.calls.filter(([sql]) => /INSERT INTO pre_pedidos/i.test(sql));
    expect(inserts).toHaveLength(2);
  });

  test('validaciones básicas siguen activas', async () => {
    const sinItems = await ClienteController.agregarAPreorden(crearReq([]), crearRes());
    expect(sinItems.statusCode).toBe(400);

    const cantidadInvalida = await ClienteController.agregarAPreorden(
      crearReq([{ id_platillo: 10, cantidad: -2 }]), crearRes()
    );
    expect(cantidadInvalida.statusCode).toBe(400);
  });
});
