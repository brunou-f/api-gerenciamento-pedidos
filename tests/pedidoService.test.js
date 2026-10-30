// Testes unitários da camada de serviço (regras de negócio), sem HTTP.

const pedidoService = require('../src/services/pedidoService');
const repository = require('../src/repositories/pedidoRepository');
const { ValidationError, NotFoundError } = require('../src/errors/AppError');

const pedidoValido = {
  cliente: 'Carlos Silva',
  tipo: 'entrega',
  valor: 350,
  prioridade: 'normal',
};

beforeEach(() => {
  repository.limpar();
});

describe('pedidoService.criar', () => {
  test('cria pedido com id sequencial e status inicial "recebido"', () => {
    const pedido = pedidoService.criar(pedidoValido);
    expect(pedido).toEqual({ id: 1, ...pedidoValido, status: 'recebido' });
  });

  test('remove espaços das extremidades do nome do cliente', () => {
    const pedido = pedidoService.criar({ ...pedidoValido, cliente: '  Ana  ' });
    expect(pedido.cliente).toBe('Ana');
  });

  test('ignora id e status enviados pelo cliente', () => {
    const pedido = pedidoService.criar({ ...pedidoValido, id: 99, status: 'entregue' });
    expect(pedido.id).toBe(1);
    expect(pedido.status).toBe('recebido');
  });

  test.each([
    ['cliente ausente', { cliente: undefined }],
    ['cliente só com espaços', { cliente: '   ' }],
    ['cliente não textual', { cliente: 123 }],
    ['valor zero', { valor: 0 }],
    ['valor negativo', { valor: -10 }],
    ['valor como texto', { valor: '350' }],
    ['valor nulo', { valor: null }],
    ['tipo desconhecido', { tipo: 'drone' }],
    ['tipo com maiúscula', { tipo: 'Entrega' }],
    ['prioridade desconhecida', { prioridade: 'urgentissima' }],
  ])('rejeita %s com ValidationError', (_descricao, alteracao) => {
    expect(() => pedidoService.criar({ ...pedidoValido, ...alteracao })).toThrow(ValidationError);
  });

  test('acumula todos os erros de validação de uma vez', () => {
    try {
      pedidoService.criar({});
      throw new Error('deveria ter lançado ValidationError');
    } catch (erro) {
      expect(erro).toBeInstanceOf(ValidationError);
      const campos = erro.detalhes.map((d) => d.campo).sort();
      expect(campos).toEqual(['cliente', 'prioridade', 'tipo', 'valor']);
    }
  });
});

describe('pedidoService.buscarPorId', () => {
  test('retorna pedido existente', () => {
    pedidoService.criar(pedidoValido);
    expect(pedidoService.buscarPorId('1').cliente).toBe('Carlos Silva');
  });

  test.each(['999', 'abc', '1.5', '-1'])('lança NotFoundError para id "%s"', (id) => {
    pedidoService.criar(pedidoValido);
    expect(() => pedidoService.buscarPorId(id)).toThrow(NotFoundError);
  });
});

describe('pedidoService.atualizarStatus', () => {
  test('percorre o fluxo completo recebido -> em_preparacao -> enviado -> entregue', () => {
    pedidoService.criar(pedidoValido);
    expect(pedidoService.atualizarStatus('1', { status: 'em_preparacao' }).status).toBe('em_preparacao');
    expect(pedidoService.atualizarStatus('1', { status: 'enviado' }).status).toBe('enviado');
    expect(pedidoService.atualizarStatus('1', { status: 'entregue' }).status).toBe('entregue');
  });

  test('permite cancelar pedido recebido', () => {
    pedidoService.criar(pedidoValido);
    expect(pedidoService.atualizarStatus('1', { status: 'cancelado' }).status).toBe('cancelado');
  });

  test('não permite pular etapas (recebido -> entregue)', () => {
    pedidoService.criar(pedidoValido);
    expect(() => pedidoService.atualizarStatus('1', { status: 'entregue' })).toThrow(ValidationError);
  });

  test('não permite cancelar pedido já enviado', () => {
    pedidoService.criar(pedidoValido);
    pedidoService.atualizarStatus('1', { status: 'em_preparacao' });
    pedidoService.atualizarStatus('1', { status: 'enviado' });
    expect(() => pedidoService.atualizarStatus('1', { status: 'cancelado' })).toThrow(ValidationError);
  });

  test('não permite sair de estado final (cancelado)', () => {
    pedidoService.criar(pedidoValido);
    pedidoService.atualizarStatus('1', { status: 'cancelado' });
    expect(() => pedidoService.atualizarStatus('1', { status: 'recebido' })).toThrow(ValidationError);
  });

  test('não permite "transição" para o mesmo status', () => {
    pedidoService.criar(pedidoValido);
    expect(() => pedidoService.atualizarStatus('1', { status: 'recebido' })).toThrow(ValidationError);
  });

  test('rejeita status desconhecido ou ausente', () => {
    pedidoService.criar(pedidoValido);
    expect(() => pedidoService.atualizarStatus('1', { status: 'perdido' })).toThrow(ValidationError);
    expect(() => pedidoService.atualizarStatus('1', {})).toThrow(ValidationError);
  });

  test('lança NotFoundError para pedido inexistente, mesmo com corpo inválido', () => {
    expect(() => pedidoService.atualizarStatus('42', { status: 'xyz' })).toThrow(NotFoundError);
  });
});
