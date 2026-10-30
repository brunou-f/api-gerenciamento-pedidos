// Tratamento central de erros. Separa três situações:
// 1) Erros de domínio (AppError): validação (400) ou não encontrado (404).
// 2) JSON malformado enviado pelo cliente: também é erro do usuário (400).
// 3) Qualquer outra coisa é erro inesperado: 500, sem expor detalhes internos.

const { AppError } = require('../errors/AppError');

// O Express só reconhece um middleware de erro se ele tiver 4 parâmetros,
// por isso "next" fica na assinatura mesmo sem ser usado.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const corpo = { erro: err.message };
    if (err.detalhes) corpo.detalhes = err.detalhes;
    return res.status(err.statusCode).json(corpo);
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON malformado no corpo da requisição.' });
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error('Erro inesperado:', err);
  }
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

module.exports = errorHandler;
