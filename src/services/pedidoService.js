// Camada de regras de negócio: validações, status inicial e transições.
// Não conhece Express (req/res) nem códigos HTTP diretamente; comunica
// problemas lançando erros de domínio (ValidationError / NotFoundError).

const repository = require('../repositories/pedidoRepository');
const { ValidationError, NotFoundError } = require('../errors/AppError');
const {
  TIPOS,
  PRIORIDADES,
  STATUS,
  STATUS_INICIAL,
  TRANSICOES,
} = require('../constants/pedido');

function ehObjeto(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

function validarDadosCriacao(dados) {
  if (!ehObjeto(dados)) {
    throw new ValidationError('O corpo da requisição deve ser um objeto JSON.');
  }

  const { cliente, tipo, valor, prioridade } = dados;
  const erros = [];

  if (typeof cliente !== 'string' || cliente.trim() === '') {
    erros.push({ campo: 'cliente', mensagem: 'Cliente é obrigatório e deve ser um texto não vazio.' });
  }

  // typeof "number" rejeita strings como "350"; Number.isFinite rejeita NaN/Infinity.
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
    erros.push({ campo: 'valor', mensagem: 'Valor deve ser numérico e maior que zero.' });
  }

  if (!TIPOS.includes(tipo)) {
    erros.push({ campo: 'tipo', mensagem: `Tipo inválido. Valores aceitos: ${TIPOS.join(', ')}.` });
  }

  if (!PRIORIDADES.includes(prioridade)) {
    erros.push({
      campo: 'prioridade',
      mensagem: `Prioridade inválida. Valores aceitos: ${PRIORIDADES.join(', ')}.`,
    });
  }

  if (erros.length > 0) {
    throw new ValidationError('Dados do pedido inválidos.', erros);
  }
}

// IDs só são válidos se forem inteiros positivos escritos só com dígitos.
// Qualquer outro formato ("abc", "1.5", "-2") não pode existir -> 404.
function converterId(idParam) {
  if (typeof idParam !== 'string' || !/^\d+$/.test(idParam)) {
    return null;
  }
  return Number(idParam);
}

function listar() {
  return repository.listar();
}

function buscarPorId(idParam) {
  const id = converterId(idParam);
  const pedido = id === null ? null : repository.buscarPorId(id);
  if (!pedido) {
    throw new NotFoundError(`Pedido com id ${idParam} não encontrado.`);
  }
  return pedido;
}

function criar(dados) {
  validarDadosCriacao(dados);

  // Monta o pedido apenas com os campos permitidos: o cliente não consegue
  // definir id nem status enviando-os no corpo.
  return repository.criar({
    cliente: dados.cliente.trim(),
    tipo: dados.tipo,
    valor: dados.valor,
    prioridade: dados.prioridade,
    status: STATUS_INICIAL,
  });
}

function atualizarStatus(idParam, dados) {
  // 1) O pedido precisa existir (404 tem prioridade sobre corpo inválido).
  const pedido = buscarPorId(idParam);

  // 2) O corpo precisa ter um status reconhecido.
  if (!ehObjeto(dados) || dados.status === undefined) {
    throw new ValidationError('O campo "status" é obrigatório.');
  }
  const { status } = dados;
  if (!STATUS.includes(status)) {
    throw new ValidationError(`Status inválido. Valores aceitos: ${STATUS.join(', ')}.`);
  }

  // 3) A transição precisa ser permitida pela máquina de estados.
  const permitidas = TRANSICOES[pedido.status];
  if (!permitidas.includes(status)) {
    throw new ValidationError(
      `Transição de "${pedido.status}" para "${status}" não é permitida.`,
      { statusAtual: pedido.status, transicoesPermitidas: permitidas }
    );
  }

  return repository.atualizar(pedido.id, { status });
}

module.exports = { listar, buscarPorId, criar, atualizarStatus };
