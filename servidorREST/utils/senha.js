// =========================================================
// SENHAS: HASH COM SCRYPT (módulo "crypto" do Node, nada para instalar)
//
// A senha NUNCA é guardada como o usuário digitou. No banco fica:
//     scrypt$<sal em hex>$<hash em hex>      (168 caracteres; a coluna é VARCHAR(255))
// O "sal" é aleatório e diferente em cada senha, então duas pessoas com a
// mesma senha têm hashes diferentes.
// =========================================================
import { scrypt, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

// Versão assíncrona: o scrypt é lento de propósito e não pode travar o servidor.
const scryptAsync = promisify(scrypt);

const PREFIXO = 'scrypt$';
const TAMANHO_HASH = 64;

// Gera o texto que vai para o banco a partir da senha digitada.
//userC: Vinicius Sanches
export async function hashSenha(senha) {
    const sal = randomBytes(16).toString('hex');
    const hash = await scryptAsync(String(senha), sal, TAMANHO_HASH);
    return `${PREFIXO}${sal}$${hash.toString('hex')}`;
}

// true se o valor guardado no banco já está no formato de hash acima.
// false = senha antiga, ainda em texto puro (guardada antes desta versão).
//userC: Vinicius Sanches
export function senhaJaEhHash(salvo) {
    return typeof salvo === 'string'
        && salvo.startsWith(PREFIXO)
        && salvo.split('$').length === 3;
}

// Compara a senha digitada com o valor guardado, em tempo constante.
// Aceita também senha antiga em texto puro (só para quem ainda não foi migrado);
// o /login troca esse valor por um hash assim que a pessoa entra.
//userC: Vinicius Sanches
export async function conferirSenha(senha, salvo) {
    const digitada = String(senha);

    if (!senhaJaEhHash(salvo)) {
        // Compara os SHA-256 (tamanho fixo) para poder usar timingSafeEqual.
        const a = createHash('sha256').update(digitada).digest();
        const b = createHash('sha256').update(String(salvo ?? '')).digest();
        return timingSafeEqual(a, b);
    }

    const [, sal, hashSalvo] = salvo.split('$');
    const esperado = Buffer.from(hashSalvo, 'hex');
    const calculado = await scryptAsync(digitada, sal, esperado.length || TAMANHO_HASH);
    return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}

// Hash de uma senha qualquer, usado quando o e-mail do login NÃO existe: o
// servidor faz a mesma conta e demora o mesmo tempo, para que o tempo de
// resposta não revele quais e-mails estão cadastrados.
export const HASH_FALSO = await hashSenha(randomBytes(16).toString('hex'));
