const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
require('dotenv').config();

const router = express.Router();
router.use(express.json()); // ✅ Middleware para JSON

// ✅ Registro de Usuarios
router.post('/register', async (req, res) => {
    const { first_name, last_name, email, password } = req.body;

    try {
        // Verifica si el usuario ya existe
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Encriptar la contraseña antes de guardarla
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ first_name, last_name, email, password_hash: hashedPassword });

        res.status(201).json({ message: 'Usuario registrado exitosamente', userId: user.id });
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
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

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

module.exports = router;
