import { abrirBanco } from './database/conexao.js';
import { criarApp } from './app.js';

const porta = Number(process.env.PORT || 3000);
if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
  console.error('PORT deve ser um número inteiro entre 1 e 65535.');
  process.exit(1);
}

try {
  const banco = abrirBanco();
  const servidor = criarApp(banco).listen(porta, '0.0.0.0', () => {
    console.log(`Oficina Ordens disponível em http://localhost:${porta}`);
  });
  servidor.on('error', erro => {
    console.error('Não foi possível iniciar o servidor:', erro.message);
    banco.close();
    process.exitCode = 1;
  });
  function encerrar() {
    servidor.close(() => banco.close());
  }
  process.once('SIGINT', encerrar);
  process.once('SIGTERM', encerrar);
} catch (erro) {
  console.error('Não foi possível iniciar a aplicação:', erro.message);
  process.exitCode = 1;
}
