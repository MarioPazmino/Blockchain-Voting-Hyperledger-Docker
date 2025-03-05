const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const votingRoutes = require('./routes/votingRoutes');

const app = express();
const PORT = 3000;

// Conexión a MySQL
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Cambia por tu usuario de MySQL
    password: 'kali', // Cambia por tu contraseña de MySQL
    database: 'voting_system'
});

connection.connect((err) => {
    if (err) {
        console.error('Error conectando a MySQL:', err);
    } else {
        console.log('Conectado a MySQL');
    }
});

app.use(bodyParser.json());

app.use('/api/voting', votingRoutes);

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});