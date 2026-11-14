// =========================================================
// TELA: BOLETO
// Protótipo front-end. O boleto bancário real será gerado
// futuramente pelo backend integrado ao banco/gateway.
// =========================================================
const codigo = document.getElementById("codigo-boleto");
const botaoCopiar = document.getElementById("botao-copiar");
const mensagemCopiado = document.getElementById("mensagem-copiado");
const emailBoleto = document.getElementById("email-boleto");
const valorBoleto = document.getElementById("valor-boleto");

// Devolve a ordem de serviço que está sendo paga agora, buscada na API.
// Devolve null se não houver ordem atual ou se a API não responder.
//USER: Matheus Lino
async function obterOrdemAtual() {
    try {
        return await window.MimeticAPI.buscarOrdemAtual();
    } catch (erro) {
        console.error("Não foi possível carregar a ordem atual.", erro);
        return null;
    }
}

// Gera somente uma linha digitável DEMONSTRATIVA para o protótipo.
// Não representa um boleto bancário válido. No sistema real, esse valor
// deverá vir da API do banco/gateway de pagamentos.
//USER: Matheus Lino
function gerarCodigoDemonstrativo(ordem) {
    const id = String(ordem?.id || Date.now()).replace(/\D/g, "");
    const valor = String(ordem?.orcamento || "0").replace(/\D/g, "");
    const cpf = String(ordem?.cpf || "").replace(/\D/g, "");
    const base = (id + valor + cpf + "00190500954014481606906809350314337370000000100")
        .padEnd(47, "0")
        .slice(0, 47);
    return `${base.slice(0,5)}.${base.slice(5,10)} ${base.slice(10,15)}.${base.slice(15,21)} ${base.slice(21,26)}.${base.slice(26,32)} ${base.slice(32,33)} ${base.slice(33)}`;
}

// Preenche a tela com o e-mail do cliente, o valor e a linha digitável do boleto (executa assim que a tela abre).
//USER: Matheus Lino
(async function preencherDadosDoBoleto() {
    const ordem = await obterOrdemAtual();
    if (!ordem) {
        emailBoleto.textContent = "E-mail não informado";
        codigo.value = gerarCodigoDemonstrativo(null);
        return;
    }

    // O e-mail vem da própria Ordem de Serviço. Como a OS preenche os dados
    // do cliente cadastrado pelo CPF, cada cliente exibe seu respectivo e-mail.
    let email = (ordem.email || "").trim();
    if (!email && ordem.cpf) {
        try {
            const cliente = await window.MimeticAPI.buscarClientePorCpf(ordem.cpf);
            email = (cliente?.email || "").trim();
        } catch (erro) {
            console.error("Não foi possível buscar o e-mail do cliente.", erro);
        }
    }
    emailBoleto.textContent = email || "E-mail não informado";

    if (ordem.orcamento) valorBoleto.textContent = `R$ ${ordem.orcamento}`;
    codigo.value = gerarCodigoDemonstrativo(ordem);
})();

//USER: Matheus Lino
botaoCopiar.addEventListener("click", async function () {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(codigo.value);
        } else {
            codigo.select();
            codigo.setSelectionRange(0, 99999);
            document.execCommand("copy");
            codigo.setSelectionRange(0, 0);
        }
        mensagemCopiado.classList.add("visivel");
        setTimeout(() => mensagemCopiado.classList.remove("visivel"), 1800);
    } catch {
        mensagemCopiado.textContent = "Selecione e copie o código manualmente.";
        mensagemCopiado.classList.add("visivel");
    }
});

//USER: Matheus Lino
//userC: Vinicius Sanches
document.getElementById("botao-confirmar").addEventListener("click", function () {
    // INTEGRAÇÃO FUTURA: consultar/confirmar o boleto real pelo backend.
    window.MimeticTela.finalizarPagamento("BOLETO");
});
