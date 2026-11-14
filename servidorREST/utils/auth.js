// =========================================================
// AUTENTICAÇÃO DAS ROTAS
//
// O /login devolve um token. O front-end o envia em todas as chamadas no
// cabeçalho   Authorization: Bearer <token>   e o servidor, pelo middleware
// "exigirLogin", descobre QUEM está chamando. Quem a rota deve considerar
// "o funcionário" é sempre req.funcionario.id (vindo do token), nunca um id
// enviado no corpo da requisição.
//
// Configuração no .env:
//   JWT_SECRET         segredo que assina os tokens (mínimo 16 caracteres; use 64+).
//                      Gerar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//   JWT_EXPIRA_HORAS   validade do token em horas (padrão 12)
// =========================================================
import { randomBytes } from 'node:crypto';
import { criarToken, verificarToken } from './token.js';

let segredo = null;

// Define o segredo que assina os tokens. Chamada uma vez na subida do servidor.
// Sem JWT_SECRET válido no .env, gera um segredo TEMPORÁRIO: o servidor funciona,
// mas todo mundo precisa logar de novo cada vez que ele reinicia.
//userC: Vinicius Sanches
export function garantirSegredoDoToken() {
    const doEnv = process.env.JWT_SECRET;
    if (doEnv && doEnv.length >= 16) {
        segredo = doEnv;
    } else {
        segredo = randomBytes(32).toString('hex');
        console.warn('[AVISO] JWT_SECRET ausente ou curto demais no .env: usando um segredo temporário. '
            + 'Os logins serão perdidos a cada reinício. Defina JWT_SECRET (veja .env.example).');
    }
    return segredo;
}

//userC: Vinicius Sanches
export function segredoDoToken() {
    return segredo ?? garantirSegredoDoToken();
}

// Validade do token, em horas.
//userC: Vinicius Sanches
function horasDeValidade() {
    const horas = Number(process.env.JWT_EXPIRA_HORAS);
    return Number.isFinite(horas) && horas > 0 ? horas : 12;
}

// Cria o token do funcionário que acabou de fazer login (linha da tabela funcionario).
//userC: Vinicius Sanches
export function criarTokenFuncionario(funcionario) {
    return criarToken({ sub: funcionario.id_funcionario }, segredoDoToken(), Math.round(horasDeValidade() * 3600));
}

// Middleware: deixa passar só quem envia um token válido. Coloca o id do
// funcionário em req.funcionario.id. Caso contrário responde 401.
//userC: Vinicius Sanches
export function exigirLogin(req, res, next) {
    const [tipo, token] = (req.get('Authorization') || '').split(' ');

    if (tipo !== 'Bearer' || !token) {
        return res.status(401).json({ erro: 'Faça login para continuar.' });
    }

    const dados = verificarToken(token, segredoDoToken());
    if (!dados || !Number.isInteger(dados.sub)) {
        return res.status(401).json({ erro: 'Sessão expirada ou inválida. Faça login novamente.' });
    }

    req.funcionario = { id: dados.sub };
    next();
}
