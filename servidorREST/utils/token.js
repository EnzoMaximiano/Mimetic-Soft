// =========================================================
// TOKEN DE LOGIN (JWT HS256 feito com o módulo "crypto" do Node)
//
// Formato padrão:  cabecalho.dados.assinatura   (cada parte em base64url)
// A assinatura (HMAC-SHA256 com o segredo do servidor) impede que alguém
// invente ou altere um token no navegador: sem o segredo não dá para assinar.
// =========================================================
import { createHmac, timingSafeEqual } from 'node:crypto';

const CABECALHO = { alg: 'HS256', typ: 'JWT' };

//userC: Vinicius Sanches
const emBase64Url = objeto => Buffer.from(JSON.stringify(objeto)).toString('base64url');

//userC: Vinicius Sanches
function assinar(texto, segredo) {
    return createHmac('sha256', segredo).update(texto).digest();
}

// Cria um token com os dados informados (ex.: { sub: 3 }) que vale por
// "validadeEmSegundos". Os campos iat (emitido em) e exp (expira em) são
// acrescentados automaticamente.
//userC: Vinicius Sanches
export function criarToken(dados, segredo, validadeEmSegundos) {
    const agora = Math.floor(Date.now() / 1000);
    const corpo = { ...dados, iat: agora, exp: agora + validadeEmSegundos };
    const texto = `${emBase64Url(CABECALHO)}.${emBase64Url(corpo)}`;
    return `${texto}.${assinar(texto, segredo).toString('base64url')}`;
}

// Confere um token. Devolve os dados dele quando a assinatura está certa e ele
// não expirou; devolve null em qualquer outro caso (nunca lança erro).
//userC: Vinicius Sanches
export function verificarToken(token, segredo) {
    try {
        const partes = String(token).split('.');
        if (partes.length !== 3) return null;
        const [cabecalhoTxt, corpoTxt, assinaturaTxt] = partes;

        // Só aceita HS256 (recusa "alg: none" e outras trocas de algoritmo).
        const cabecalho = JSON.parse(Buffer.from(cabecalhoTxt, 'base64url').toString('utf8'));
        if (cabecalho.alg !== 'HS256') return null;

        const esperada = assinar(`${cabecalhoTxt}.${corpoTxt}`, segredo);
        const recebida = Buffer.from(assinaturaTxt, 'base64url');
        if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) return null;

        const corpo = JSON.parse(Buffer.from(corpoTxt, 'base64url').toString('utf8'));
        if (!Number.isFinite(corpo.exp) || corpo.exp <= Math.floor(Date.now() / 1000)) return null;
        return corpo;
    } catch (erro) {
        return null;
    }
}
