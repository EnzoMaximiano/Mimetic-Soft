// =========================================================
// MIMETIC SOFT - SERVIDOR REST (Node + Express + MySQL)
//
// COMO RODAR (dentro da pasta servidorREST):
//   1) npm install
//   2) copiar .env.example para .env e ajustar os dados do MySQL
//   3) npm start          (ou: node --watch server.js)
//
// ROTAS DISPONÍVEIS NESTA VERSÃO:
//   GET    /                              -> teste rápido: o servidor está no ar?
//   POST   /login                         -> autentica um FUNCIONÁRIO e devolve o token
//   POST   /funcionarios                  -> cadastra funcionário (público por enquanto)
//   GET    /funcionarios            [token] -> lista funcionários
//   PUT    /funcionarios/:id        [token] -> atualiza o PRÓPRIO cadastro
//   DELETE /funcionarios/:id        [token] -> remove o PRÓPRIO cadastro
//   POST   /recuperar-senha/solicitar     -> gera e envia o código de recuperação
//   PUT    /recuperar-senha/redefinir     -> troca a senha usando o código
//   POST   /ordens                  [token] -> cria ordem de serviço (com os serviços)
//   GET    /ordens                  [token] -> lista ordens (filtros opcionais ?placa= e ?cpf=)
//   GET    /ordens/:id              [token] -> busca uma ordem
//   PUT    /ordens/:id              [token] -> atualiza status / etapa / previsão
//   PUT    /ordens/:id/pagamento    [token] -> confirma o pagamento da ordem
//   DELETE /ordens/:id              [token] -> remove a ordem
//   GET    /painel                  [token] -> indicadores do painel de gestão
//
// [token] = exige o cabeçalho  Authorization: Bearer <token>  (devolvido pelo /login).
//
// IMPORTANTE: o login e o cadastro tratam apenas FUNCIONÁRIOS. Clientes são
// outro cadastro, feito por um funcionário, e não fazem login. A API de
// clientes ainda NÃO existe (continuam no localStorage do navegador); por isso
// a ordem de serviço guarda os dados do cliente nela mesma (veja o README).
// =========================================================
//USER: Vinicius Sanches

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { garantirSegredoDoToken } from './utils/auth.js';
import funcionarios from './routes/funcionarios.js';
import clientes from './routes/clientes.js';
import ordens from './routes/ordens.js';

// Lê as configurações do arquivo .env (porta, banco de dados etc.)
dotenv.config();

// Define o segredo que assina os tokens de login (JWT_SECRET no .env)
garantirSegredoDoToken();

const app = express();
const PORT = process.env.PORT || 3000;

// Libera o acesso do navegador (front-end em outra porta, ex.: Live Server 5501)
app.use(cors());
// Faz o servidor entender corpos de requisição em JSON (req.body)
app.use(express.json());

// Teste rápido: abrir http://localhost:3000 no navegador confirma que o servidor está no ar.
app.get('/', (req, res) => {
    res.json({ status: 'ok', servico: 'MIMETIC SOFT - servidorREST' });
});

// Rotas (cada arquivo em routes/ cuida de um assunto)
app.use(funcionarios);
app.use(clientes);
app.use(ordens);

// ---------------------------------------------------------
// TRATAMENTO DE ERROS GERAIS
// Garante que até um JSON malformado receba resposta em JSON (não em HTML).
// ---------------------------------------------------------
//USER: Vinicius Sanches
//userC: Vinicius Sanches
app.use((erro, req, res, next) => {
    console.error(erro);
    const status = erro.status || 500;
    res.status(status).json({
        erro: status === 400 ? 'Requisição inválida.' : 'Erro interno do servidor.',
    });
});

// Inicia o servidor e mostra no console em qual porta ele está escutando
app.listen(PORT, () => {
    console.log(`Servidor MIMETIC SOFT rodando em http://localhost:${PORT}`);
    // Mostra de qual pasta o servidor está rodando (ajuda a achar um servidor antigo esquecido aberto)
    console.log(`Pasta do servidor: ${process.cwd()}`);
});
