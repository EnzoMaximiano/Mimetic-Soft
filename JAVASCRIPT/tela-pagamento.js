//USER: Matheus Lino
const botoes = document.querySelectorAll(".forma-pagamento");
const erro = document.getElementById("erro-pagamento");
let formaSelecionada = "";

// Cada forma de pagamento abre diretamente a tela correspondente.
const rotasPagamento = {
  "PIX": "tela-pagamento-pix.html",
  "DÉBITO": "tela-cartao.html",
  "CRÉDITO": "tela-cartao.html",
  "BOLETO": "tela-boleto.html"
};

botoes.forEach((botao) => {
  botao.addEventListener("click", () => {
    formaSelecionada = botao.dataset.pagamento;
    localStorage.setItem("mimeticFormaPagamento", formaSelecionada);
    erro.classList.remove("visivel");

    const destino = rotasPagamento[formaSelecionada];
    if (destino) window.location.href = destino;
  });
});

// O resumo usa exatamente o orçamento informado na Ordem de Serviço.
// Enquanto o backend/MySQL não estiver integrado, a ordem atual é lida do localStorage.
// Mostra nos campos de resumo (produto, subtotal e total) o orçamento da ordem de serviço atual.
//USER: Matheus Lino
async function carregarResumoDoPedido() {
  try {
    const ordem = await window.MimeticAPI.buscarOrdemAtual();
    const valor = ordem?.orcamento ? `R$ ${ordem.orcamento}` : "R$ 0,00";

    document.getElementById("valor-produto").textContent = valor;
    document.getElementById("valor-subtotal").textContent = valor;
    document.getElementById("valor-total").textContent = valor;
  } catch (erro) {
    console.error("Não foi possível carregar o orçamento da ordem de serviço.", erro);
  }
}

carregarResumoDoPedido();
