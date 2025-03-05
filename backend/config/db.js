const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Cambia por tu usuario de MySQL
    password: 'kali', // Cambia por tu contraseña de MySQL
    database: 'voting_system'
});

module.exports = connection;


