require('dotenv').config();   // precisa ser a primeira linha: carrega o .env em process.env
const express = require('express');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET não definida. Copie o .env.example para .env e preencha os valores.');
  process.exit(1);
}

const protegerRota = require('./middleware/auth');
const { ErroApi } = require('./utils/erros');

const app = express();
app.use(express.json());

app.use('/auth', require('./routes/auth'));            // cadastro, login (públicas) e /me (protegida)
app.use('/categorias', protegerRota, require('./routes/categorias'));
app.use('/fontes-destinos', protegerRota, require('./routes/fontesDestinos'));
app.use('/lancamentos', protegerRota, require('./routes/lancamentos'));
app.use('/relatorios', protegerRota, require('./routes/relatorios'));
app.use('/saude-financeira', protegerRota, require('./routes/saudeFinanceira'));

// Rota inexistente
app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

// Tratamento de erros (sempre com 4 parâmetros e por último).
// No Express 5, erros lançados dentro de rotas async chegam aqui automaticamente.
app.use((erro, req, res, next) => {
  if (erro instanceof ErroApi) {
    const corpo = { erro: erro.message };
    if (erro.campos) corpo.campos = erro.campos;
    return res.status(erro.status).json(corpo);
  }
  if (erro.name === 'UnauthorizedError') {
    return res.status(401).json({ erro: 'Token ausente, inválido ou expirado.' });
  }
  if (erro.type === 'entity.parse.failed') {              // JSON mal formado no corpo
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  console.error(erro);                                    // detalhe só no terminal
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const porta = process.env.PORT || 3000;
app.listen(porta, () => console.log(`API de finanças rodando em http://localhost:${porta}`));
