// Tela principal: cada card de atalho abre a tela correspondente.
const ROTAS_ATALHOS = {
  ordens: "tela-ordem-servico.html",
  andamento: "tela-servicos-andamento.html",
  cliente: "tela-cadastro-cliente.html",
  historico: "tela-historico-veiculo.html",
  gestao: "tela-painel-gestao.html",
  pagamentos: "tela-pagamento.html"
};

//userC: Vinicius Sanches
document.querySelectorAll(".card-atalho").forEach((card) => {
  card.addEventListener("click", (evento) => {
    evento.preventDefault();
    location.href = ROTAS_ATALHOS[card.dataset.destino] || card.getAttribute("href");
  });
});
