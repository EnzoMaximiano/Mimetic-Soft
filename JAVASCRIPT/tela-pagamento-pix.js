// =========================================================
// TELA: PAGAMENTO PIX
// Contador apenas visual no front-end.
// O backend deverá gerar o QR Code PIX real e controlar sua validade.
// =========================================================

//USER: Matheus Lino
const contador = document.getElementById("contador");
let segundosRestantes = (29 * 60) + 45;

// A cada segundo diminui o tempo restante e mostra no formato MM:SS; ao chegar em zero, para o contador.
//USER: Matheus Lino
const intervalo = setInterval(function () {
  if (segundosRestantes <= 0) {
    clearInterval(intervalo);
    contador.textContent = "00:00";
    return;
  }

  segundosRestantes--;
  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = segundosRestantes % 60;
  contador.textContent =
    String(minutos).padStart(2, "0") + ":" +
    String(segundos).padStart(2, "0");
}, 1000);

//userC: Vinicius Sanches
document.getElementById("botao-confirmar-pix").addEventListener("click", () => window.MimeticTela.finalizarPagamento("PIX"));

// Valor vindo do orçamento informado na Ordem de Serviço.
//USER: Matheus Lino
(async () => {
  // Mostra na tela o valor do orçamento da ordem de serviço atual (buscada na API).
  try {
    const ordem = await window.MimeticAPI.buscarOrdemAtual();
    if (ordem?.orcamento) document.getElementById('valor-pix').textContent = `R$ ${ordem.orcamento}`;
  } catch (erro) { console.error('Não foi possível carregar o valor da ordem.', erro); }
})();
