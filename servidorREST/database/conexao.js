// =========================================================
// CONEXÃO DO SERVIDOR COM O BANCO DE DADOS MYSQL
// Cria um "pool" de conexões reaproveitáveis. As credenciais NÃO ficam
// no código: são lidas do arquivo .env (copie o .env.example para .env).
// O navegador nunca acessa o MySQL diretamente; ele fala com a API,
// e somente a API usa esta conexão.
// =========================================================
//USER: Vinicius Sanches

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Carrega as variáveis do arquivo .env para process.env
dotenv.config();

// "connection" é o pool usado em todas as rotas: connection.query(sql, [parametros])
export const connection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
});
