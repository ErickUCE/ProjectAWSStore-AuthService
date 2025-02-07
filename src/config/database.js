require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST_AUTH,
    dialect: 'mysql',
    logging: false
});

sequelize.authenticate()
    .then(() => console.log('✅ Auth Database connected successfully!'))
    .catch(err => console.error('❌ Auth Database connection error:', err));

module.exports = sequelize;
