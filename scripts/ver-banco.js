import { DatabaseSync } from 'node:sqlite';
import { caminhoBanco } from '../src/database/conexao.js';

try {
  const banco = new DatabaseSync(caminhoBanco(), { readOnly: true });
  try {
    console.log('Consulta somente leitura: tabela ordens (valor em centavos).');
    console.table(banco.prepare('SELECT * FROM ordens ORDER BY id DESC').all());
  } finally {
    banco.close();
  }
} catch (erro) {
  console.error('Não foi possível consultar o banco:', erro.message);
  process.exitCode = 1;
}
