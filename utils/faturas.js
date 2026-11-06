// Cálculo de faturas de cartão de crédito.
// Datas em UTC para evitar problemas de fuso horário.
const { somar, dinheiro } = require('./dinheiro');

function ultimoDiaDoMes(ano, mes) {              // mes: 0 a 11
  return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
}

function dataSegura(ano, mes, dia) {             // aceita mes > 11 (ou < 0) e ajusta dia 31 em meses curtos
  const a = ano + Math.floor(mes / 12);
  const m = ((mes % 12) + 12) % 12;
  return new Date(Date.UTC(a, m, Math.min(dia, ultimoDiaDoMes(a, m))));
}

// Em qual fatura cai uma compra (ou uma parcela dela)?
// dataCompra: 'AAAA-MM-DD'; cartao: { diaFechamento, diaVencimento }
// numeroParcela: 1 = primeira parcela; k = (k - 1) meses depois
function calcularFatura(dataCompra, cartao, numeroParcela = 1) {
  const [ano, mes, dia] = dataCompra.split('-').map(Number);
  const m = mes - 1;
  const fechamentoDoMes = Math.min(cartao.diaFechamento, ultimoDiaDoMes(ano, m));

  let mesFechamento = dia < fechamentoDoMes ? m : m + 1;   // antes do fechamento: fatura deste mês
  mesFechamento += numeroParcela - 1;                       // parcelas seguintes: meses seguintes

  const fechamento = dataSegura(ano, mesFechamento, cartao.diaFechamento);
  const mesVencimento = cartao.diaVencimento > cartao.diaFechamento ? mesFechamento : mesFechamento + 1;
  const vencimento = dataSegura(ano, mesVencimento, cartao.diaVencimento);

  const iso = (d) => d.toISOString().slice(0, 10);
  return { referencia: iso(vencimento).slice(0, 7), fechamento: iso(fechamento), vencimento: iso(vencimento) };
}

// calcularFatura('2026-12-28', { diaFechamento: 25, diaVencimento: 5 })
// → { referencia: '2027-02', fechamento: '2027-01-25', vencimento: '2027-02-05' }

// "Notebook — 3/10" ou só "Mercado" quando é à vista
const rotuloParcela = (l) =>
  l.total_parcelas > 1 ? `${l.descricao} — ${l.parcela_atual}/${l.total_parcelas}` : l.descricao;

// Monta a previsão de faturas de UM cartão.
//   cartao: linha de fontes_destinos (id, nome, dia_fechamento, dia_vencimento, limite)
//   lancamentos: saídas desse cartão (data, valor, descricao, parcela_atual, total_parcelas, ...)
//   hojeISO: 'AAAA-MM-DD'
//   meses: quantas faturas devolver a partir da atual (aberta)
function montarFaturasDoCartao(cartao, lancamentos, hojeISO, meses) {
  const regra = { diaFechamento: cartao.dia_fechamento, diaVencimento: cartao.dia_vencimento };

  // 1) Descobre a fatura de cada lançamento
  const itens = lancamentos.map((l) => ({
    fatura: calcularFatura(l.data, regra, l.parcela_atual),
    item: {
      id: l.id,
      descricao: rotuloParcela(l),
      valor: dinheiro(l.valor),
      dataCompra: l.data,
      categoria: l.categoria_nome,
    },
  }));

  // 2) Agrupa por referência (AAAA-MM do vencimento) com reduce
  const porReferencia = itens.reduce((grupos, { fatura, item }) => {
    grupos[fatura.referencia] = grupos[fatura.referencia] || [];
    grupos[fatura.referencia].push(item);
    return grupos;
  }, {});

  const montar = (fatura, status) => {
    const lista = (porReferencia[fatura.referencia] || []).sort((a, b) => a.dataCompra.localeCompare(b.dataCompra));
    return { ...fatura, status, total: somar(lista.map((i) => i.valor)), itens: lista };
  };

  // 3) Fatura anterior: já fechou, mas ainda não venceu (aguardando pagamento)
  const faturas = [];
  const anterior = calcularFatura(hojeISO, regra, 0);
  if (anterior.vencimento >= hojeISO) faturas.push(montar(anterior, 'fechada'));

  // 4) Fatura atual (onde cairia uma compra feita hoje) e as próximas
  for (let i = 0; i < meses; i++) {
    faturas.push(montar(calcularFatura(hojeISO, regra, 1 + i), i === 0 ? 'aberta' : 'futura'));
  }

  // 5) Limite utilizado: tudo que está em faturas que ainda não venceram (inclui parcelas
  //    além do horizonte pedido em "meses")
  const utilizado = somar(itens.filter((i) => i.fatura.vencimento >= hojeISO).map((i) => i.item.valor));
  const limite = dinheiro(cartao.limite);

  return {
    id: cartao.id,
    nome: cartao.nome,
    diaFechamento: cartao.dia_fechamento,
    diaVencimento: cartao.dia_vencimento,
    limite: { total: limite, utilizado, disponivel: dinheiro(limite - utilizado) },
    faturas,
  };
}

module.exports = { calcularFatura, montarFaturasDoCartao, rotuloParcela };
