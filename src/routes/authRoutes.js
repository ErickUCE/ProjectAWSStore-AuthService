const express = require('express');
const axios = require('axios'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
require('dotenv').config();

const router = express.Router();
router.use(express.json()); // ✅ Middleware para JSON

// ✅ Registro de Usuarios con sincronización a `UserService`
router.post('/register', async (req, res) => {
    const { first_name, last_name, identification_number, email, password, phone_number } = req.body;

    try {
        // Verificar si el usuario ya existe en AuthService
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Encriptar la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ 
            first_name, 
            last_name, 
            identification_number, 
            email, 
            password_hash: hashedPassword, 
            phone_number 
        });

        console.log(`✅ Usuario con ID ${newUser.id} registrado en AuthService`);

        // 🔄 Sincronizar usuario con `UserService`
        const instances = [
            'http://localhost:5005/sync-create', // Microservicio de `UserService`
            'http://localhost:5006/sync-create',
            'http://localhost:5007/sync-create',
            'http://localhost:5008/sync-create'
        ];

        for (const instance of instances) {
            try {
                await axios.post(instance, {
                    id: newUser.id,
                    first_name,
                    last_name,
                    identification_number,
                    email,
                    password_hash: hashedPassword, // ✅ Enviamos la contraseña encriptada
                    phone_number
                });
                console.log(`✅ Usuario sincronizado con ${instance}`);
            } catch (error) {
                console.error(`❌ Error sincronizando con ${instance}:`, error.message);
            }
        }

        res.status(201).json({ message: 'Usuario registrado exitosamente', userId: newUser.id });
    } catch (error) {
        console.error('❌ Error en registro:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// ✅ Inicio de Sesión y Generación de Token JWT
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }

        // Verificar la contraseña
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }

        // ✅ Generar Token JWT con clave segura y tiempo de expiración
        const jwtSecret = process.env.JWT_SECRET || 'secretoPorDefecto';
        const token = jwt.sign(
            { id: user.id, email: user.email },
            jwtSecret,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
        );

        res.json({ token });
    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// ✅ Verificación de Token JWT
router.post('/verify-token', (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ valid: false, error: 'Token no proporcionado' });
    }

    try {
        const jwtSecret = process.env.JWT_SECRET || 'secretoPorDefecto';
        const decoded = jwt.verify(token, jwtSecret);
        res.json({ valid: true, user: decoded });
    } catch (error) {
        console.error('❌ Token inválido o expirado:', error.message);
        res.status(401).json({ valid: false, error: 'Token inválido o expirado' });
    }
});

// ✅ Endpoint para obtener los datos del usuario autenticado
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }

        const token = authHeader.split(' ')[1];
        const jwtSecret = process.env.JWT_SECRET || 'secretoPorDefecto';
        const decoded = jwt.verify(token, jwtSecret);

        const user = await User.findByPk(decoded.id, {
            attributes: { exclude: ['password_hash'] } // 🔒 No devolver la contraseña en la respuesta
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(user);
    } catch (error) {
        console.error('❌ Error obteniendo perfil:', error.message);
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
});

// ✅ Sincronizar Usuarios desde `UserService`
router.post('/sync-users-from-userservice', async (req, res) => {
    console.log('📌 Recibiendo solicitud de sincronización...');

    try {
        const response = await axios.get('http://localhost:5005/get-all-users'); // Llamando a `UserService`
        const users = response.data;

        for (const user of users) {
            const existingUser = await User.findOne({ where: { email: user.email } });

            if (!existingUser) {
                await User.create(user);
                console.log(`✅ Usuario ${user.email} sincronizado en AuthService`);
            } else {
                console.log(`⚠️ Usuario ${user.email} ya existe en AuthService`);
            }
        }

        res.status(200).json({ message: 'Usuarios sincronizados correctamente en AuthService' });
    } catch (error) {
        console.error('❌ Error sincronizando usuarios en AuthService:', error.message);
        res.status(500).json({ error: 'Failed to sync users' });
    }
});

module.exports = router;
