const express = require('express');
const sequelize = require('./config/database');
const authRoutes = require('./routes/authRoutes');

const app = express();
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
