const pool = require('../database/connection');

// SELECT com os nomes da categoria e da fonte/destino (JOIN)
const SELECT_COMPLETO = `
  SELECT l.id, l.tipo, l.descricao, l.valor, l.data,
         l.parcela_atual, l.total_parcelas, l.grupo_parcelamento,
         c.id AS categoria_id, c.nome AS categoria_nome,
         f.id AS fonte_id, f.nome AS fonte_nome, f.tipo AS fonte_tipo
    FROM lancamentos l
    JOIN categorias c      ON c.id = l.categoria_id
    JOIN fontes_destinos f ON f.id = l.fonte_destino_id`;

// Linha do banco → JSON da API
const formatar = (l) => ({
  id: l.id,
  tipo: l.tipo,
  descricao: l.descricao,
  valor: Number(l.valor),                         // DECIMAL chega como texto
  data: l.data,
  categoria: { id: l.categoria_id, nome: l.categoria_nome },
  fonteDestino: { id: l.fonte_id, nome: l.fonte_nome, tipo: l.fonte_tipo },
  parcela: `${l.parcela_atual}/${l.total_parcelas}`,
  grupoParcelamento: l.grupo_parcelamento,
});

// Monta o WHERE da listagem a partir dos filtros (todos parametrizados com ?)
function montarFiltro(usuarioId, f) {
  const condicoes = ['l.usuario_id = ?', 'l.data BETWEEN ? AND ?'];
  const params = [usuarioId, f.inicio, f.fim];
  if (f.tipo) { condicoes.push('l.tipo = ?'); params.push(f.tipo); }
  if (f.categoriaId) { condicoes.push('l.categoria_id = ?'); params.push(f.categoriaId); }
  if (f.fonteDestinoId) { condicoes.push('l.fonte_destino_id = ?'); params.push(f.fonteDestinoId); }
  return { where: `WHERE ${condicoes.join(' AND ')}`, params };
}

class Lancamento {
  async listar(usuarioId, filtros, { limite, deslocamento }) {
    const { where, params } = montarFiltro(usuarioId, filtros);
    const [linhas] = await pool.query(
      `${SELECT_COMPLETO} ${where} ORDER BY l.data DESC, l.id DESC LIMIT ? OFFSET ?`,
      [...params, limite, deslocamento],
    );
    return linhas.map(formatar);
  }

  // Quantidade de itens + totais do período filtrado (para paginação e resumo)
  async resumir(usuarioId, filtros) {
    const { where, params } = montarFiltro(usuarioId, filtros);
    const [linhas] = await pool.query(
      `SELECT COUNT(*) AS quantidade,
              COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor END), 0) AS entradas,
              COALESCE(SUM(CASE WHEN l.tipo = 'saida'   THEN l.valor END), 0) AS saidas
         FROM lancamentos l ${where}`,
      params,
    );
    const r = linhas[0];
    return { quantidade: Number(r.quantidade), entradas: Number(r.entradas), saidas: Number(r.saidas) };
  }

  async buscar(id, usuarioId) {
    const [linhas] = await pool.query(`${SELECT_COMPLETO} WHERE l.id = ? AND l.usuario_id = ?`, [id, usuarioId]);
    return linhas[0] ? formatar(linhas[0]) : null;
  }

  async buscarVarios(ids, usuarioId) {
    const [linhas] = await pool.query(
      `${SELECT_COMPLETO} WHERE l.id IN (?) AND l.usuario_id = ? ORDER BY l.parcela_atual`,
      [ids, usuarioId],
    );
    return linhas.map(formatar);
  }

  // Grava um lançamento ou TODAS as parcelas de uma compra numa transação:
  // ou entram todas, ou nenhuma.
  async criar(usuarioId, parcelas) {
    const conexao = await pool.getConnection();
    try {
      await conexao.beginTransaction();
      const ids = [];
      for (const p of parcelas) {
        const [resultado] = await conexao.query(
          `INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id,
                                    parcela_atual, total_parcelas, grupo_parcelamento)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [usuarioId, p.tipo, p.descricao, p.valor, p.data, p.categoriaId, p.fonteDestinoId,
            p.parcelaAtual, p.totalParcelas, p.grupoParcelamento],
        );
        ids.push(resultado.insertId);
      }
      await conexao.commit();
      return ids;
    } catch (erro) {
      await conexao.rollback();
      throw erro;
    } finally {
      conexao.release();
    }
  }

  async atualizar(id, usuarioId, d) {
    const [resultado] = await pool.query(
      `UPDATE lancamentos
          SET tipo = ?, descricao = ?, valor = ?, data = ?, categoria_id = ?, fonte_destino_id = ?
        WHERE id = ? AND usuario_id = ?`,
      [d.tipo, d.descricao, d.valor, d.data, d.categoriaId, d.fonteDestinoId, id, usuarioId],
    );
    return resultado.affectedRows;
  }

  async excluir(id, usuarioId) {
    const [resultado] = await pool.query('DELETE FROM lancamentos WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
    return resultado.affectedRows;
  }

  async excluirGrupo(grupo, usuarioId) {
    const [resultado] = await pool.query(
      'DELETE FROM lancamentos WHERE grupo_parcelamento = ? AND usuario_id = ?',
      [grupo, usuarioId],
    );
    return resultado.affectedRows;
  }
}

module.exports = new Lancamento();
