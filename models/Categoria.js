const pool = require('../database/connection');

const CAMPOS = 'id, nome, tipo, classe';

class Categoria {
  async listar(usuarioId, tipo) {
    let sql = `SELECT ${CAMPOS} FROM categorias WHERE usuario_id = ?`;
    const params = [usuarioId];
    if (tipo) {
      sql += ' AND tipo = ?';
      params.push(tipo);
    }
    sql += ' ORDER BY tipo, nome';
    const [linhas] = await pool.query(sql, params);
    return linhas;
  }

  // Sempre filtra pelo dono: categoria de outro usuário "não existe"
  async buscar(id, usuarioId) {
    const [linhas] = await pool.query(
      `SELECT ${CAMPOS} FROM categorias WHERE id = ? AND usuario_id = ?`,
      [id, usuarioId],
    );
    return linhas[0] || null;
  }

  async criar(usuarioId, { nome, tipo, classe }) {
    const [resultado] = await pool.query(
      'INSERT INTO categorias (usuario_id, nome, tipo, classe) VALUES (?, ?, ?, ?)',
      [usuarioId, nome, tipo, classe],
    );
    return { id: resultado.insertId, nome, tipo, classe };
  }

  async atualizar(id, usuarioId, { nome, tipo, classe }) {
    const [resultado] = await pool.query(
      'UPDATE categorias SET nome = ?, tipo = ?, classe = ? WHERE id = ? AND usuario_id = ?',
      [nome, tipo, classe, id, usuarioId],
    );
    return resultado.affectedRows;
  }

  async excluir(id, usuarioId) {
    const [resultado] = await pool.query(
      'DELETE FROM categorias WHERE id = ? AND usuario_id = ?',
      [id, usuarioId],
    );
    return resultado.affectedRows;
  }

  async contarLancamentos(id, usuarioId) {
    const [linhas] = await pool.query(
      'SELECT COUNT(*) AS total FROM lancamentos WHERE categoria_id = ? AND usuario_id = ?',
      [id, usuarioId],
    );
    return Number(linhas[0].total);
  }
}

module.exports = new Categoria();
