// RF5 — CRUD de fontes/destinos (renda, conta ou cartão de crédito)
const express = require('express');
const FonteDestino = require('../models/FonteDestino');
const { ErroApi, verificarErros } = require('../utils/erros');
const { textoPreenchido, inteiroEntre, valorValido, lerId } = require('../utils/validacao');

const router = express.Router();
const TIPOS = ['renda', 'conta', 'cartao_credito'];

function validar(body) {
  const { nome, tipo, diaFechamento, diaVencimento, limite, reserva } = body ?? {};
  const erros = {};
  if (!textoPreenchido(nome)) erros.nome = 'Informe o nome.';
  else if (nome.trim().length > 60) erros.nome = 'O nome deve ter no máximo 60 caracteres.';
  if (!TIPOS.includes(tipo)) erros.tipo = "O tipo deve ser 'renda', 'conta' ou 'cartao_credito'.";

  const cartao = tipo === 'cartao_credito';
  if (cartao) {
    if (!inteiroEntre(diaFechamento, 1, 31)) erros.diaFechamento = 'Para cartão, informe o dia de fechamento (1 a 31).';
    if (!inteiroEntre(diaVencimento, 1, 31)) erros.diaVencimento = 'Para cartão, informe o dia de vencimento (1 a 31).';
    if (!valorValido(limite)) erros.limite = 'Para cartão, informe um limite maior que zero.';
  }
  if (reserva !== undefined && typeof reserva !== 'boolean') erros.reserva = 'O campo reserva deve ser true ou false.';
  else if (reserva === true && tipo !== 'conta') erros.reserva = 'Só fontes/destinos do tipo conta podem ser reserva.';
  verificarErros(erros);

  return {
    nome: nome.trim(),
    tipo,
    diaFechamento: cartao ? Number(diaFechamento) : null,   // campos de cartão só valem para cartão
    diaVencimento: cartao ? Number(diaVencimento) : null,
    limite: cartao ? Number(limite) : null,
    reserva: reserva === true,
  };
}

const erroNomeRepetido = () =>
  new ErroApi(409, 'Fonte/destino já existe.', { nome: 'Você já tem uma fonte/destino com este nome.' });

router.get('/', async (req, res) => {
  const { tipo } = req.query;
  if (tipo !== undefined && !TIPOS.includes(tipo)) {
    throw new ErroApi(400, 'Dados inválidos.', { tipo: "O tipo deve ser 'renda', 'conta' ou 'cartao_credito'." });
  }
  res.json(await FonteDestino.listar(req.auth.id, tipo));
});

router.get('/:id', async (req, res) => {
  const fonte = await FonteDestino.buscar(lerId(req.params.id), req.auth.id);
  if (!fonte) throw new ErroApi(404, 'Fonte/destino não encontrada.');
  res.json(fonte);
});

router.post('/', async (req, res) => {
  const dados = validar(req.body);
  try {
    res.status(201).json(await FonteDestino.criar(req.auth.id, dados));
  } catch (erro) {
    if (erro.code === 'ER_DUP_ENTRY') throw erroNomeRepetido();
    throw erro;
  }
});

router.put('/:id', async (req, res) => {
  const id = lerId(req.params.id);
  const atual = await FonteDestino.buscar(id, req.auth.id);
  if (!atual) throw new ErroApi(404, 'Fonte/destino não encontrada.');

  const dados = validar(req.body);
  // Trocar o tipo (ex.: cartão → conta) mudaria o significado dos lançamentos já feitos
  if (dados.tipo !== atual.tipo && (await FonteDestino.contarLancamentos(id, req.auth.id)) > 0) {
    throw new ErroApi(409, 'Não é possível trocar o tipo de uma fonte/destino que já tem lançamentos.', {
      tipo: 'Existem lançamentos vinculados a esta fonte/destino.',
    });
  }
  try {
    await FonteDestino.atualizar(id, req.auth.id, dados);
  } catch (erro) {
    if (erro.code === 'ER_DUP_ENTRY') throw erroNomeRepetido();
    throw erro;
  }
  res.status(200).json(await FonteDestino.buscar(id, req.auth.id));
});

router.delete('/:id', async (req, res) => {
  const id = lerId(req.params.id);
  if (!(await FonteDestino.buscar(id, req.auth.id))) throw new ErroApi(404, 'Fonte/destino não encontrada.');

  const vinculados = await FonteDestino.contarLancamentos(id, req.auth.id);
  if (vinculados > 0) {
    throw new ErroApi(409, `Não é possível excluir: há ${vinculados} lançamento(s) nesta fonte/destino. Mova ou exclua os lançamentos antes.`);
  }
  try {
    await FonteDestino.excluir(id, req.auth.id);
  } catch (erro) {
    if (erro.code === 'ER_ROW_IS_REFERENCED_2') throw new ErroApi(409, 'Não é possível excluir: há lançamentos nesta fonte/destino.');
    throw erro;
  }
  res.status(204).end();
});

module.exports = router;
