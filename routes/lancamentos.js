// RF6 — CRUD de lançamentos (com parcelamento no cartão)
const express = require('express');
const crypto = require('crypto');
const Lancamento = require('../models/Lancamento');
const Categoria = require('../models/Categoria');
const FonteDestino = require('../models/FonteDestino');
const { ErroApi, verificarErros } = require('../utils/erros');
const { textoPreenchido, idValido, inteiroEntre, valorValido, lerId, lerPeriodo } = require('../utils/validacao');
const { dataValida, hoje, inicioDoMes, fimDoMes } = require('../utils/datas');
const { dividirEmParcelas } = require('../utils/parcelas');
const { dinheiro } = require('../utils/dinheiro');

const router = express.Router();
const TIPOS = ['entrada', 'saida'];
const POR_PAGINA = 20;

// 1ª etapa: formato dos campos (não consulta o banco)
function validarCampos(body) {
  const { tipo, descricao, valor, data, categoriaId, fonteDestinoId } = body ?? {};
  const erros = {};
  if (!TIPOS.includes(tipo)) erros.tipo = "O tipo deve ser 'entrada' ou 'saida'.";
  if (!textoPreenchido(descricao)) erros.descricao = 'Informe a descrição.';
  else if (descricao.trim().length > 120) erros.descricao = 'A descrição deve ter no máximo 120 caracteres.';
  if (!valorValido(valor)) erros.valor = 'O valor deve ser um número maior que zero, com até 2 casas decimais.';
  if (!dataValida(data)) erros.data = 'Informe uma data válida no formato AAAA-MM-DD.';
  if (!idValido(categoriaId)) erros.categoriaId = 'Informe o id da categoria.';
  if (!idValido(fonteDestinoId)) erros.fonteDestinoId = 'Informe o id da fonte/destino.';
  verificarErros(erros);
  return {
    tipo,
    descricao: descricao.trim(),
    valor: Number(valor),
    data,
    categoriaId: Number(categoriaId),
    fonteDestinoId: Number(fonteDestinoId),
  };
}

// 2ª etapa: a categoria e a fonte/destino existem, são DO USUÁRIO e combinam com o tipo?
async function validarVinculos(dados, usuarioId) {
  const categoria = await Categoria.buscar(dados.categoriaId, usuarioId);
  if (!categoria) throw new ErroApi(404, 'Categoria não encontrada.', { categoriaId: 'Categoria inexistente.' });

  const fonte = await FonteDestino.buscar(dados.fonteDestinoId, usuarioId);
  if (!fonte) throw new ErroApi(404, 'Fonte/destino não encontrada.', { fonteDestinoId: 'Fonte/destino inexistente.' });

  if (categoria.tipo !== dados.tipo) {
    const nomeTipo = (t) => (t === 'entrada' ? 'entrada' : 'saída');
    throw new ErroApi(400, 'Dados inválidos.', {
      categoriaId: `A categoria informada é de ${nomeTipo(categoria.tipo)}, mas o lançamento é de ${nomeTipo(dados.tipo)}.`,
    });
  }
  return { categoria, fonte };
}

// GET /lancamentos?inicio=&fim=&tipo=&categoriaId=&fonteDestinoId=&pagina=
router.get('/', async (req, res) => {
  const mesAtual = hoje().slice(0, 7);
  const periodo = lerPeriodo(req.query, { obrigatorio: false, padrao: { inicio: inicioDoMes(mesAtual), fim: fimDoMes(mesAtual) } });

  const { tipo, categoriaId, fonteDestinoId, pagina = '1' } = req.query;
  const erros = {};
  if (tipo !== undefined && !TIPOS.includes(tipo)) erros.tipo = "O tipo deve ser 'entrada' ou 'saida'.";
  if (categoriaId !== undefined && !idValido(categoriaId)) erros.categoriaId = 'Id de categoria inválido.';
  if (fonteDestinoId !== undefined && !idValido(fonteDestinoId)) erros.fonteDestinoId = 'Id de fonte/destino inválido.';
  if (!idValido(pagina)) erros.pagina = 'A página deve ser um número inteiro a partir de 1.';
  verificarErros(erros);

  const filtros = { ...periodo, tipo, categoriaId, fonteDestinoId };
  const numeroPagina = Number(pagina);

  const resumo = await Lancamento.resumir(req.auth.id, filtros);
  const itens = await Lancamento.listar(req.auth.id, filtros, {
    limite: POR_PAGINA,
    deslocamento: (numeroPagina - 1) * POR_PAGINA,
  });

  res.json({
    periodo,
    resumo: {
      entradas: resumo.entradas,
      saidas: resumo.saidas,
      saldo: dinheiro(resumo.entradas - resumo.saidas),
    },
    pagina: numeroPagina,
    totalPaginas: Math.ceil(resumo.quantidade / POR_PAGINA),
    totalItens: resumo.quantidade,
    itens,
  });
});

router.get('/:id', async (req, res) => {
  const lancamento = await Lancamento.buscar(lerId(req.params.id), req.auth.id);
  if (!lancamento) throw new ErroApi(404, 'Lançamento não encontrado.');
  res.json(lancamento);
});

router.post('/', async (req, res) => {
  const dados = validarCampos(req.body);
  const { parcelas = 1 } = req.body;

  if (!inteiroEntre(parcelas, 1, 48)) {
    throw new ErroApi(400, 'Dados inválidos.', { parcelas: 'O número de parcelas deve ser um inteiro de 1 a 48.' });
  }
  const quantidade = Number(parcelas);

  const { fonte } = await validarVinculos(dados, req.auth.id);

  if (quantidade > 1) {
    const erros = {};
    if (dados.tipo !== 'saida' || fonte.tipo !== 'cartao_credito') {
      erros.parcelas = 'Só é possível parcelar saídas feitas em cartão de crédito.';
    } else if (Math.round(dados.valor * 100) < quantidade) {
      erros.parcelas = 'Valor pequeno demais para esse número de parcelas (cada parcela precisa de ao menos R$ 0,01).';
    }
    verificarErros(erros);
  }

  // Uma linha por parcela: mesma data da compra, mesmo grupo, parcela_atual de 1 a N
  const grupoParcelamento = quantidade > 1 ? crypto.randomUUID() : null;
  const linhas = dividirEmParcelas(dados.valor, quantidade).map((valorParcela, i) => ({
    ...dados,
    valor: valorParcela,
    parcelaAtual: i + 1,
    totalParcelas: quantidade,
    grupoParcelamento,
  }));

  const ids = await Lancamento.criar(req.auth.id, linhas);
  const criados = await Lancamento.buscarVarios(ids, req.auth.id);

  if (quantidade === 1) return res.status(201).json(criados[0]);
  return res.status(201).json({
    grupoParcelamento,
    valorTotal: dados.valor,
    totalParcelas: quantidade,
    lancamentos: criados,
  });
});

// PUT altera UM lançamento (uma parcela). O número de parcelas não muda por aqui.
router.put('/:id', async (req, res) => {
  const id = lerId(req.params.id);
  const atual = await Lancamento.buscar(id, req.auth.id);
  if (!atual) throw new ErroApi(404, 'Lançamento não encontrado.');

  const dados = validarCampos(req.body);
  if (req.body.parcelas !== undefined) {
    throw new ErroApi(400, 'Dados inválidos.', {
      parcelas: 'Não é possível alterar o número de parcelas. Exclua a compra (todasParcelas=true) e lance novamente.',
    });
  }
  const { fonte } = await validarVinculos(dados, req.auth.id);

  const parcelado = atual.parcela !== '1/1';
  if (parcelado && (dados.tipo !== 'saida' || fonte.tipo !== 'cartao_credito')) {
    throw new ErroApi(400, 'Dados inválidos.', {
      fonteDestinoId: 'Uma parcela precisa continuar sendo uma saída em cartão de crédito.',
    });
  }

  await Lancamento.atualizar(id, req.auth.id, dados);
  res.status(200).json(await Lancamento.buscar(id, req.auth.id));
});

// DELETE /lancamentos/:id?todasParcelas=true
router.delete('/:id', async (req, res) => {
  const id = lerId(req.params.id);
  const lancamento = await Lancamento.buscar(id, req.auth.id);
  if (!lancamento) throw new ErroApi(404, 'Lançamento não encontrado.');

  if (req.query.todasParcelas === 'true' && lancamento.grupoParcelamento) {
    await Lancamento.excluirGrupo(lancamento.grupoParcelamento, req.auth.id);
  } else {
    await Lancamento.excluir(id, req.auth.id);
  }
  res.status(204).end();
});

module.exports = router;
