// Qualquer rota que não foi registrada cai aqui.
function notFound(req, res) {
  return res.status(404).json({ erro: `Rota ${req.method} ${req.originalUrl} não encontrada.` });
}

module.exports = notFound;
