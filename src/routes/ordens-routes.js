import { Router } from 'express';

export function criarOrdensRoutes(controller) {
  const router = Router();
  router.get('/', controller.listar);
  router.post('/', (req, res, next) => {
    if (!req.is('application/json')) {
      return res.status(415).json({ erro: 'Use Content-Type: application/json.' });
    }
    next();
  }, controller.cadastrar);
  return router;
}
