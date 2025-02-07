const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

// ✅ Generar un token JWT
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email },  
        process.env.JWT_SECRET,             
        { expiresIn: process.env.JWT_EXPIRES_IN } 
    );
};

// ✅ Encriptar la contraseña antes de guardarla en la base de datos
const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

// ✅ Comparar una contraseña encriptada con la ingresada por el usuario
const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

module.exports = { generateToken, hashPassword, comparePassword };
