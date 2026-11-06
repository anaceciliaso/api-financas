// Funções para lidar com dinheiro sem erros de ponto flutuante.
// Ideia: somar sempre em CENTAVOS (inteiros) e só no fim dividir por 100.

// "980.50" (texto vindo do mysql2) ou 980.5 → 980.5
const dinheiro = (valor) => Math.round(Number(valor || 0) * 100) / 100;

// Soma uma lista de valores (números ou textos) sem acumular erro
const somar = (valores) => valores.reduce((total, v) => total + Math.round(Number(v || 0) * 100), 0) / 100;

// Percentual com 2 casas: percentual(980.5, 3250) → 30.17
const percentual = (parte, total) => (Number(total) === 0 ? 0 : Math.round((parte / total) * 10000) / 100);

// Variação percentual: variacao(980.5, 870) → 12.7 ; sem base de comparação → null
const variacao = (atual, anterior) =>
  Number(anterior) === 0 ? null : Math.round(((atual - anterior) / anterior) * 10000) / 100;

// 1240 → "R$ 1.240,00"
const reais = (valor) => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

module.exports = { dinheiro, somar, percentual, variacao, reais };
