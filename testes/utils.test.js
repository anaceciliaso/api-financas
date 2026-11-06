// Testes das funções puras (sem banco). Rode com:  node --test testes/
const test = require('node:test');
const assert = require('node:assert/strict');

const { cpfValido } = require('../utils/cpf');
const { dividirEmParcelas } = require('../utils/parcelas');
const { calcularFatura, montarFaturasDoCartao } = require('../utils/faturas');
const datas = require('../utils/datas');
const { valorValido, idValido, inteiroEntre } = require('../utils/validacao');
const { somar, percentual, variacao } = require('../utils/dinheiro');

test('CPF: dígitos verificadores', () => {
  assert.equal(cpfValido('529.982.247-25'), true);
  assert.equal(cpfValido('52998224725'), true);
  assert.equal(cpfValido('529.982.247-24'), false);
  assert.equal(cpfValido('111.111.111-11'), false);
  assert.equal(cpfValido('123'), false);
});

test('Parcelas: centavos não se perdem', () => {
  assert.deepEqual(dividirEmParcelas(100, 3), [33.34, 33.33, 33.33]);
  assert.equal(somar(dividirEmParcelas(100, 3)), 100);
  assert.deepEqual(dividirEmParcelas(3000, 10), Array(10).fill(300));
  assert.equal(somar(dividirEmParcelas(999.99, 7)), 999.99);
  assert.equal(somar(dividirEmParcelas(0.1 + 0.2, 2)), 0.3);
});

test('Faturas: exemplos da tabela do enunciado', () => {
  const nubank = { diaFechamento: 3, diaVencimento: 10 };
  const visa = { diaFechamento: 25, diaVencimento: 5 };
  assert.deepEqual(calcularFatura('2026-11-02', nubank, 1), { referencia: '2026-11', fechamento: '2026-11-03', vencimento: '2026-11-10' });
  assert.deepEqual(calcularFatura('2026-11-03', nubank, 1), { referencia: '2026-12', fechamento: '2026-12-03', vencimento: '2026-12-10' });
  assert.deepEqual(calcularFatura('2026-12-28', visa, 1), { referencia: '2027-02', fechamento: '2027-01-25', vencimento: '2027-02-05' });
  assert.deepEqual(calcularFatura('2026-12-20', visa, 3), { referencia: '2027-03', fechamento: '2027-02-25', vencimento: '2027-03-05' });
});

test('Faturas: dia 31 em meses curtos', () => {
  const cartao = { diaFechamento: 31, diaVencimento: 10 };
  assert.deepEqual(calcularFatura('2027-02-10', cartao, 1), { referencia: '2027-03', fechamento: '2027-02-28', vencimento: '2027-03-10' });
  assert.deepEqual(calcularFatura('2027-02-28', cartao, 1), { referencia: '2027-04', fechamento: '2027-03-31', vencimento: '2027-04-10' });
});

test('Faturas: montagem por cartão, status e limite', () => {
  const cartao = { id: 3, nome: 'Nubank', dia_fechamento: 3, dia_vencimento: 10, limite: '4000.00' };
  const lancs = [
    { id: 1, descricao: 'Mercado', valor: '250.00', data: '2026-11-02', parcela_atual: 1, total_parcelas: 1, categoria_nome: 'Alimentação' },
    { id: 2, descricao: 'Farmácia', valor: '89.90', data: '2026-11-03', parcela_atual: 1, total_parcelas: 1, categoria_nome: 'Saúde' },
    { id: 3, descricao: 'Velho', valor: '50.00', data: '2026-09-15', parcela_atual: 1, total_parcelas: 1, categoria_nome: 'Lazer' },
    ...[1, 2, 3].map((k) => ({ id: 10 + k, descricao: 'Fone', valor: k === 1 ? '33.34' : '33.33', data: '2026-10-28', parcela_atual: k, total_parcelas: 3, categoria_nome: 'Lazer' })),
  ];
  const r = montarFaturasDoCartao(cartao, lancs, '2026-11-06', 3);
  assert.deepEqual(r.faturas.map((f) => [f.referencia, f.status]), [['2026-11', 'fechada'], ['2026-12', 'aberta'], ['2027-01', 'futura'], ['2027-02', 'futura']]);
  assert.equal(r.faturas[0].total, 283.34);          // mercado + 1ª parcela do fone (28/10 → fecha 03/11)
  assert.equal(r.faturas[1].total, 123.23);        // compra no dia do fechamento + 2ª parcela
  assert.equal(r.faturas[1].itens[0].descricao, 'Fone — 2/3');
  assert.equal(r.limite.utilizado, 439.90);                // tudo menos a compra antiga (já vencida)
  assert.equal(r.limite.disponivel, 3560.10);
});

test('Datas: validação e período anterior', () => {
  assert.equal(datas.dataValida('2026-02-29'), false);
  assert.equal(datas.dataValida('2028-02-29'), true);
  assert.equal(datas.dataValida('2026-13-01'), false);
  assert.deepEqual(datas.periodoAnterior('2026-10-01', '2026-10-31'), { inicio: '2026-09-01', fim: '2026-09-30' });
  assert.deepEqual(datas.periodoAnterior('2026-03-01', '2026-03-31'), { inicio: '2026-02-01', fim: '2026-02-28' });
  assert.deepEqual(datas.periodoAnterior('2026-07-01', '2026-09-30'), { inicio: '2026-04-01', fim: '2026-06-30' });
  assert.deepEqual(datas.periodoAnterior('2026-10-10', '2026-10-19'), { inicio: '2026-09-30', fim: '2026-10-09' });
  assert.equal(datas.somarMeses('2026-01', -1), '2025-12');
  assert.equal(datas.nomeDoMes('2026-10'), 'outubro de 2026');
});

test('Validação de valores e ids', () => {
  assert.equal(valorValido(100), true);
  assert.equal(valorValido('33.33'), true);
  assert.equal(valorValido(0), false);
  assert.equal(valorValido(-5), false);
  assert.equal(valorValido(10.555), false);
  assert.equal(valorValido(true), false);
  assert.equal(valorValido(''), false);
  assert.equal(idValido('3'), true);
  assert.equal(idValido('3abc'), false);
  assert.equal(idValido(0), false);
  assert.equal(inteiroEntre(31, 1, 31), true);
  assert.equal(inteiroEntre(32, 1, 31), false);
  assert.equal(inteiroEntre(2.5, 1, 31), false);
});

test('Percentuais', () => {
  assert.equal(percentual(980.5, 3250), 30.17);
  assert.equal(variacao(980.5, 870), 12.7);
  assert.equal(variacao(769.5, 812.3), -5.27);
  assert.equal(variacao(10, 0), null);
});
