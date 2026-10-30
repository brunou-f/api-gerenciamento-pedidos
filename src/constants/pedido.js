// Valores reconhecidos pela API. Toda validação consulta esta fonte única,
// e o README documenta exatamente estes valores.

const TIPOS = ['entrega', 'retirada'];

const PRIORIDADES = ['baixa', 'normal', 'alta'];

const STATUS_INICIAL = 'recebido';

// Máquina de estados: para cada status atual, os próximos status permitidos.
// "entregue" e "cancelado" são estados finais (nenhuma transição sai deles).
const TRANSICOES = {
  recebido: ['em_preparacao', 'cancelado'],
  em_preparacao: ['enviado', 'cancelado'],
  enviado: ['entregue'],
  entregue: [],
  cancelado: [],
};

const STATUS = Object.keys(TRANSICOES);

module.exports = { TIPOS, PRIORIDADES, STATUS, STATUS_INICIAL, TRANSICOES };
