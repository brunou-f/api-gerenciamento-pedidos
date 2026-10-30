// Monta a aplicação Express sem abrir porta, para que os testes
// (supertest) possam usá-la diretamente.

const express = require('express');
const pedidoRoutes = require('./routes/pedidoRoutes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());

app.use('/pedidos', pedidoRoutes);

app.use(notFound);
app.use(errorHandler); // precisa ser o último middleware

module.exports = app;
