export class ErroValidacao extends Error {}

function texto(valor, campo, limite, obrigatorio = false) {
  if (valor === undefined || valor === null) {
    if (obrigatorio) throw new ErroValidacao(`${campo}: preenchimento obrigatório.`);
    return null;
  }
  if (typeof valor !== 'string') throw new ErroValidacao(`${campo} deve ser um texto.`);
  const limpo = valor.trim();
  if (obrigatorio && !limpo) throw new ErroValidacao(`${campo}: preenchimento obrigatório.`);
  if (limpo.length > limite) throw new ErroValidacao(`${campo} deve ter até ${limite} caracteres.`);
  return limpo || null;
}

function valorEmCentavos(valor) {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) {
    throw new ErroValidacao('Valor estimado deve ser um número maior ou igual a zero.');
  }
  const centavos = Math.round(valor * 100);
  if (!Number.isSafeInteger(centavos) || Math.abs(valor * 100 - centavos) > 0.000001) {
    throw new ErroValidacao('Valor estimado deve ter até duas casas decimais e estar no limite numérico seguro.');
  }
  return centavos;
}

export function criarOrdensService(repository) {
  return {
    cadastrar(dados) {
      if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
        throw new ErroValidacao('Envie um objeto JSON com os dados da ordem.');
      }
      const campos = ['veiculo', 'descricao', 'servicoSolicitado', 'valorEstimado'];
      if (Object.keys(dados).some(campo => !campos.includes(campo))) {
        throw new ErroValidacao('Campo desconhecido. Envie apenas veiculo, descricao, servicoSolicitado e valorEstimado.');
      }
      return repository.cadastrar({
        veiculo: texto(dados.veiculo, 'Veículo', 150, true),
        descricao: texto(dados.descricao, 'Descrição', 2000, true),
        servicoSolicitado: texto(dados.servicoSolicitado, 'Serviço solicitado', 200),
        valorCentavos: valorEmCentavos(dados.valorEstimado)
      });
    },
    listar() {
      return repository.listar();
    }
  };
}
