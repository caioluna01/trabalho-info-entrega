export function representarOrdem(registro) {
  return {
    id: registro.id,
    veiculo: registro.veiculo,
    descricao: registro.descricao,
    servicoSolicitado: registro.servico_solicitado,
    valorEstimado: registro.valor_estimado_centavos === null
      ? null : registro.valor_estimado_centavos / 100,
    status: registro.status,
    criadaEm: registro.criada_em
  };
}
