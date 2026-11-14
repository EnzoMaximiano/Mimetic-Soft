// =========================================================
// RECUPERAÇÃO DE SENHA: CÓDIGO DE 6 DÍGITOS
//
// Fluxo: a pessoa informa o e-mail -> o servidor gera um código, guarda só o
// "hash" dele (tabela recuperacao_senha) e o envia por e-mail -> a pessoa
// digita o código na tela de nova senha. O código vale poucos minutos, só pode
// ser usado uma vez e é bloqueado depois de algumas tentativas erradas.
// =========================================================
import { randomInt, createHmac, timingSafeEqual } from 'node:crypto';
import { segredoDoToken } from './auth.js';

export const MINUTOS_VALIDADE_CODIGO = 15;
export const MAX_TENTATIVAS_CODIGO = 5;

// Sorteia um código de 6 dígitos (com zeros à esquerda, ex.: "004821").
//userC: Vinicius Sanches
export function gerarCodigo() {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

// Hash do código (HMAC com o segredo do servidor). Se alguém copiar a tabela,
// não consegue descobrir os códigos só com o banco.
//userC: Vinicius Sanches
export function hashCodigo(codigo) {
    return createHmac('sha256', segredoDoToken()).update(String(codigo)).digest('hex');
}

// Compara o código digitado com o hash guardado, em tempo constante.
//userC: Vinicius Sanches
export function codigoConfere(codigo, hashSalvo) {
    const a = Buffer.from(hashCodigo(codigo), 'hex');
    const b = Buffer.from(String(hashSalvo ?? ''), 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
}

// ---------------------------------------------------------
// ENVIO DO CÓDIGO POR E-MAIL
// *** AINDA NÃO ENVIA E-MAIL DE VERDADE ***  O projeto não tem servidor de
// e-mail configurado. Em desenvolvimento o código aparece no CONSOLE do
// servidor. Em produção (NODE_ENV=production) ele NÃO é impresso: só um aviso.
// Para ligar o envio real, troque o corpo desta função (ex.: nodemailer com
// SMTP); o restante do fluxo não muda.
// ---------------------------------------------------------
//userC: Vinicius Sanches
export async function enviarCodigoRecuperacao(email, codigo) {
    if (process.env.NODE_ENV === 'production') {
        console.warn('[RECUPERAÇÃO DE SENHA] Envio de e-mail não configurado: o código NÃO foi enviado.');
        return;
    }
    console.log(`[RECUPERAÇÃO DE SENHA - DESENVOLVIMENTO] Código para ${email}: ${codigo} `
        + `(vale ${MINUTOS_VALIDADE_CODIGO} minutos). Envio por e-mail ainda não configurado.`);
}
