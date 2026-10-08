// centro/tests/paquete.test.js — El empaquetado Android es coherente:
// mismo appId en config, gradle, strings y MainActivity; iconos completos.
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const APPID = 'com.argoscore.centroprecios';
const NOMBRE = 'Centro de Precios';
const DENS = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];

function lee(f) { return fs.readFileSync(path.join(RAIZ, f), 'utf8'); }

describe('Paquete Android', () => {
    test('capacitor.config.json válido', () => {
        const c = JSON.parse(lee('capacitor.config.json'));
        expect(c.appId).toBe(APPID);
        expect(c.appName).toBe(NOMBRE);
        expect(c.webDir).toBe('www');
        // Esquema http: la app habla con el servidor por http://IP:3101 (red
        // local); con https el WebView bloquearía todo por contenido mixto.
        expect(c.androidScheme).toBe('http');
        expect(fs.existsSync(path.join(RAIZ, 'www', 'index.html'))).toBe(true);
    });

    test('package.json trae Capacitor + filesystem', () => {
        const p = JSON.parse(lee('package.json'));
        for (const d of ['@capacitor/android', '@capacitor/cli', '@capacitor/core', '@capacitor/filesystem']) {
            expect(p.dependencies[d]).toBeTruthy();
        }
        expect(p.scripts.sync).toMatch('cap sync');
    });

    test('gradle y strings usan el mismo appId', () => {
        const g = lee('android/app/build.gradle');
        expect(g).toContain(`namespace = "${APPID}"`);
        expect(g).toContain(`applicationId "${APPID}"`);
        const s = lee('android/app/src/main/res/values/strings.xml');
        expect(s).toContain(`<string name="app_name">${NOMBRE}</string>`);
        expect(s).toContain(`<string name="package_name">${APPID}</string>`);
    });

    test('MainActivity en su paquete y sin impresora', () => {
        const f = 'android/app/src/main/java/com/argoscore/centroprecios/MainActivity.java';
        expect(fs.existsSync(path.join(RAIZ, f))).toBe(true);
        const j = lee(f);
        expect(j).toContain('package com.argoscore.centroprecios;');
        expect(j).toContain('extends BridgeActivity');
        expect(j).not.toMatch('printer');
    });

    test('manifest con INTERNET, cleartext y sin bluetooth', () => {
        const m = lee('android/app/src/main/AndroidManifest.xml');
        expect(m).toContain('android.permission.INTERNET');
        // El servidor se consume por http://IP:3101 (red local): Android 9+
        // lo bloquea salvo que se declare aquí.
        expect(m).toContain('android:usesCleartextTraffic="true"');
        expect(m).not.toMatch('BLUETOOTH');
    });

    test('iconos y splash completos', () => {
        for (const d of DENS) {
            for (const n of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
                expect(fs.existsSync(path.join(RAIZ, `android/app/src/main/res/mipmap-${d}/${n}`))).toBe(true);
            }
            for (const o of ['land', 'port']) {
                expect(fs.existsSync(path.join(RAIZ, `android/app/src/main/res/drawable-${o}-${d}/splash.png`))).toBe(true);
            }
        }
    });
});
