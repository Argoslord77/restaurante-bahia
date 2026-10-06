// tienda/config/logger.js — Bitácora mínima (consola con fecha y nivel).
'use strict';

function linea(nivel, args) {
    const hora = new Date().toISOString();
    const texto = args.map(a => (a instanceof Error ? (a.stack || a.message) : a)).join(' ');
    const salida = `[${hora}] [${nivel}] ${texto}\n`;
    if (nivel === 'ERROR' || nivel === 'WARN') process.stderr.write(salida);
    else process.stdout.write(salida);
}

module.exports = {
    info: (...args) => linea('INFO', args),
    warn: (...args) => linea('WARN', args),
    error: (...args) => linea('ERROR', args)
};
