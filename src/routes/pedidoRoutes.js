// Camada de rotas: apenas liga método + caminho ao controller correspondente.

const { Router } = require('express');
const pedidoController = require('../controllers/pedidoController');

const router = Router();

router.post('/', pedidoController.criar);
router.get('/', pedidoController.listar);
router.get('/:id', pedidoController.buscarPorId);
router.patch('/:id/status', pedidoController.atualizarStatus);

module.exports = router;
