// =========================================================
// TELA: CARTÃO
// Validações e máscaras apenas de front-end.
// O processamento real do cartão será feito pelo backend/gateway.
// =========================================================
//USER: Matheus Lino
const form = document.getElementById("form-cartao");
const campos = form.querySelectorAll("input[required], select[required]");
const numeroCartao = document.getElementById("numero-cartao");
const validade = document.getElementById("validade");
const cvv = document.getElementById("cvv");
const tituloTipoCartao = document.getElementById("titulo-tipo-cartao");

// Identifica visualmente a forma escolhida na tela anterior.
//USER: Matheus Lino
const formaPagamentoSelecionada = localStorage.getItem("mimeticFormaPagamento");
if (tituloTipoCartao) {
    const ehDebito = formaPagamentoSelecionada === "DÉBITO";
    tituloTipoCartao.textContent = ehDebito ? "DÉBITO" : "CRÉDITO";
    tituloTipoCartao.classList.toggle("titulo-debito", ehDebito);
    tituloTipoCartao.classList.toggle("titulo-credito", !ehDebito);
    document.body.classList.toggle("pagamento-debito", ehDebito);
    document.body.classList.toggle("pagamento-credito", !ehDebito);
}

// Destaca em vermelho um campo obrigatório que ficou vazio.
//USER: Matheus Lino
function marcarErro(campo) {
    campo.classList.add("campo-invalido");
    campo.closest(".campo").classList.add("com-erro");
}
// Remove o destaque de erro assim que o campo passa a ter conteúdo.
//USER: Matheus Lino
function limparErro(campo) {
    if (campo.value.trim()) {
        campo.classList.remove("campo-invalido");
        campo.closest(".campo").classList.remove("com-erro");
    }
}
campos.forEach(campo => {
    campo.addEventListener("input", () => limparErro(campo));
    campo.addEventListener("change", () => limparErro(campo));
});

numeroCartao.addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0,16).replace(/(\d{4})(?=\d)/g, "$1 ");
});
validade.addEventListener("input", function () {
    let v = this.value.replace(/\D/g, "").slice(0,4);
    if (v.length > 2) v = v.slice(0,2) + "/" + v.slice(2);
    this.value = v;
});
cvv.addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0,4);
});

form.addEventListener("submit", function (evento) {
    evento.preventDefault();
    let valido = true;
    campos.forEach(campo => {
        if (!campo.value.trim()) {
            marcarErro(campo);
            valido = false;
        }
    });
    if (!valido) return;

    // Nunca salvar dados brutos do cartão no banco: o gateway de pagamento deverá tokenizar.
    // Por enquanto só confirma o pagamento da ordem atual na API.
    window.MimeticTela.finalizarPagamento(formaPagamentoSelecionada || "CARTÃO");
});

// Valor vindo do orçamento informado na Ordem de Serviço.
// As parcelas são calculadas automaticamente a partir do valor real da ordem.
(async () => {
    // Converte um valor em formato brasileiro (ex.: "R$ 1.234,56") para número (1234.56).
    //USER: Matheus Lino
    function valorBrasileiroParaNumero(valor) {
        if (typeof valor === "number") return valor;
        return Number(
            String(valor || "0")
                .replace(/R\$/gi, "")
                .replace(/\s/g, "")
                .replace(/\./g, "")
                .replace(",", ".")
        ) || 0;
    }

    // Formata um número no padrão brasileiro com duas casas decimais (ex.: 1234,56).
    //USER: Matheus Lino
    function formatarMoeda(valor) {
        return valor.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    try {
        const ordem = await window.MimeticAPI.buscarOrdemAtual();
        const valorTotal = valorBrasileiroParaNumero(ordem?.orcamento);

        if (valorTotal > 0) {
            document.getElementById("total-cartao").textContent =
                `TOTAL A SER PAGO: R$ ${formatarMoeda(valorTotal)}`;

            const selectParcelamento = document.getElementById("parcelamento");
            const formaPagamento = localStorage.getItem("mimeticFormaPagamento");

            // Débito é pagamento à vista. No crédito, calcula automaticamente de 1x até 12x.
            if (formaPagamento === "DÉBITO") {
                selectParcelamento.innerHTML = `
                    <option value=""></option>
                    <option value="1">1x de R$ ${formatarMoeda(valorTotal)}</option>
                `;
            } else {
                selectParcelamento.innerHTML = '<option value=""></option>';
                for (let quantidade = 1; quantidade <= 12; quantidade++) {
                    const valorParcela = valorTotal / quantidade;
                    const option = document.createElement("option");
                    option.value = String(quantidade);
                    option.textContent = `${quantidade}x de R$ ${formatarMoeda(valorParcela)}`;
                    selectParcelamento.appendChild(option);
                }
            }
        }
    } catch (erro) {
        console.error("Não foi possível calcular o parcelamento do cartão.", erro);
    }
})();
