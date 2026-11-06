// Divide um valor em parcelas sem perder centavos.
// A diferença de arredondamento vai para a primeira parcela.
function dividirEmParcelas(valorTotal, quantidade) {
  const centavos = Math.round(valorTotal * 100);
  const base = Math.floor(centavos / quantidade);
  const resto = centavos - base * quantidade;
  return Array.from({ length: quantidade }, (_, i) => (base + (i === 0 ? resto : 0)) / 100);
}

module.exports = { dividirEmParcelas };

// dividirEmParcelas(100, 3) → [33.34, 33.33, 33.33]
