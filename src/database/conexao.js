import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

export function caminhoBanco() {
  return join(resolve(process.env.DATA_DIR || 'data'), 'oficina.sqlite');
}

export function abrirBanco(arquivo = caminhoBanco()) {
  mkdirSync(resolve(arquivo, '..'), { recursive: true });
  const banco = new DatabaseSync(arquivo);
  try {
    banco.exec(`
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS ordens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        veiculo TEXT NOT NULL CHECK(length(trim(veiculo)) > 0),
        descricao TEXT NOT NULL CHECK(length(trim(descricao)) > 0),
        servico_solicitado TEXT,
        valor_estimado_centavos INTEGER CHECK(valor_estimado_centavos >= 0),
        status TEXT NOT NULL DEFAULT 'Aberta' CHECK(status = 'Aberta'),
        criada_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ) STRICT;
    `);
    return banco;
  } catch (erro) {
    banco.close();
    throw erro;
  }
}
