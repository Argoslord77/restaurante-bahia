const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/userModel'); // Usamos tu modelo actual

module.exports = function(passport) {
    passport.use(
        new LocalStrategy({ usernameField: 'usuario' }, async (usuario, password, done) => {
            try {
                // 1. Buscar usuario delegando correctamente en tu modelo User
                // NOTA: Si en tu userModel no tienes un método llamado getByUsername, 
                // asegúrate de crearlo implementando la consulta: 'SELECT * FROM usuarios WHERE usuario = ?'
                const user = await User.getByUsername(usuario);

                if (!user) {
                    // En las vistas el mensaje de error de Passport se mapea automáticamente a través de failureFlash
                    return done(null, false, { message: 'El usuario no está registrado.' });
                }

                // 2. Verificar la contraseña encriptada
                const isMatch = await bcrypt.compare(password, user.password);
                if (isMatch) {
                    return done(null, user); // Credenciales correctas, Passport serializa la sesión
                } else {
                    return done(null, false, { message: 'Contraseña incorrecta.' });
                }
            } catch (error) {
                console.error("Error crítico en la estrategia Passport Local:", error);
                return done(error);
            }
        })
    );

    // Guardar el ID del usuario en la sesión
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Recuperar el objeto usuario completo a partir del ID de la sesión
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.getById(id);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });
};