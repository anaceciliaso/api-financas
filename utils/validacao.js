// Validações reaproveitadas pelas rotas. Todas são funções puras.
const { dataValida } = require('./datas');
const { ErroApi, verificarErros } = require('./erros');

const textoPreenchido = (v) => typeof v === 'string' && v.trim() !== '';

// Aceita 3, "3" — rejeita 0, -1, 2.5, "abc", true
const idValido = (v) => /^\d+$/.test(String(v)) && Number(v) > 0 && Number(v) <= 2147483647;

// Inteiro dentro de um intervalo: inteiroEntre(10, 1, 31) → true
const inteiroEntre = (v, min, max) =>
  (typeof v === 'number' || typeof v === 'string') && /^-?\d+$/.test(String(v).trim())
  && Number(v) >= min && Number(v) <= max;

// Valor em dinheiro: número > 0, no máximo 2 casas decimais, cabe em DECIMAL(12,2)
function valorValido(v) {
  if (typeof v !== 'number' && !(typeof v === 'string' && v.trim() !== '')) return false;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 9999999999.99) return false;
  return Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
}

// Converte o :id da URL; id que não é número inteiro positivo → 400
function lerId(valor) {
  if (!idValido(valor)) {
    throw new ErroApi(400, 'Dados inválidos.', { id: 'O id deve ser um número inteiro positivo.' });
  }
  return Number(valor);
}

// Lê ?inicio=&fim= da query string.
// obrigatorio = true  → os dois precisam vir (relatórios)
// obrigatorio = false → usa os padrões informados (listagem)
function lerPeriodo(query, { obrigatorio, padrao } = {}) {
  const erros = {};
  let { inicio, fim } = query;

  if (!obrigatorio) {
    inicio = inicio ?? padrao.inicio;
    fim = fim ?? padrao.fim;
  }
  if (!dataValida(inicio)) erros.inicio = 'Informe uma data válida no formato AAAA-MM-DD.';
  if (!dataValida(fim)) erros.fim = 'Informe uma data válida no formato AAAA-MM-DD.';
  if (!erros.inicio && !erros.fim && inicio > fim) {
    erros.fim = 'A data final deve ser igual ou posterior à data inicial.';
  }
  verificarErros(erros);
  return { inicio, fim };
}

module.exports = { textoPreenchido, idValido, inteiroEntre, valorValido, lerId, lerPeriodo };
