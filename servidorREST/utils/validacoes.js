// =========================================================
// VALIDAÇÕES COMPARTILHADAS DA API
// O front-end já valida os campos, mas o servidor SEMPRE precisa validar
// de novo: qualquer pessoa pode chamar a API sem passar pela tela.
// =========================================================

// Normaliza o e-mail: remove espaços e coloca em minúsculas.
// Assim "Ana@Email.com " e "ana@email.com" são tratados como o mesmo e-mail.
//userC: Vinicius Sanches
export function normalizarEmail(email) {
    return String(email ?? '').trim().toLowerCase();
}

// Retorna true se o texto tem formato de e-mail (algo@dominio.ext).
//userC: Vinicius Sanches
export function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Mesmas regras exibidas nas telas de cadastro e de nova senha:
// 8+ caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 símbolo.
// Retorna true quando a senha atende a todas.
//userC: Vinicius Sanches
export function senhaForte(senha) {
    const s = String(senha ?? '');
    return s.length >= 8
        && /[A-Z]/.test(s)
        && /[a-z]/.test(s)
        && /[0-9]/.test(s)
        && /[^A-Za-z0-9]/.test(s);
}

// Mensagem padrão devolvida quando a senha não cumpre as regras.
export const MENSAGEM_SENHA_FRACA =
    'A senha deve ter 8 caracteres ou mais, com letra maiúscula, minúscula, número e símbolo.';

// ---------------------------------------------------------
// VALIDAÇÕES USADAS PELAS ROTAS DE ORDENS DE SERVIÇO
// ---------------------------------------------------------

// Converte um valor recebido (texto ou número) em inteiro positivo.
// Devolve o número, ou null quando não for um inteiro maior que zero
// (usado para validar ids vindos da URL ou do corpo da requisição).
//userC: Vinicius Sanches
export function idValido(valor) {
    const n = Number(valor);
    return Number.isInteger(n) && n > 0 ? n : null;
}

// Confere se o texto é uma data real no formato AAAA-MM-DD (ex.: 2026-03-31).
// "2026-02-31" é recusada porque esse dia não existe.
//userC: Vinicius Sanches
export function dataISOValida(texto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(texto))) return false;
    const [ano, mes, dia] = String(texto).split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

// Confere se o valor é um dinheiro válido: número finito, não negativo e que
// cabe na coluna DECIMAL(10,2) do banco (até 99.999.999,99).
//userC: Vinicius Sanches
export function dinheiroValido(valor) {
    return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && valor <= 99999999.99;
}

// Recebe uma lista de [rótulo, valor, limite] e devolve a mensagem de erro do
// primeiro texto que passa do limite de caracteres da coluna; null se todos cabem.
// Evita que o MySQL recuse o INSERT com "Data too long" (erro 500 sem explicação).
//userC: Vinicius Sanches
export function primeiroCampoLongo(campos) {
    for (const [rotulo, valor, limite] of campos) {
        if (String(valor ?? '').length > limite) {
            return `${rotulo} deve ter no máximo ${limite} caracteres.`;
        }
    }
    return null;
}

// Converte a data vinda do banco em texto AAAA-MM-DD (ou null se não houver).
// O MySQL devolve colunas DATE como objeto Date; usamos a data local para não
// "voltar um dia" por causa de fuso horário.
//USER: Vinicius Sanches
//userC: Vinicius Sanches
export function dataISO(valor) {
    if (!valor) return null;
    if (valor instanceof Date) {
        const mes = String(valor.getMonth() + 1).padStart(2, '0');
        const dia = String(valor.getDate()).padStart(2, '0');
        return `${valor.getFullYear()}-${mes}-${dia}`;
    }
    return String(valor).slice(0, 10);
}

// Formato em que o CPF é guardado (o mesmo da máscara das telas): 000.000.000-00
//userC: Vinicius Sanches
export function formatarCpf(cpf) {
    const d = String(cpf ?? '').replace(/\D/g, '');
    return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : null;
}
