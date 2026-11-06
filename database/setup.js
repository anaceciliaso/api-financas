// Recria o banco executando schema.sql e seed.sql (funciona em Windows, Linux e macOS,
// sem precisar do cliente "mysql" na linha de comando).
//
//   npm run db:reset      → schema.sql + seed.sql
//   npm run db:schema     → só schema.sql (banco vazio)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function executar() {
  const semSeed = process.argv.includes('--sem-seed');
  const arquivos = semSeed ? ['schema.sql'] : ['schema.sql', 'seed.sql'];

  // Conecta sem "database", porque o schema.sql é que cria o banco
  const conexao = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    for (const arquivo of arquivos) {
      const sql = fs.readFileSync(path.join(__dirname, arquivo), 'utf8');
      await conexao.query(sql);
      console.log(`✔ ${arquivo} executado`);
    }
    console.log('Banco pronto.');
  } finally {
    await conexao.end();
  }
}

executar().catch((erro) => {
  console.error('Falha ao preparar o banco:', erro.sqlMessage || erro.message);
  process.exit(1);
});
