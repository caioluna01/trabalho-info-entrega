import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import { abrirBanco } from '../src/database/conexao.js';
import { criarApp } from '../src/app.js';

async function ambiente(t) {
  const pasta = mkdtempSync(join(tmpdir(), 'oficina-teste-'));
  const arquivo = join(pasta, 'teste.sqlite');
  const banco = abrirBanco(arquivo);
  const servidor = criarApp(banco).listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  t.after(async () => {
    await new Promise((resolve, reject) => servidor.close(erro => erro ? reject(erro) : resolve()));
    banco.close();
    rmSync(pasta, { recursive: true, force: true });
  });
  const url = `http://127.0.0.1:${servidor.address().port}`;
  return {
    banco, arquivo, url,
    post: dados => fetch(`${url}/ordens`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados)
    })
  };
}

test('POST válido retorna 201 e grava campos normalizados no SQLite', async t => {
  const { post, banco } = await ambiente(t);
  const resposta = await post({ veiculo: ' Uno ABC1D23 ', descricao: ' Freio com ruído ', servicoSolicitado: ' Revisão ', valorEstimado: 123.45 });
  assert.equal(resposta.status, 201);
  const ordem = await resposta.json();
  assert.equal(ordem.veiculo, 'Uno ABC1D23');
  assert.equal(ordem.descricao, 'Freio com ruído');
  assert.equal(ordem.servicoSolicitado, 'Revisão');
  assert.equal(ordem.valorEstimado, 123.45);
  assert.equal(ordem.status, 'Aberta');
  assert.ok(!Number.isNaN(Date.parse(ordem.criadaEm)));
  const linha = banco.prepare('SELECT * FROM ordens WHERE id = ?').get(ordem.id);
  assert.equal(linha.valor_estimado_centavos, 12345);
  assert.equal(linha.descricao, ordem.descricao);
});

test('GET lê registros inseridos diretamente no banco e ordena os mais recentes', async t => {
  const { banco, url } = await ambiente(t);
  const sql = banco.prepare('INSERT INTO ordens (veiculo, descricao) VALUES (?, ?)');
  sql.run('Uno', 'Revisão');
  sql.run('Gol', 'Troca de óleo');
  const resposta = await fetch(`${url}/ordens`);
  assert.equal(resposta.status, 200);
  assert.match(resposta.headers.get('content-type'), /application\/json/);
  const ordens = await resposta.json();
  assert.deepEqual(ordens.map(ordem => ordem.veiculo), ['Gol', 'Uno']);
  assert.equal(ordens[0].valorEstimado, null);
});

test('GET retorna lista vazia sem inventar dados', async t => {
  const { url } = await ambiente(t);
  assert.deepEqual(await (await fetch(`${url}/ordens`)).json(), []);
});

for (const descricao of [undefined, '', '   ', '\n\t', 42]) {
  test(`rejeita descrição inválida: ${JSON.stringify(descricao)}`, async t => {
    const { post, banco } = await ambiente(t);
    const resposta = await post({ veiculo: 'Uno', descricao });
    assert.equal(resposta.status, 400);
    assert.match((await resposta.json()).erro, /Descrição/);
    assert.equal(banco.prepare('SELECT count(*) AS total FROM ordens').get().total, 0);
  });
}

for (const dados of [
  { descricao: 'Revisão' },
  { veiculo: '  ', descricao: 'Revisão' },
  { veiculo: 'Uno', descricao: 'Revisão', valorEstimado: -1 },
  { veiculo: 'Uno', descricao: 'Revisão', valorEstimado: '10' },
  { veiculo: 'Uno', descricao: 'Revisão', valorEstimado: 1.234 },
  { veiculo: 'Uno', descricao: 'Revisão', status: 'Fechada' },
  { veiculo: 'Uno', descricao: 'a'.repeat(2001) },
  [], null
]) {
  test(`rejeita dados fora do contrato: ${JSON.stringify(dados).slice(0, 90)}`, async t => {
    const { post } = await ambiente(t);
    const resposta = await post(dados);
    assert.equal(resposta.status, 400);
    assert.equal(typeof (await resposta.json()).erro, 'string');
  });
}

test('aceita opcionais ausentes e valor zero', async t => {
  const { post } = await ambiente(t);
  const ordem = await (await post({ veiculo: 'Uno', descricao: 'Revisão' })).json();
  assert.equal(ordem.servicoSolicitado, null);
  assert.equal(ordem.valorEstimado, null);
  const gratuita = await (await post({ veiculo: 'Gol', descricao: 'Avaliação', valorEstimado: 0 })).json();
  assert.equal(gratuita.valorEstimado, 0);
});

test('persistência: outra conexão consulta o arquivo gravado pela API', async t => {
  const { post, arquivo } = await ambiente(t);
  const ordem = await (await post({ veiculo: 'Uno', descricao: 'Persistência real' })).json();
  const segundaConexao = new DatabaseSync(arquivo, { readOnly: true });
  try {
    assert.equal(segundaConexao.prepare('SELECT descricao FROM ordens WHERE id = ?').get(ordem.id).descricao, 'Persistência real');
  } finally { segundaConexao.close(); }
});

test('SQL parametrizado trata tentativa de injeção como texto', async t => {
  const { post, banco } = await ambiente(t);
  const descricao = "'); DROP TABLE ordens; --";
  assert.equal((await post({ veiculo: 'Uno', descricao })).status, 201);
  assert.equal(banco.prepare('SELECT descricao FROM ordens').get().descricao, descricao);
});

test('JSON malformado, mídia errada e rota inexistente têm resposta JSON', async t => {
  const { url } = await ambiente(t);
  const invalido = await fetch(`${url}/ordens`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(invalido.status, 400);
  assert.equal((await invalido.json()).erro, 'JSON inválido.');
  const midia = await fetch(`${url}/ordens`, { method: 'POST', body: 'texto' });
  assert.equal(midia.status, 415);
  const ausente = await fetch(`${url}/nao-existe`);
  assert.equal(ausente.status, 404);
  assert.ok((await ausente.json()).erro);
});

test('não oferece alteração ou exclusão de ordens', async t => {
  const { url } = await ambiente(t);
  for (const method of ['PUT', 'PATCH', 'DELETE']) {
    assert.equal((await fetch(`${url}/ordens/1`, { method })).status, 404);
  }
});
