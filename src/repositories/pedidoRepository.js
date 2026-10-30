// Camada de dados: armazenamento em memória.
// Só esta camada sabe ONDE os pedidos ficam. Trocar por banco de dados
// exigiria mudar apenas este arquivo, sem tocar em service ou controller.
//
// Os métodos devolvem CÓPIAS dos objetos para que nenhuma outra camada
// consiga alterar o "banco" sem passar por aqui.

let pedidos = [];
let proximoId = 1;

function listar() {
  return pedidos.map((pedido) => ({ ...pedido }));
}

function buscarPorId(id) {
  const pedido = pedidos.find((p) => p.id === id);
  return pedido ? { ...pedido } : null;
}

function criar(dados) {
  const pedido = { id: proximoId++, ...dados };
  pedidos.push(pedido);
  return { ...pedido };
}

function atualizar(id, campos) {
  const indice = pedidos.findIndex((p) => p.id === id);
  if (indice === -1) return null;
  pedidos[indice] = { ...pedidos[indice], ...campos };
  return { ...pedidos[indice] };
}

// Usado apenas pelos testes para começar cada cenário do zero.
function limpar() {
  pedidos = [];
  proximoId = 1;
}

module.exports = { listar, buscarPorId, criar, atualizar, limpar };
