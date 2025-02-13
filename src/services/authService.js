const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/user');
require('dotenv').config();

const router = express.Router();
router.use(express.json());

// ✅ Registro de Usuarios y sincronización con `UserService`
router.post('/register', async (req, res) => {
    const { first_name, last_name, identification_number, email, password, phone_number } = req.body;

    try {
        console.log("📌 Recibida solicitud de registro con datos:", req.body);

        // Verificar si el usuario ya existe en AuthService
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            console.log(`⚠️ El usuario con email ${email} ya está registrado en AuthService.`);
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Encriptar la contraseña
        console.log("🔒 Hasheando la contraseña...");
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear el usuario en AuthService
        const newUser = await User.create({ 
            first_name, 
            last_name, 
            identification_number, 
            email, 
            password_hash: hashedPassword, 
            phone_number 
        });

        console.log(`✅ Usuario con ID ${newUser.id} registrado en AuthService`);

        // 🔄 Enviar el usuario a `UserService` para sincronización
        const instances = [
            'http://127.0.0.1:5005/sync-create' ,// Microservicio de `UserService`
            
        ];
        console.log("📌 Enviando solicitud de sincronización a UserService...");
        for (const instance of instances) {
            try {
                console.log(`📤 Enviando datos a ${instance} con:`, {
                    id: newUser.id,
                    first_name,
                    last_name,
                    identification_number,
                    email,
                    password_hash: hashedPassword,
                    phone_number
                });
        
                const response = await axios.post(instance, {
                    id: newUser.id,
                    first_name,
                    last_name,
                    identification_number,
                    email,
                    password_hash: hashedPassword, // ✅ Enviamos la contraseña encriptada
                    phone_number
                });
        
                console.log(`✅ Usuario sincronizado correctamente con ${instance}:`, response.data);
            } catch (error) {
                console.error(`❌ Error sincronizando con ${instance}:`, error.response?.data || error.message);
            }
        }
        console.log("✅ Proceso de sincronización finalizado.");
        

        console.log("✅ Registro y sincronización completados.");
        res.status(201).json({ message: 'Usuario registrado exitosamente', userId: newUser.id });

    } catch (error) {
        console.error('❌ Error en registro:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

module.exports = router;
