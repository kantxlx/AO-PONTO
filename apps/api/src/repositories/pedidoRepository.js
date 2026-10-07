import pg from 'pg';
import { config } from '../config.js';

const pool = new pg.Pool({
  connectionString: config.databaseUrl
});

export async function salvarPedidoComSenha(pedido) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Gera e salva a senha
    const resSenha = await client.query(
      `INSERT INTO senhas (status, data_geracao)
       VALUES ($1, NOW())
       RETURNING numero`,
      ['PENDENTE']
    );

    const numeroSenha = resSenha.rows[0].numero;

    // 2. Salva o pedido vinculando com a senha
    await client.query(
      `INSERT INTO pedidos (
        id,
        numero_senha,
        status,
        presencial,
        data_criacao
      )
      VALUES ($1, $2, $3, $4, NOW())`,
      [
        pedido.id,
        numeroSenha,
        pedido.status,
        pedido.presencial
      ]
    );

    // 3. Salva os itens do pedido
    for (const item of pedido.itens) {
      await client.query(
        `INSERT INTO itens_pedido (
          pedido_id,
          corte_id,
          quantidade,
          unidade_medida
        )
        VALUES ($1, $2, $3, $4)`,
        [
          pedido.id,
          item.corte,
          item.quantidade,
          item.unidadeMedida
        ]
      );
    }

    await client.query('COMMIT');

    return numeroSenha;
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}