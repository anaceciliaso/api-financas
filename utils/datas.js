// Funções de data trabalhando SEMPRE com textos 'AAAA-MM-DD' e 'AAAA-MM'.
// Os cálculos internos usam UTC para não sofrer com fuso horário / horário de verão.

const iso = (d) => d.toISOString().slice(0, 10);

const paraUTC = (dataISO) => {
  const [a, m, d] = dataISO.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d));
};

// Data de hoje no fuso do servidor (variável TZ do .env)
function hoje() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// '2026-02-30' é inválida; '2026-02-28' é válida
function dataValida(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [a, m, d] = texto.split('-').map(Number);
  const data = new Date(Date.UTC(a, m - 1, d));
  return data.getUTCFullYear() === a && data.getUTCMonth() === m - 1 && data.getUTCDate() === d;
}

function somarDias(dataISO, dias) {
  const d = paraUTC(dataISO);
  d.setUTCDate(d.getUTCDate() + dias);
  return iso(d);
}

// Quantidade de dias entre duas datas, contando as duas pontas
const diasNoPeriodo = (inicio, fim) => Math.round((paraUTC(fim) - paraUTC(inicio)) / 86400000) + 1;

const ultimoDiaDoMes = (ano, mes) => new Date(Date.UTC(ano, mes, 0)).getUTCDate(); // mes: 1 a 12

// '2026-11' + (-1) → '2026-10'
function somarMeses(anoMes, meses) {
  const [a, m] = anoMes.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + meses, 1));
  return iso(d).slice(0, 7);
}

const inicioDoMes = (anoMes) => `${anoMes}-01`;
function fimDoMes(anoMes) {
  const [a, m] = anoMes.split('-').map(Number);
  return `${anoMes}-${String(ultimoDiaDoMes(a, m)).padStart(2, '0')}`;
}

// Período anterior de mesmo tamanho.
// Se o período é formado por meses inteiros (ex.: 01/10 a 31/10), compara com os meses
// inteiros anteriores (01/09 a 30/09). Caso contrário, usa a mesma quantidade de dias.
function periodoAnterior(inicio, fim) {
  const mesesInteiros = inicio.endsWith('-01') && fim === fimDoMes(fim.slice(0, 7));
  if (mesesInteiros) {
    const [a1, m1] = inicio.split('-').map(Number);
    const [a2, m2] = fim.split('-').map(Number);
    const qtdMeses = (a2 - a1) * 12 + (m2 - m1) + 1;
    const mesInicio = inicio.slice(0, 7);
    return {
      inicio: inicioDoMes(somarMeses(mesInicio, -qtdMeses)),
      fim: fimDoMes(somarMeses(mesInicio, -1)),
    };
  }
  const dias = diasNoPeriodo(inicio, fim);
  const fimAnterior = somarDias(inicio, -1);
  return { inicio: somarDias(fimAnterior, -(dias - 1)), fim: fimAnterior };
}

// '2026-10' → 'outubro de 2026'
function nomeDoMes(anoMes) {
  const [a, m] = anoMes.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

module.exports = {
  hoje, dataValida, somarDias, diasNoPeriodo, ultimoDiaDoMes,
  somarMeses, inicioDoMes, fimDoMes, periodoAnterior, nomeDoMes,
};
