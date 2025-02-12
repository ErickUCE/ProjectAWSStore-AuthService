const express = require('express');
const sequelize = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');



const app = express();
app.use(cors({
    origin: 'http://localhost:3000', // Permite solicitudes solo desde el frontend
    methods: 'GET,POST,PUT,DELETE',
    allowedHeaders: 'Content-Type,Authorization'
}));
app.use(express.json());
app.use(authRoutes);

sequelize.sync().then(() => {
    console.log('✅ Database synced successfully!');
    app.listen(5009, () => {
        console.log(`✅ Auth Server listening on port 5009`);
    });
}).catch(err => {
    console.error('❌ Error syncing database:', err);
});
