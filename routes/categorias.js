// RF4 — CRUD de categorias. O usuário vem SEMPRE do token (req.auth.id).
const express = require('express');
const Categoria = require('../models/Categoria');
const { ErroApi, verificarErros } = require('../utils/erros');
const { textoPreenchido, lerId } = require('../utils/validacao');

const router = express.Router();
const TIPOS = ['entrada', 'saida'];
const CLASSES = ['necessidade', 'desejo'];

// Valida o corpo e devolve os dados normalizados.
// "classe" (necessidade/desejo) só existe para saídas; se não vier, usa o padrão informado.
function validar(body, classePadrao) {
  const { nome, tipo, classe } = body ?? {};
  const erros = {};
  if (!textoPreenchido(nome)) erros.nome = 'Informe o nome.';
  else if (nome.trim().length > 60) erros.nome = 'O nome deve ter no máximo 60 caracteres.';
  if (!TIPOS.includes(tipo)) erros.tipo = "O tipo deve ser 'entrada' ou 'saida'.";
  if (tipo === 'saida' && classe !== undefined && classe !== null && !CLASSES.includes(classe)) {
    erros.classe = "A classe deve ser 'necessidade' ou 'desejo'.";
  }
  if (tipo === 'entrada' && classe) erros.classe = 'Categorias de entrada não têm classe.';
  verificarErros(erros);

  return {
    nome: nome.trim(),
    tipo,
    classe: tipo === 'saida' ? (classe ?? classePadrao ?? 'desejo') : null,
  };
}

const erroNomeRepetido = () =>
  new ErroApi(409, 'Categoria já existe.', { nome: 'Você já tem uma categoria com este nome para este tipo.' });

router.get('/', async (req, res) => {
  const { tipo } = req.query;
  if (tipo !== undefined && !TIPOS.includes(tipo)) {
    throw new ErroApi(400, 'Dados inválidos.', { tipo: "O tipo deve ser 'entrada' ou 'saida'." });
  }
  res.json(await Categoria.listar(req.auth.id, tipo));
});

router.get('/:id', async (req, res) => {
  const categoria = await Categoria.buscar(lerId(req.params.id), req.auth.id);
  if (!categoria) throw new ErroApi(404, 'Categoria não encontrada.');
  res.json(categoria);
});

router.post('/', async (req, res) => {
  const dados = validar(req.body);
  try {
    res.status(201).json(await Categoria.criar(req.auth.id, dados));
  } catch (erro) {
    if (erro.code === 'ER_DUP_ENTRY') throw erroNomeRepetido();
    throw erro;
  }
});

router.put('/:id', async (req, res) => {
  const id = lerId(req.params.id);
  const atual = await Categoria.buscar(id, req.auth.id);
  if (!atual) throw new ErroApi(404, 'Categoria não encontrada.');

  const dados = validar(req.body, atual.tipo === 'saida' ? atual.classe : undefined);

  // Trocar o tipo quebraria a regra "categoria do mesmo tipo do lançamento"
  if (dados.tipo !== atual.tipo && (await Categoria.contarLancamentos(id, req.auth.id)) > 0) {
    throw new ErroApi(409, 'Não é possível trocar o tipo de uma categoria que já tem lançamentos.', {
      tipo: 'Existem lançamentos vinculados a esta categoria.',
    });
  }
  try {
    await Categoria.atualizar(id, req.auth.id, dados);
  } catch (erro) {
    if (erro.code === 'ER_DUP_ENTRY') throw erroNomeRepetido();
    throw erro;
  }
  res.status(200).json({ id, ...dados });
});

router.delete('/:id', async (req, res) => {
  const id = lerId(req.params.id);
  if (!(await Categoria.buscar(id, req.auth.id))) throw new ErroApi(404, 'Categoria não encontrada.');

  const vinculados = await Categoria.contarLancamentos(id, req.auth.id);
  if (vinculados > 0) {
    throw new ErroApi(409, `Não é possível excluir: há ${vinculados} lançamento(s) nesta categoria. Mova ou exclua os lançamentos antes.`);
  }
  try {
    await Categoria.excluir(id, req.auth.id);
  } catch (erro) {
    // A FK do banco também impede (caso um lançamento tenha sido criado entre a contagem e o DELETE)
    if (erro.code === 'ER_ROW_IS_REFERENCED_2') throw new ErroApi(409, 'Não é possível excluir: há lançamentos nesta categoria.');
    throw erro;
  }
  res.status(204).end();
});

module.exports = router;
