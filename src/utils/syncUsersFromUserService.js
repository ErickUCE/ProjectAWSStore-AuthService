const axios = require('axios');
const User = require('../models/user');
const bcrypt = require('bcryptjs');

const syncUsersFromUserService = async () => {
    try {
        console.log('📌 Obteniendo usuarios de UserService...');

        // 🔄 Solicitar todos los usuarios de `UserService`
        const response = await axios.get('http://3.224.31.24:5005/get-all-users'); 

        if (!response.data || response.data.length === 0) {
            console.log('⚠️ No hay usuarios en UserService para sincronizar.');
            return;
        }

        const users = response.data;

        for (const user of users) {
            try {
                // Verificar si el usuario ya existe en `AuthService`
                const existingUser = await User.findOne({ where: { email: user.email } });
                if (existingUser) {
                    console.log(`⚠️ Usuario con email ${user.email} ya existe en AuthService.`);
                    continue; // Saltar si ya existe
                }

                // Encriptar la contraseña antes de guardarla en AuthService
                const hashedPassword = await bcrypt.hash(user.password_hash, 10);

                // Insertar usuario en `AuthService`
                await User.create({
                    id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    identification_number: user.identification_number,
                    email: user.email,
                    password_hash: hashedPassword,
                    phone_number: user.phone_number
                });

                console.log(`✅ Usuario con ID ${user.id} sincronizado en AuthService.`);
            } catch (error) {
                console.error(`❌ Error sincronizando usuario ID ${user.id}:`, error.message);
            }
        }

        console.log('✅ Todos los usuarios han sido sincronizados correctamente en AuthService.');
    } catch (error) {
        console.error('❌ Error obteniendo usuarios de UserService:', error);
    }
};

// Ejecutar la sincronización
syncUsersFromUserService();
