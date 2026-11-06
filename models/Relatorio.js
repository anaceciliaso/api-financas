// Consultas de agregação dos relatórios. Os totais são calculados pelo MySQL (SUM / GROUP BY).
const pool = require('../database/connection');

class Relatorio {
  // RF7 — total por categoria, de um tipo, num período
  async totaisPorCategoria(usuarioId, tipo, inicio, fim) {
    const [linhas] = await pool.query(
      `SELECT c.id, c.nome, SUM(l.valor) AS total
         FROM lancamentos l
         JOIN categorias  c ON c.id = l.categoria_id
        WHERE l.usuario_id = ?
          AND l.tipo = ?
          AND l.data BETWEEN ? AND ?
        GROUP BY c.id, c.nome
        ORDER BY total DESC`,
      [usuarioId, tipo, inicio, fim],
    );
    return linhas.map((l) => ({ id: l.id, nome: l.nome, total: Number(l.total) }));
  }

  // RF8 — entradas e saídas de cada fonte/destino (LEFT JOIN: aparecem também as sem movimento)
  async totaisPorFonteDestino(usuarioId, inicio, fim) {
    const [linhas] = await pool.query(
      `SELECT f.id, f.nome, f.tipo,
              COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor END), 0) AS entradas,
              COALESCE(SUM(CASE WHEN l.tipo = 'saida'   THEN l.valor END), 0) AS saidas
         FROM fontes_destinos f
         LEFT JOIN lancamentos l
                ON l.fonte_destino_id = f.id
               AND l.usuario_id = f.usuario_id
               AND l.data BETWEEN ? AND ?
        WHERE f.usuario_id = ?
        GROUP BY f.id, f.nome, f.tipo
        ORDER BY f.nome`,
      [inicio, fim, usuarioId],
    );
    return linhas.map((l) => ({ ...l, entradas: Number(l.entradas), saidas: Number(l.saidas) }));
  }

  // RF9 — cartões do usuário
  async cartoes(usuarioId) {
    const [linhas] = await pool.query(
      `SELECT id, nome, dia_fechamento, dia_vencimento, limite
         FROM fontes_destinos
        WHERE usuario_id = ? AND tipo = 'cartao_credito'
        ORDER BY nome`,
      [usuarioId],
    );
    return linhas;
  }

  // RF9 / desafio — saídas feitas em cartões a partir de uma data
  async lancamentosDeCartao(usuarioId, desde) {
    const [linhas] = await pool.query(
      `SELECT l.id, l.fonte_destino_id, l.descricao, l.valor, l.data,
              l.parcela_atual, l.total_parcelas,
              c.id AS categoria_id, c.nome AS categoria_nome, c.classe
         FROM lancamentos l
         JOIN fontes_destinos f ON f.id = l.fonte_destino_id
         JOIN categorias      c ON c.id = l.categoria_id
        WHERE l.usuario_id = ?
          AND l.tipo = 'saida'
          AND f.tipo = 'cartao_credito'
          AND l.data >= ?
        ORDER BY l.data, l.id`,
      [usuarioId, desde],
    );
    return linhas;
  }

  // Desafio — entradas por mês
  async entradasPorMes(usuarioId, inicio, fim) {
    const [linhas] = await pool.query(
      `SELECT DATE_FORMAT(data, '%Y-%m') AS mes, SUM(valor) AS total
         FROM lancamentos
        WHERE usuario_id = ? AND tipo = 'entrada' AND data BETWEEN ? AND ?
        GROUP BY mes`,
      [usuarioId, inicio, fim],
    );
    return linhas.map((l) => ({ mes: l.mes, total: Number(l.total) }));
  }

  // Desafio — saídas À VISTA (1 parcela) por mês e categoria
  async saidasAVistaPorCategoriaMes(usuarioId, inicio, fim) {
    const [linhas] = await pool.query(
      `SELECT DATE_FORMAT(l.data, '%Y-%m') AS mes,
              c.id AS categoria_id, c.nome AS categoria_nome, c.classe,
              SUM(l.valor) AS total
         FROM lancamentos l
         JOIN categorias c ON c.id = l.categoria_id
        WHERE l.usuario_id = ? AND l.tipo = 'saida' AND l.total_parcelas = 1
          AND l.data BETWEEN ? AND ?
        GROUP BY mes, c.id, c.nome, c.classe`,
      [usuarioId, inicio, fim],
    );
    return linhas.map((l) => ({ ...l, total: Number(l.total) }));
  }

  // Desafio — saldo (entradas − saídas, desde sempre) das contas marcadas como reserva
  async saldoReservas(usuarioId) {
    const [linhas] = await pool.query(
      `SELECT f.id, f.nome,
              COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor ELSE -l.valor END), 0) AS saldo
         FROM fontes_destinos f
         LEFT JOIN lancamentos l ON l.fonte_destino_id = f.id AND l.usuario_id = f.usuario_id
        WHERE f.usuario_id = ? AND f.reserva = TRUE
        GROUP BY f.id, f.nome`,
      [usuarioId],
    );
    return linhas.map((l) => ({ ...l, saldo: Number(l.saldo) }));
  }
}

module.exports = new Relatorio();
