// Camada HTTP: lê dados da requisição, chama o service e define o código de
// sucesso da resposta. Não contém regra de negócio. Erros são repassados com
// next(erro) para o middleware central de erros.

const pedidoService = require('../services/pedidoService');

function criar(req, res, next) {
  try {
    const pedido = pedidoService.criar(req.body);
    return res.status(201).json(pedido);
  } catch (erro) {
    return next(erro);
  }
}

function listar(req, res, next) {
  try {
    const pedidos = pedidoService.listar();
    return res.status(200).json(pedidos);
  } catch (erro) {
    return next(erro);
  }
}

function buscarPorId(req, res, next) {
  try {
    const pedido = pedidoService.buscarPorId(req.params.id);
    return res.status(200).json(pedido);
  } catch (erro) {
    return next(erro);
  }
}

function atualizarStatus(req, res, next) {
  try {
    const pedido = pedidoService.atualizarStatus(req.params.id, req.body);
    return res.status(200).json(pedido);
  } catch (erro) {
    return next(erro);
  }
}

module.exports = { criar, listar, buscarPorId, atualizarStatus };
