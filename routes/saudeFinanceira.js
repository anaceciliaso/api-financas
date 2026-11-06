// Desafio — GET /saude-financeira
const express = require('express');
const Relatorio = require('../models/Relatorio');
const { hoje, somarMeses, inicioDoMes, fimDoMes } = require('../utils/datas');
const { calcularSaudeFinanceira } = require('../utils/saudeFinanceira');

const router = express.Router();

router.get('/', async (req, res) => {
  const id = req.auth.id;
  const hojeISO = hoje();
  const mesAtual = hojeISO.slice(0, 7);
  const inicio = inicioDoMes(somarMeses(mesAtual, -3));   // 3 meses completos + mês atual
  const fim = fimDoMes(mesAtual);

  const [entradasMes, saidasAVista, lancamentosCartao, cartoes, reservas] = await Promise.all([
    Relatorio.entradasPorMes(id, inicio, fim),
    Relatorio.saidasAVistaPorCategoriaMes(id, inicio, fim),
    Relatorio.lancamentosDeCartao(id, `${somarMeses(mesAtual, -50)}-01`),
    Relatorio.cartoes(id),
    Relatorio.saldoReservas(id),
  ]);

  res.json(calcularSaudeFinanceira({ hojeISO, entradasMes, saidasAVista, lancamentosCartao, cartoes, reservas }));
});

module.exports = router;
