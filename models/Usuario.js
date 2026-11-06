const pool = require('../database/connection');

// [nome, tipo, classe] — classe é usada na regra 50/30/20 (só para saídas)
const CATEGORIAS_PADRAO = [
  ['Salário', 'entrada', null], ['Outras entradas', 'entrada', null],
  ['Alimentação', 'saida', 'necessidade'], ['Moradia', 'saida', 'necessidade'], ['Saúde', 'saida', 'necessidade'],
  ['Mobilidade', 'saida', 'necessidade'], ['Lazer', 'saida', 'desejo'], ['Educação', 'saida', 'necessidade'],
  ['Outras saídas', 'saida', 'desejo'],
];

class Usuario {
  // Cria o usuário + categorias padrão + "Conta corrente" numa ÚNICA transação.
  // Com pool, a transação precisa acontecer em uma conexão só (pool.getConnection).
  async cadastrar({ nome, email, cpf, senhaHash }) {
    const conexao = await pool.getConnection();
    try {
      await conexao.beginTransaction();

      const [resultado] = await conexao.query(
        'INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES (?, ?, ?, ?)',
        [nome, email, cpf, senhaHash],
      );
      const usuarioId = resultado.insertId;

      // INSERT de várias linhas: VALUES ? recebe um array de arrays
      const linhas = CATEGORIAS_PADRAO.map(([nomeCat, tipo, classe]) => [usuarioId, nomeCat, tipo, classe]);
      await conexao.query('INSERT INTO categorias (usuario_id, nome, tipo, classe) VALUES ?', [linhas]);

      await conexao.query(
        "INSERT INTO fontes_destinos (usuario_id, nome, tipo) VALUES (?, 'Conta corrente', 'conta')",
        [usuarioId],
      );

      await conexao.commit();
      return { id: usuarioId, nome, email };
    } catch (erro) {
      await conexao.rollback();       // qualquer falha desfaz tudo
      throw erro;
    } finally {
      conexao.release();              // devolve a conexão para o pool
    }
  }

  // Usado só no login: é o ÚNICO lugar que lê o senha_hash
  async buscarPorEmail(email) {
    const [linhas] = await pool.query(
      'SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ?',
      [email],
    );
    return linhas[0] || null;
  }

  async buscarPorId(id) {
    const [linhas] = await pool.query(
      'SELECT id, nome, email, cpf, criado_em AS criadoEm FROM usuarios WHERE id = ?',
      [id],
    );
    return linhas[0] || null;
  }
}

module.exports = new Usuario();
