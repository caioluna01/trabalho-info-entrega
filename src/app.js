import express from 'express';
import { fileURLToPath } from 'node:url';
import { criarOrdensRepository } from './repositories/ordens-repository.js';
import { criarOrdensService, ErroValidacao } from './services/ordens-service.js';
import { criarOrdensController } from './controllers/ordens-controller.js';
import { criarOrdensRoutes } from './routes/ordens-routes.js';

export function criarApp(banco) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb', strict: false }));
  const repository = criarOrdensRepository(banco);
  const service = criarOrdensService(repository);
  app.use('/ordens', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  }, criarOrdensRoutes(criarOrdensController(service)));
  app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))));
  app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
  app.use((erro, req, res, next) => {
    if (erro instanceof ErroValidacao) return res.status(400).json({ erro: erro.message });
    if (erro.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' });
    if (erro.type === 'entity.too.large') return res.status(413).json({ erro: 'JSON excede o limite de 16 KB.' });
    console.error('Falha ao processar requisição:', erro);
    res.status(500).json({ erro: 'Não foi possível processar a solicitação. Tente novamente.' });
  });
  return app;
}
