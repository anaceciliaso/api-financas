const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const protegerRota = require('../middleware/auth');
const { cpfValido } = require('../utils/cpf');
const { ErroApi, verificarErros } = require('../utils/erros');

const router = express.Router();

// Hash "de mentira" usado quando o e-mail não existe: assim o login demora o mesmo tempo
// nos dois casos e não dá para descobrir quais e-mails estão cadastrados pelo tempo de resposta.
const HASH_FALSO = '$2b$10$SMiQ8FTJC05SlVxsd5eSy.39.j0kPHI4O1wWGr9LRVSTppn7zdWlu';

// RF1 — POST /auth/cadastro
router.post('/cadastro', async (req, res) => {
  const { nome, email, cpf, senha } = req.body ?? {};
  const erros = {};

  if (typeof nome !== 'string' || !nome.trim()) erros.nome = 'Informe o nome.';
  else if (nome.trim().length > 120) erros.nome = 'O nome deve ter no máximo 120 caracteres.';

  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 160) {
    erros.email = 'E-mail inválido.';
  }
  if ((typeof cpf !== 'string' && typeof cpf !== 'number') || !cpfValido(cpf)) erros.cpf = 'CPF inválido.';

  if (typeof senha !== 'string' || senha.length < 8 || senha.length > 72
      || !/[A-Za-z]/.test(senha) || !/\d/.test(senha)) {
    erros.senha = 'A senha deve ter de 8 a 72 caracteres, com letras e números.';
  }
  verificarErros(erros);

  const senhaHash = await bcrypt.hash(senha, 10);   // 10 = custo (rodadas de salt)
  const dados = {
    nome: nome.trim(),
    email: email.trim().toLowerCase(),              // normalização: Ana@Email.com = ana@email.com
    cpf: String(cpf).replace(/\D/g, ''),            // normalização: 529.982.247-25 = 52998224725
    senhaHash,
  };

  try {
    const usuario = await Usuario.cadastrar(dados);
    return res.status(201).json(usuario);
  } catch (erro) {
    // A garantia de unicidade vem do banco (UNIQUE), não de um SELECT prévio
    if (erro.code === 'ER_DUP_ENTRY') {
      const campo = erro.sqlMessage.includes('uq_usuarios_cpf') ? 'cpf' : 'email';
      throw new ErroApi(409, 'Usuário já cadastrado.', {
        [campo]: `Já existe um usuário com este ${campo === 'cpf' ? 'CPF' : 'e-mail'}.`,
      });
    }
    throw erro;   // vai para o tratamento de erros do server.js (500)
  }
});

// RF2 — POST /auth/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body ?? {};
  const erros = {};
  if (typeof email !== 'string' || !email.trim()) erros.email = 'Informe o e-mail.';
  if (typeof senha !== 'string' || !senha) erros.senha = 'Informe a senha.';
  verificarErros(erros);

  // Busca SÓ pelo e-mail e compara a senha no Node (nunca no SQL)
  const usuario = await Usuario.buscarPorEmail(email.trim().toLowerCase());
  const confere = await bcrypt.compare(senha, usuario ? usuario.senha_hash : HASH_FALSO);

  if (!usuario || !confere) {
    throw new ErroApi(401, 'E-mail ou senha inválidos.');   // mensagem genérica de propósito
  }

  const { id, nome } = usuario;
  const token = jwt.sign({ id, nome, email: usuario.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

  return res.status(200).json({
    token,
    tipo: 'Bearer',
    expiraEm: '1h',
    usuario: { id, nome, email: usuario.email },
  });
});

// GET /auth/me — protegida individualmente
router.get('/me', protegerRota, async (req, res) => {
  const usuario = await Usuario.buscarPorId(req.auth.id);
  if (!usuario) throw new ErroApi(404, 'Usuário não encontrado.');
  return res.json(usuario);
});

module.exports = router;
