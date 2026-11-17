export function criarOrdensController(service) {
  return {
    cadastrar(req, res) {
      const ordem = service.cadastrar(req.body);
      res.status(201).json(ordem);
    },
    listar(req, res) {
      res.json(service.listar());
    }
  };
}
