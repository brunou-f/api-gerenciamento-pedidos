// Testes de integração: exercitam a API via HTTP (rotas -> controller ->
// service -> repository -> middleware de erros), usando supertest.

const request = require('supertest');
const app = require('../src/app');
const repository = require('../src/repositories/pedidoRepository');
const pedidoService = require('../src/services/pedidoService');

const pedidoValido = {
  cliente: 'Carlos Silva',
  tipo: 'entrega',
  valor: 350,
  prioridade: 'normal',
};

beforeEach(() => {
  repository.limpar();
  jest.restoreAllMocks();
});

describe('POST /pedidos', () => {
  test('201 com o pedido criado', async () => {
    const res = await request(app).post('/pedidos').send(pedidoValido);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, ...pedidoValido, status: 'recebido' });
  });

  test('400 com mensagem JSON e detalhes por campo', async () => {
    const res = await request(app)
      .post('/pedidos')
      .send({ ...pedidoValido, cliente: '   ', valor: -5 });
    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Dados do pedido inválidos.');
    expect(res.body.detalhes.map((d) => d.campo)).toEqual(['cliente', 'valor']);
  });

  test('400 para JSON malformado', async () => {
    const res = await request(app)
      .post('/pedidos')
      .set('Content-Type', 'application/json')
      .send('{"cliente": "Ana",');
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/JSON malformado/);
  });

  test('400 quando o corpo é um array', async () => {
    const res = await request(app).post('/pedidos').send([pedidoValido]);
    expect(res.status).toBe(400);
  });
});

describe('GET /pedidos', () => {
  test('200 com lista vazia', async () => {
    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('200 com os pedidos cadastrados', async () => {
    await request(app).post('/pedidos').send(pedidoValido);
    await request(app).post('/pedidos').send({ ...pedidoValido, cliente: 'Ana', tipo: 'retirada' });
    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[1]).toMatchObject({ id: 2, cliente: 'Ana', tipo: 'retirada' });
  });
});

describe('GET /pedidos/:id', () => {
  test('200 para pedido existente', async () => {
    await request(app).post('/pedidos').send(pedidoValido);
    const res = await request(app).get('/pedidos/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  test('404 para pedido inexistente', async () => {
    const res = await request(app).get('/pedidos/999');
    expect(res.status).toBe(404);
    expect(res.body.erro).toMatch(/não encontrado/);
  });

  test('404 para id em formato não numérico', async () => {
    const res = await request(app).get('/pedidos/abc');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /pedidos/:id/status', () => {
  beforeEach(async () => {
    await request(app).post('/pedidos').send(pedidoValido);
  });

  test('200 em transição válida', async () => {
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'em_preparacao' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('em_preparacao');
  });

  test('400 para status desconhecido', async () => {
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'perdido' });
    expect(res.status).toBe(400);
  });

  test('400 para corpo sem status', async () => {
    const res = await request(app).patch('/pedidos/1/status').send({});
    expect(res.status).toBe(400);
  });

  test('400 para transição não permitida, informando as permitidas', async () => {
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'entregue' });
    expect(res.status).toBe(400);
    expect(res.body.detalhes.transicoesPermitidas).toEqual(['em_preparacao', 'cancelado']);
  });

  test('404 para pedido inexistente', async () => {
    const res = await request(app).patch('/pedidos/999/status').send({ status: 'cancelado' });
    expect(res.status).toBe(404);
  });
});

describe('Erros gerais', () => {
  test('404 JSON para rota inexistente', async () => {
    const res = await request(app).get('/produtos');
    expect(res.status).toBe(404);
    expect(res.body.erro).toMatch(/não encontrada/);
  });

  test('500 para erro inesperado, sem expor detalhes internos', async () => {
    jest.spyOn(pedidoService, 'listar').mockImplementation(() => {
      throw new Error('falha simulada no armazenamento');
    });
    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ erro: 'Erro interno do servidor.' });
  });
});
