// =========================================================
// MIGRAÇÃO ÚNICA: converte senhas em TEXTO PURO para HASH
//
// Rode uma vez, DEPOIS de rodar o migracao-ordens.sql:
//     cd servidorREST
//     node scripts/migrar-senhas.js
//
// Só mexe em quem ainda está em texto puro; quem já tem hash fica como está,
// então pode ser executado mais de uma vez sem problema.
// (Mesmo sem rodar este script, o /login converte a senha de cada pessoa na
// primeira vez que ela entra; o script serve para converter todo mundo de uma vez.)
// =========================================================
import { connection } from '../database/conexao.js';
import { hashSenha, senhaJaEhHash } from '../utils/senha.js';

try {
    const [funcionarios] = await connection.query('SELECT id_funcionario, senha FROM Funcionario');
    const pendentes = funcionarios.filter(f => !senhaJaEhHash(f.senha));

    for (const f of pendentes) {
        await connection.query(
            'UPDATE Funcionario SET senha = ? WHERE id_funcionario = ?',
            [await hashSenha(f.senha), f.id_funcionario]
        );
    }

    console.log(`Funcionários: ${funcionarios.length} | convertidos agora: ${pendentes.length} | já estavam com hash: ${funcionarios.length - pendentes.length}`);
} catch (erro) {
    console.error('Falha na migração das senhas:', erro.message);
    process.exitCode = 1;
} finally {
    await connection.end();
}
