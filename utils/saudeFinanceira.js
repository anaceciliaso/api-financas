// Desafio — Saúde financeira.
// Funções puras: recebem os dados já buscados no banco e devolvem indicadores, projeção e dicas.
//
// Decisão importante ("competência ajustada"):
//   - lançamentos à vista contam no mês da DATA;
//   - compras PARCELADAS contam cada parcela no mês de VENCIMENTO da fatura em que ela cai.
// Assim, um notebook de R$ 3.000 em 10× não "estoura" o mês da compra: pesa R$ 300 por mês.
const { calcularFatura } = require('./faturas');
const { somarMeses, nomeDoMes } = require('./datas');
const { somar, dinheiro, reais } = require('./dinheiro');

// Limites usados para gerar as dicas (documentados no README)
const LIMITES = {
  taxaPoupancaMinima: 0.10,          // guardar ao menos 10% da renda
  comprometimentoCartoesMaximo: 0.30, // faturas dos próximos 3 meses ≤ 30% da renda do período
  necessidadesMaximo: 0.50,          // regra 50/30/20
  desejosMaximo: 0.30,
  poupancaMinima: 0.20,
  foraDaCurva: 0.20,                 // gasto do mês 20% acima da média → alerta...
  foraDaCurvaMinimoReais: 50,        // ...e pelo menos R$ 50 acima (evita alertas por centavos)
  mesesDeReservaMinimo: 3,           // reserva de 3 a 6 meses de despesas
  mesesProjecao: 3,
};

const arred = (n, casas = 4) => Math.round(n * 10 ** casas) / 10 ** casas;
const pct = (n) => `${Math.round(n * 100)}%`;

function calcularSaudeFinanceira({ hojeISO, entradasMes, saidasAVista, lancamentosCartao, cartoes, reservas }) {
  const mesAtual = hojeISO.slice(0, 7);
  const ultimos3 = [-3, -2, -1].map((n) => somarMeses(mesAtual, n));   // meses completos analisados
  const futuros = Array.from({ length: LIMITES.mesesProjecao }, (_, i) => somarMeses(mesAtual, i));
  const dicas = [];

  // --- Parcelas de compras parceladas, posicionadas no mês de vencimento da fatura ----------
  const regraDoCartao = Object.fromEntries(
    cartoes.map((c) => [c.id, { diaFechamento: c.dia_fechamento, diaVencimento: c.dia_vencimento }]),
  );
  const comFatura = lancamentosCartao.map((l) => ({
    ...l,
    fatura: calcularFatura(l.data, regraDoCartao[l.fonte_destino_id], l.parcela_atual),
  }));
  const parcelados = comFatura.filter((l) => l.total_parcelas > 1);

  // --- Gastos por mês e categoria (competência ajustada) ------------------------------------
  const gastos = [
    ...saidasAVista.map((s) => ({ mes: s.mes, categoriaId: s.categoria_id, nome: s.categoria_nome, classe: s.classe, valor: s.total })),
    ...parcelados.map((p) => ({ mes: p.fatura.referencia, categoriaId: p.categoria_id, nome: p.categoria_nome, classe: p.classe, valor: p.valor })),
  ];
  const saidasDoMes = (mes) => somar(gastos.filter((g) => g.mes === mes).map((g) => g.valor));
  const entradasDoMes = (mes) => somar(entradasMes.filter((e) => e.mes === mes).map((e) => e.total));

  const historico = ultimos3.map((mes) => {
    const entradas = entradasDoMes(mes);
    const saidas = saidasDoMes(mes);
    return { mes, entradas, saidas, saldo: dinheiro(entradas - saidas), taxaPoupanca: entradas > 0 ? arred((entradas - saidas) / entradas) : null };
  });

  const mesesComDados = historico.filter((h) => h.entradas > 0 || h.saidas > 0).length;
  const aviso = 'Informações educativas; não constituem recomendação financeira profissional.';

  if (mesesComDados === 0) {
    return {
      aviso,
      referencia: { hoje: hojeISO, mesesAnalisados: ultimos3 },
      indicadores: {},
      projecao: [],
      dicas: ['Ainda não há lançamentos nos últimos 3 meses completos. Registre suas entradas e saídas para receber uma análise.'],
      criterios: LIMITES,
    };
  }

  const totalEntradas = somar(historico.map((h) => h.entradas));
  const totalSaidas = somar(historico.map((h) => h.saidas));
  const rendaMedia = totalEntradas / mesesComDados;
  const saidaMedia = totalSaidas / mesesComDados;

  // 1) Taxa de poupança ------------------------------------------------------------------------
  const ultimoMes = historico[historico.length - 1];
  const taxaPoupanca = ultimoMes.taxaPoupanca;
  const taxaPoupancaMedia = totalEntradas > 0 ? arred((totalEntradas - totalSaidas) / totalEntradas) : null;
  if (taxaPoupanca !== null && taxaPoupanca < 0) {
    dicas.push(`Em ${nomeDoMes(ultimoMes.mes)} você gastou ${reais(-ultimoMes.saldo)} a mais do que recebeu.`);
  } else if (taxaPoupanca !== null && taxaPoupanca < LIMITES.taxaPoupancaMinima) {
    dicas.push(`Você guardou ${pct(taxaPoupanca)} da sua renda em ${nomeDoMes(ultimoMes.mes)}. Uma meta comum é guardar pelo menos 10%.`);
  }

  // 2) Comprometimento com cartões (todas as compras no cartão que vencem nos próximos 3 meses)
  const totalFaturasFuturas = somar(
    comFatura.filter((l) => futuros.includes(l.fatura.referencia) && l.fatura.vencimento >= hojeISO).map((l) => l.valor),
  );
  const comprometimentoCartoes = rendaMedia > 0 ? arred(totalFaturasFuturas / (rendaMedia * futuros.length)) : null;
  if (comprometimentoCartoes !== null && comprometimentoCartoes > LIMITES.comprometimentoCartoesMaximo) {
    dicas.push(`Suas faturas dos próximos ${futuros.length} meses comprometem ${pct(comprometimentoCartoes)} da sua renda.`);
  }

  // 3) Parcelas futuras (ainda a vencer) ------------------------------------------------------
  const aVencer = parcelados.filter((p) => p.fatura.vencimento >= hojeISO);
  const parcelasPorMes = Object.entries(
    aVencer.reduce((acc, p) => {
      acc[p.fatura.referencia] = (acc[p.fatura.referencia] || 0) + Math.round(Number(p.valor) * 100);
      return acc;
    }, {}),
  ).map(([mes, centavos]) => ({ mes, total: centavos / 100 })).sort((a, b) => a.mes.localeCompare(b.mes));
  const totalParcelasFuturas = somar(aVencer.map((p) => p.valor));
  if (parcelasPorMes.length > 0) {
    const ultimo = parcelasPorMes[parcelasPorMes.length - 1].mes;
    dicas.push(`Você tem ${reais(totalParcelasFuturas)} em parcelas até ${nomeDoMes(ultimo)}.`);
  }

  // 4) Regra 50/30/20 (últimos 3 meses) ---------------------------------------------------------
  const noPeriodo = gastos.filter((g) => ultimos3.includes(g.mes));
  const necessidades = somar(noPeriodo.filter((g) => g.classe === 'necessidade').map((g) => g.valor));
  const desejos = somar(noPeriodo.filter((g) => g.classe !== 'necessidade').map((g) => g.valor));
  const regra503020 = totalEntradas > 0 ? {
    necessidades: arred(necessidades / totalEntradas),
    desejos: arred(desejos / totalEntradas),
    poupanca: arred((totalEntradas - totalSaidas) / totalEntradas),
    referencia: { necessidades: 0.5, desejos: 0.3, poupanca: 0.2 },
  } : null;
  if (regra503020) {
    if (regra503020.necessidades > LIMITES.necessidadesMaximo) {
      dicas.push(`Os gastos com necessidades estão em ${pct(regra503020.necessidades)} da renda (referência: 50%).`);
    }
    if (regra503020.desejos > LIMITES.desejosMaximo) {
      dicas.push(`Os gastos com desejos estão em ${pct(regra503020.desejos)} da renda (referência: 30%).`);
    }
  }

  // 5) Projeção de saldo: renda média − (gastos à vista médios + parcelas já conhecidas) -------
  const aVistaMedia = somar(saidasAVista.filter((s) => ultimos3.includes(s.mes)).map((s) => s.total)) / mesesComDados;
  let acumulado = 0;
  const projecao = futuros.map((mes) => {
    const parcelasConhecidas = parcelasPorMes.find((p) => p.mes === mes)?.total || 0;
    const entradas = dinheiro(rendaMedia);
    const saidas = dinheiro(aVistaMedia + parcelasConhecidas);
    const saldoPrevisto = dinheiro(entradas - saidas);
    acumulado = dinheiro(acumulado + saldoPrevisto);
    return { mes, entradas, saidas, parcelasConhecidas: dinheiro(parcelasConhecidas), saldoPrevisto, saldoAcumulado: acumulado };
  });
  projecao.filter((p) => p.saldoPrevisto < 0).forEach((p) => {
    dicas.push(`Seu saldo previsto para ${nomeDoMes(p.mes)} é negativo (${reais(p.saldoPrevisto)}): revise as compras parceladas.`);
  });

  // 6) Categorias fora da curva: mês atual × média dos 3 meses anteriores ---------------------
  const categorias = [...new Map(gastos.map((g) => [g.categoriaId, g.nome])).entries()];
  const foraDaCurva = categorias.map(([categoriaId, nome]) => {
    const daCategoria = gastos.filter((g) => g.categoriaId === categoriaId);
    const atual = somar(daCategoria.filter((g) => g.mes === mesAtual).map((g) => g.valor));
    const media = dinheiro(somar(daCategoria.filter((g) => ultimos3.includes(g.mes)).map((g) => g.valor)) / mesesComDados);
    return { categoriaId, nome, mesAtual: atual, media, acimaDaMedia: media > 0 ? arred(atual / media - 1) : null };
  }).filter((c) => c.acimaDaMedia !== null && c.acimaDaMedia > LIMITES.foraDaCurva
    && c.mesAtual - c.media >= LIMITES.foraDaCurvaMinimoReais)
    .sort((a, b) => b.acimaDaMedia - a.acimaDaMedia);
  foraDaCurva.forEach((c) => {
    dicas.push(`Seus gastos com ${c.nome} estão ${pct(c.acimaDaMedia)} acima da sua média dos últimos 3 meses.`);
  });

  // 7) Reserva de emergência ---------------------------------------------------------------------
  const saldoReservas = somar(reservas.map((r) => r.saldo));
  const mesesDeReserva = reservas.length > 0 && saidaMedia > 0 ? Math.round((saldoReservas / saidaMedia) * 10) / 10 : null;
  if (reservas.length === 0) {
    dicas.push('Nenhuma conta está marcada como reserva de emergência. Use "reserva": true em uma fonte/destino do tipo conta.');
  } else if (mesesDeReserva !== null && mesesDeReserva < LIMITES.mesesDeReservaMinimo) {
    dicas.push(`Sua reserva cobre ${String(mesesDeReserva).replace('.', ',')} mês(es) de despesas. Uma referência comum é de 3 a 6 meses.`);
  }

  if (dicas.length === 0) dicas.push('Seus indicadores estão dentro das referências usadas. Continue assim!');

  return {
    aviso,
    referencia: { hoje: hojeISO, mesesAnalisados: ultimos3, mesesComDados },
    indicadores: {
      taxaPoupanca,
      taxaPoupancaMedia3Meses: taxaPoupancaMedia,
      comprometimentoCartoes,
      parcelasFuturas: { total: totalParcelasFuturas, porMes: parcelasPorMes },
      regra503020,
      mesesDeReserva,
      saldoReservas,
      rendaMediaMensal: dinheiro(rendaMedia),
      gastoMedioMensal: dinheiro(saidaMedia),
    },
    historico,
    projecao,
    foraDaCurva,
    dicas,
    criterios: LIMITES,
  };
}

module.exports = { calcularSaudeFinanceira, LIMITES };
