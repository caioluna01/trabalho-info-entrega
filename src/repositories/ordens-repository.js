import { representarOrdem } from '../models/ordem.js';

export function criarOrdensRepository(banco) {
  const inserir = banco.prepare(`
    INSERT INTO ordens (veiculo, descricao, servico_solicitado, valor_estimado_centavos)
    VALUES (?, ?, ?, ?) RETURNING *
  `);
  const consultar = banco.prepare('SELECT * FROM ordens ORDER BY id DESC');

  return {
    cadastrar(ordem) {
      return representarOrdem(inserir.get(
        ordem.veiculo, ordem.descricao, ordem.servicoSolicitado, ordem.valorCentavos
      ));
    },
    listar() {
      return consultar.all().map(representarOrdem);
    }
  };
}
