// RF7, RF8 e RF9 — relatórios em JSON
const express = require('express');
const Relatorio = require('../models/Relatorio');
const { ErroApi } = require('../utils/erros');
const { lerPeriodo, inteiroEntre } = require('../utils/validacao');
const { periodoAnterior, hoje, somarMeses } = require('../utils/datas');
const { somar, percentual, variacao } = require('../utils/dinheiro');
const { montarFaturasDoCartao } = require('../utils/faturas');

const router = express.Router();

// Junta os totais do período atual e do anterior, categoria por categoria
function compararCategorias(atuais, anteriores) {
  const total = somar(atuais.map((c) => c.total));
  const mapaAnterior = new Map(anteriores.map((c) => [c.id, c]));

  const linhas = atuais.map((c) => {
    const anterior = mapaAnterior.get(c.id)?.total || 0;
    return { id: c.id, nome: c.nome, total: c.total, percentual: percentual(c.total, total), anterior, variacao: variacao(c.total, anterior) };
  });
  // Categorias que tinham valor no período anterior e zeraram agora também aparecem
  anteriores
    .filter((a) => !atuais.some((c) => c.id === a.id))
    .forEach((a) => linhas.push({ id: a.id, nome: a.nome, total: 0, percentual: 0, anterior: a.total, variacao: -100 }));

  return { total, totalAnterior: somar(anteriores.map((c) => c.total)), categorias: linhas };
}

// GET /relatorios/categorias?inicio=AAAA-MM-DD&fim=AAAA-MM-DD
router.get('/categorias', async (req, res) => {
  const periodo = lerPeriodo(req.query, { obrigatorio: true });
  const anterior = periodoAnterior(periodo.inicio, periodo.fim);
  const id = req.auth.id;

  const [saidas, saidasAnt, entradas, entradasAnt] = await Promise.all([
    Relatorio.totaisPorCategoria(id, 'saida', periodo.inicio, periodo.fim),
    Relatorio.totaisPorCategoria(id, 'saida', anterior.inicio, anterior.fim),
    Relatorio.totaisPorCategoria(id, 'entrada', periodo.inicio, periodo.fim),
    Relatorio.totaisPorCategoria(id, 'entrada', anterior.inicio, anterior.fim),
  ]);

  res.json({
    periodo,
    periodoAnterior: anterior,
    saidas: compararCategorias(saidas, saidasAnt),
    entradas: compararCategorias(entradas, entradasAnt),
  });
});

// GET /relatorios/fontes-destinos?inicio=AAAA-MM-DD&fim=AAAA-MM-DD
router.get('/fontes-destinos', async (req, res) => {
  const periodo = lerPeriodo(req.query, { obrigatorio: true });
  const linhas = await Relatorio.totaisPorFonteDestino(req.auth.id, periodo.inicio, periodo.fim);

  const fontes = linhas.filter((l) => l.entradas > 0)
    .map((l) => ({ id: l.id, nome: l.nome, tipo: l.tipo, total: l.entradas }))
    .sort((a, b) => b.total - a.total);
  const destinos = linhas.filter((l) => l.saidas > 0)
    .map((l) => ({ id: l.id, nome: l.nome, tipo: l.tipo, total: l.saidas }))
    .sort((a, b) => b.total - a.total);
  const contas = linhas.filter((l) => l.tipo === 'conta')
    .map((l) => ({ id: l.id, nome: l.nome, entradas: l.entradas, saidas: l.saidas, saldo: somar([l.entradas, -l.saidas]) }));

  res.json({
    periodo,
    entradas: { total: somar(fontes.map((f) => f.total)), fontes },
    saidas: { total: somar(destinos.map((d) => d.total)), destinos },
    contas,
  });
});

// GET /relatorios/faturas?meses=3
router.get('/faturas', async (req, res) => {
  const { meses = '3' } = req.query;
  if (!inteiroEntre(meses, 1, 12)) {
    throw new ErroApi(400, 'Dados inválidos.', { meses: 'O parâmetro meses deve ser um inteiro de 1 a 12.' });
  }
  const hojeISO = hoje();

  // Parcelas podem ir até 48 meses depois da compra: busca compras dos últimos ~4 anos
  const desde = `${somarMeses(hojeISO.slice(0, 7), -50)}-01`;
  const [cartoes, lancamentos] = await Promise.all([
    Relatorio.cartoes(req.auth.id),
    Relatorio.lancamentosDeCartao(req.auth.id, desde),
  ]);

  res.json({
    hoje: hojeISO,
    meses: Number(meses),
    cartoes: cartoes.map((cartao) =>
      montarFaturasDoCartao(cartao, lancamentos.filter((l) => l.fonte_destino_id === cartao.id), hojeISO, Number(meses))),
  });
});

module.exports = router;
