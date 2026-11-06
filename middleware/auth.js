// Middleware que exige um JWT válido no cabeçalho  Authorization: Bearer <token>
// Se o token for válido, o conteúdo dele fica em req.auth (ex.: req.auth.id).
// Se não for, o express-jwt gera um UnauthorizedError, tratado no server.js (401).
const { expressjwt } = require('express-jwt');

const protegerRota = expressjwt({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
});

module.exports = protegerRota;
