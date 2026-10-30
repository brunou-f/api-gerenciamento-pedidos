// Erros "esperados" da aplicação. Carregam o código HTTP que devem gerar.
// Qualquer erro que NÃO seja instância de AppError é tratado como inesperado (500).

class AppError extends Error {
  constructor(message, statusCode, detalhes) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.detalhes = detalhes;
  }
}

class ValidationError extends AppError {
  constructor(message, detalhes) {
    super(message, 400, detalhes);
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

module.exports = { AppError, ValidationError, NotFoundError };
