const formulario = document.querySelector('#form-ordem');
const lista = document.querySelector('#lista');
const contagem = document.querySelector('#contagem');
const mensagemForm = document.querySelector('#mensagem-form');
const mensagemLista = document.querySelector('#mensagem-lista');
const cadastrar = document.querySelector('#cadastrar');
const atualizar = document.querySelector('#atualizar');
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const data = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function mensagem(destino, metodo, status, texto, tipo = '') {
  const topo = elemento('div', 'resultado-topo');
  topo.append(elemento('span', 'metodo', metodo), elemento('span', 'resultado-status', status));
  destino.className = `mensagem ${tipo}`;
  destino.replaceChildren(topo, elemento('p', 'resultado-texto', texto));
}

function statusHttp(resposta) {
  // statusText pode vir vazio (por exemplo, em HTTP/2). O código é sempre o recebido.
  return `${resposta.status}${resposta.statusText ? ` ${resposta.statusText}` : ''}`;
}

function mostrarFalha(destino, metodo, erro, resposta = erro.resposta) {
  const orientacao = metodo === 'POST'
    ? 'Não foi possível confirmar o cadastro. Atualize a lista antes de tentar novamente.'
    : 'Verifique a conexão e tente atualizar a lista novamente.';
  mensagem(destino, metodo, resposta ? statusHttp(resposta) : 'Falha de conexão', resposta ? erro.message : orientacao, 'erro');
}

async function requisitar(opcoes) {
  let resposta;
  try {
    resposta = await fetch('/ordens', opcoes);
    const dados = await resposta.json().catch(() => {
      throw new Error(resposta.ok ? 'Não foi possível ler a resposta da API.' : 'Erro retornado pela API. Tente novamente.');
    });
    if (!resposta.ok) throw new Error(dados?.erro || 'Erro retornado pela API. Tente novamente.');
    return { dados, resposta };
  } catch (erro) {
    // Preserva o status mesmo se a leitura do corpo falhar após receber os cabeçalhos.
    erro.resposta = resposta;
    throw erro;
  }
}

function elemento(tag, classe, texto) {
  const item = document.createElement(tag);
  if (classe) item.className = classe;
  if (texto !== undefined) item.textContent = texto;
  return item;
}

function mostrarOrdem(ordem) {
  const artigo = elemento('article', 'ordem');
  const topo = elemento('div', 'ordem-topo');
  const titulo = elemento('div');
  titulo.append(elemento('span', 'identificador', `ORDEM #${String(ordem.id).padStart(3, '0')}`), elemento('h3', '', ordem.veiculo));
  topo.append(titulo, elemento('span', 'status', ordem.status));
  const detalhes = elemento('dl', 'detalhes');
  for (const [rotulo, valor] of [
    ['Serviço solicitado', ordem.servicoSolicitado || 'Não informado'],
    ['Valor estimado', ordem.valorEstimado === null ? 'Não informado' : moeda.format(ordem.valorEstimado)]
  ]) {
    const par = elemento('div');
    par.append(elemento('dt', '', rotulo), elemento('dd', '', valor));
    detalhes.append(par);
  }
  const horario = elemento('time', 'data', `Registrada em ${data.format(new Date(ordem.criadaEm))}`);
  horario.dateTime = ordem.criadaEm;
  artigo.append(topo, elemento('p', 'descricao', ordem.descricao), detalhes, horario);
  return artigo;
}

async function carregarOrdens() {
  atualizar.disabled = true;
  atualizar.textContent = 'Consultando…';
  lista.setAttribute('aria-busy', 'true');
  mensagem(mensagemLista, 'GET', 'Aguardando resposta', 'Consultando as ordens…');
  let resposta;
  try {
    const resultado = await requisitar({ method: 'GET' });
    resposta = resultado.resposta;
    const ordens = resultado.dados;
    if (!Array.isArray(ordens)) throw new Error('A API respondeu, mas não enviou uma lista de ordens.');
    lista.replaceChildren(...ordens.map(mostrarOrdem));
    contagem.textContent = `${ordens.length} ${ordens.length === 1 ? 'ordem registrada' : 'ordens registradas'} · mais recentes primeiro`;
    if (ordens.length === 0) {
      const vazio = elemento('div', 'vazio');
      const irCadastro = elemento('a', '', 'Ir para o cadastro');
      irCadastro.href = '#cadastro';
      vazio.append(elemento('h3', '', 'Nenhuma ordem cadastrada'), elemento('p', '', 'Use o formulário para registrar a primeira ordem de serviço.'), irCadastro);
      lista.append(vazio);
    }
    mensagem(mensagemLista, 'GET', statusHttp(resposta), 'Consulta concluída.', 'sucesso');
  } catch (erro) {
    contagem.textContent = 'Consulta indisponível';
    mostrarFalha(mensagemLista, 'GET', erro, resposta || erro.resposta);
    if (lista.childElementCount > 0) {
      mensagemLista.append(elemento('p', 'resultado-texto', 'A lista exibida pode estar desatualizada.'));
    }
  } finally {
    atualizar.disabled = false;
    atualizar.textContent = 'Atualizar lista';
    lista.setAttribute('aria-busy', 'false');
  }
}

formulario.addEventListener('submit', async evento => {
  evento.preventDefault();
  cadastrar.disabled = true;
  cadastrar.textContent = 'Cadastrando…';
  mensagem(mensagemForm, 'POST', 'Aguardando resposta', 'Enviando os dados da ordem…');
  const campos = new FormData(formulario);
  const valor = campos.get('valorEstimado');
  const dados = {
    veiculo: campos.get('veiculo'),
    descricao: campos.get('descricao'),
    servicoSolicitado: campos.get('servicoSolicitado'),
    valorEstimado: valor === '' ? null : Number(valor)
  };
  let resposta;
  try {
    const resultado = await requisitar({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
    resposta = resultado.resposta;
    const ordem = resultado.dados;
    if (!ordem || !Number.isInteger(ordem.id)) throw new Error('Não foi possível identificar a ordem na resposta. Atualize a lista antes de tentar novamente.');
    formulario.reset();
    mensagem(mensagemForm, 'POST', statusHttp(resposta), `Ordem #${ordem.id} cadastrada com sucesso.`, 'sucesso');
    await carregarOrdens();
  } catch (erro) {
    mostrarFalha(mensagemForm, 'POST', erro, resposta || erro.resposta);
  } finally {
    cadastrar.disabled = false;
    cadastrar.textContent = 'Cadastrar ordem';
  }
});

atualizar.addEventListener('click', carregarOrdens);
carregarOrdens();
