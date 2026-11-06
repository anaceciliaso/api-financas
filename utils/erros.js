// Erro "esperado" da API: carrega o código de status e, opcionalmente, os campos com problema.
// As rotas fazem `throw new ErroApi(...)` e o middleware de erros do server.js
// transforma isso na resposta padrão: { "erro": "...", "campos": { ... } }
class ErroApi extends Error {
  constructor(status, mensagem, campos) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.campos = campos;
  }
}

// Lança 400 se o objeto de erros de validação não estiver vazio
function verificarErros(erros) {
  if (Object.keys(erros).length > 0) {
    throw new ErroApi(400, 'Dados inválidos.', erros);
  }
}

module.exports = { ErroApi, verificarErros };
