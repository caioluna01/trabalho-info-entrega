# Oficina Ordens

Projeto acadêmico de Sistemas de Informação, Facape, 2026.2. API e interface para cadastrar e consultar ordens de serviço de uma oficina mecânica.

**Integrantes:** 
* Caio Gomes
* Arthur
* Louise Cadide
*Isabella


## Iniciar com Docker

Instale e abra o Docker Desktop com containers Linux e Docker Compose. Na primeira execução, é necessário acesso à internet para baixar a imagem Node.js 24 e as dependências. Não é necessário instalar Node.js nem `node_modules` no computador.

Na pasta desta cópia, dê dois cliques em `INICIAR.bat` ou execute no PowerShell:

```powershell
.\INICIAR.bat
```

Após a confirmação, abra **http://localhost:3000**. A API está em **http://localhost:3000/ordens**. O atalho constrói a imagem, inicia em segundo plano e aguarda o healthcheck. Ele procura Docker no PATH e nas instalações comuns do Docker Desktop.

Com Docker no PATH, o comando equivalente é:

```sh
docker compose up --build -d --wait
```

Para consultar o estado, acompanhar erros e encerrar sem apagar dados:

```sh
docker compose ps
docker compose logs api
docker compose down
```

Os atalhos funcionam mesmo quando chamados a partir de outra pasta. Eles mantêm a janela aberta para leitura das mensagens e retornam código 0 no sucesso e 1 na falha. Em automação, use `INICIAR.bat --sem-pausa` ou `TESTAR.bat --sem-pausa`.

## Testar

Dê dois cliques em `TESTAR.bat` ou execute:

```powershell
.\TESTAR.bat
```

O atalho constrói a imagem se necessário, executa os testes em um container temporário e informa sucesso ou falha. Pode ser usado antes de iniciar a aplicação. Com Docker no PATH:

```sh
docker compose run --build --rm --no-deps api npm test
```

Os testes usam `node:test`, HTTP real e arquivos SQLite exclusivos na pasta temporária do container. Fecham as conexões e removem seus próprios arquivos ao terminar; não consultam nem alteram o banco da demonstração. O container de testes é removido automaticamente, preservando o volume de dados.

A suíte cobre cadastro e consulta, gravação SQL, persistência em outra conexão, campos obrigatórios, valores inválidos, opcionais, normalização, JSON malformado, tipo de conteúdo, rotas inexistentes e SQL parametrizado.

Verificado nesta cópia em 14/11/2026: `TESTAR.bat --sem-pausa` executou 22 testes, todos aprovados; `docker compose config` validou a configuração; `INICIAR.bat --sem-pausa`, chamado de outra pasta, iniciou o container saudável. A página, o CSS, o JavaScript e `GET /ordens` responderam HTTP 200. O arquivo e a tabela foram criados automaticamente no volume próprio da cópia, com zero ordens; `data/` local permaneceu vazia.

## Dados e configuração

Esta cópia é entregue com `data/` vazia. A aplicação cria o arquivo `oficina.sqlite` e a tabela `ordens` na inicialização, sem inserir ordens automaticamente.

No Docker, os dados ficam no volume nomeado `dados_oficina`, montado em `/app/data`. O Docker Compose acrescenta o nome do projeto: usando o nome desta pasta, o volume é `trabalho-info-entrega_dados_oficina`. Ele é independente do volume do projeto original. Mantenha o mesmo nome de pasta/projeto nas próximas execuções para reutilizar os dados. A pasta local `data/` é usada apenas na execução sem Docker.

`docker compose down` preserva os dados. Não use a opção `-v` nem remova o volume se quiser manter as ordens. Os dois atalhos não apagam dados.

Não há senhas, tokens ou chaves a configurar. As únicas variáveis opcionais são:

| Variável | Padrão local | Configuração do Compose |
| --- | --- | --- |
| `PORT` | `3000` | `3000`, publicado somente em `127.0.0.1:3000` |
| `DATA_DIR` | `data` | `/app/data`, dentro do volume |

`.env.example` documenta os padrões e não contém segredos. A aplicação não carrega esse arquivo nem `.env` automaticamente. Para execução local, defina as variáveis no terminal; para Docker, ajuste `environment` no Compose e, se mudar a porta, ajuste também `ports` e o healthcheck.

## Execução local opcional

Com Node.js 24 instalado, na pasta da cópia:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd start
```

Esse método instala `node_modules` localmente. Os atalhos usam Docker e dispensam essa instalação. Encerre o servidor local com Ctrl+C antes de iniciar Docker na mesma porta.

Exemplo de configuração local opcional no PowerShell:

```powershell
$env:PORT = '3001'
$env:DATA_DIR = '.\data'
npm.cmd start
```

## API e apresentação

| Método e rota | Resultado |
| --- | --- |
| `GET /ordens` | Lista do SQLite, mais recentes primeiro; `[]` quando vazia |
| `POST /ordens` | Cadastro, com resposta 201 e ordem gravada |

Envie o POST com `Content-Type: application/json`:

```json
{
  "veiculo": "Veículo fictício da apresentação",
  "descricao": "Ruído ao frear.",
  "servicoSolicitado": "Inspeção dos freios",
  "valorEstimado": 250.50
}
```

`veiculo` e `descricao` são textos obrigatórios, com até 150 e 2000 caracteres após remover espaços nas pontas. `servicoSolicitado` é opcional, com até 200 caracteres. `valorEstimado` é um número opcional, não negativo, com até duas casas decimais; o valor em centavos deve ser um inteiro numérico seguro. Campos desconhecidos são recusados. O banco gera id, data e status inicial `Aberta`. Não há edição ou exclusão.

Erros retornam JSON com o campo `erro`: 400 para validação ou JSON inválido, 413 para corpo acima de 16 KB, 415 para conteúdo incompatível, 404 para rota inexistente e 500 para falha inesperada.

Para demonstrar, cadastre uma ordem pela interface e consulte `GET /ordens`. Confira diretamente a tabela, em modo somente leitura:

```sh
docker compose exec -T api node scripts/ver-banco.js
```

Localmente, o comando correspondente é `npm.cmd run ver-banco`. Para comprovar persistência, anote o id, execute `docker compose down`, inicie novamente e consulte o mesmo registro. Esses comandos reutilizam o volume.

## Estrutura

```text
src/
  app.js
  server.js
  controllers/ordens-controller.js
  services/ordens-service.js
  routes/ordens-routes.js
  models/ordem.js
  database/conexao.js
  repositories/ordens-repository.js
  public/
    index.html
    styles.css
    app.js
testes/ordens.test.js
scripts/ver-banco.js
data/                             vazia na entrega
Dockerfile
docker-compose.yml
package.json
package-lock.json
README.md
.dockerignore
.env.example
INICIAR.bat
TESTAR.bat
```

O fluxo existente é routes → controller → service → repository → SQLite; o model representa a resposta. `repositories/` foi preservada porque contém o INSERT e o SELECT usados pela aplicação. `scripts/ver-banco.js` foi mantido para apresentar a tabela e a persistência, com conexão somente leitura. A interface original foi colocada em `src/public`, com ajuste da referência no Express, preservando as mesmas telas e funcionalidades.

A cópia não inclui dependências instaladas, banco antigo, documentos originais, guia de estudo, gerador do guia, PDFKit, temporários, caches, logs, backups ou metadados Git. Os dois atalhos incorporam a localização do Docker, dispensando o antigo terceiro auxiliar `.bat`.

## Problemas comuns

- Docker não encontrado ou indisponível: instale/abra o Docker Desktop e aguarde o mecanismo Linux iniciar.
- Porta 3000 ocupada: encerre a aplicação que está usando essa porta, inclusive uma execução do projeto original.
- Falha no build: confira o acesso à internet e a mensagem exibida pelo Docker.
- Banco aparentemente vazio: confira se está usando a mesma pasta/projeto Compose e se está consultando o volume Docker ou o banco local.
- Testes com falha: leia a saída exibida; o atalho retorna código 1 para testes ou preparação com erro.
