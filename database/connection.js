// Pool de conexões com o MySQL, usando a interface de promises do mysql2.
// As credenciais vêm do .env (carregado na primeira linha do server.js).
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  // Colunas DATE/DATETIME chegam como texto 'AAAA-MM-DD' (sem problemas de fuso horário)
  dateStrings: true,
});

module.exports = pool;
