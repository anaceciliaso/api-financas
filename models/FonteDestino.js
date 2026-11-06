const pool = require('../database/connection');

const CAMPOS = `id, nome, tipo, dia_fechamento AS diaFechamento, dia_vencimento AS diaVencimento,
                limite, reserva`;

// O mysql2 devolve DECIMAL como texto e BOOLEAN como 0/1: converte para o JSON da API
const formatar = (linha) => linha && {
  ...linha,
  limite: linha.limite === null ? null : Number(linha.limite),
  reserva: Boolean(linha.reserva),
};

class FonteDestino {
  async listar(usuarioId, tipo) {
    let sql = `SELECT ${CAMPOS} FROM fontes_destinos WHERE usuario_id = ?`;
    const params = [usuarioId];
    if (tipo) {
      sql += ' AND tipo = ?';
      params.push(tipo);
    }
    sql += ' ORDER BY tipo, nome';
    const [linhas] = await pool.query(sql, params);
    return linhas.map(formatar);
  }

  async buscar(id, usuarioId) {
    const [linhas] = await pool.query(
      `SELECT ${CAMPOS} FROM fontes_destinos WHERE id = ? AND usuario_id = ?`,
      [id, usuarioId],
    );
    return formatar(linhas[0]) || null;
  }

  async criar(usuarioId, d) {
    const [resultado] = await pool.query(
      `INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite, reserva)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, d.nome, d.tipo, d.diaFechamento, d.diaVencimento, d.limite, d.reserva],
    );
    return this.buscar(resultado.insertId, usuarioId);
  }

  async atualizar(id, usuarioId, d) {
    const [resultado] = await pool.query(
      `UPDATE fontes_destinos
          SET nome = ?, tipo = ?, dia_fechamento = ?, dia_vencimento = ?, limite = ?, reserva = ?
        WHERE id = ? AND usuario_id = ?`,
      [d.nome, d.tipo, d.diaFechamento, d.diaVencimento, d.limite, d.reserva, id, usuarioId],
    );
    return resultado.affectedRows;
  }

  async excluir(id, usuarioId) {
    const [resultado] = await pool.query(
      'DELETE FROM fontes_destinos WHERE id = ? AND usuario_id = ?',
      [id, usuarioId],
    );
    return resultado.affectedRows;
  }

  async contarLancamentos(id, usuarioId) {
    const [linhas] = await pool.query(
      'SELECT COUNT(*) AS total FROM lancamentos WHERE fonte_destino_id = ? AND usuario_id = ?',
      [id, usuarioId],
    );
    return Number(linhas[0].total);
  }
}

module.exports = new FonteDestino();
