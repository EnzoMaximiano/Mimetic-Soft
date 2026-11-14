const progresso = document.getElementById("progresso");
const etapas = [...document.querySelectorAll(".etapa")];

/*
 STATUS DO VEÍCULO:
 Use valores de 1 a 4.
 1 = Aguardando confirmação de pagamento
 2 = Veículo em diagnóstico
 3 = Veículo em manutenção
 4 = Manutenção concluída

 INTEGRAÇÃO FUTURA COM BACKEND / MYSQL:
 O backend deverá devolver a etapa atual do serviço.
 Depois, basta passar esse número para atualizarEtapa().
 Não conectar o navegador diretamente ao MySQL.
*/
// Marca no indicador de progresso em qual etapa (1 a 4) o veículo está:
// as anteriores ficam "concluídas" e a etapa informada fica "atual".
// Valores fora do intervalo são ajustados para o limite mais próximo.
//USER: Matheus Lino
function atualizarEtapa(numeroEtapa) {
    const etapaAtual = Math.min(Math.max(Number(numeroEtapa) || 1, 1), etapas.length);

    progresso.dataset.etapa = etapaAtual;
    progresso.style.setProperty("--etapa-atual", etapaAtual);

    etapas.forEach((etapa, indice) => {
        const numero = indice + 1;
        etapa.classList.toggle("concluida", numero < etapaAtual);
        etapa.classList.toggle("atual", numero === etapaAtual);
    });
}

// Mostra a etapa da ordem selecionada (buscada na API); sem ordem, fica na etapa 1.
atualizarEtapa(1);
window.MimeticAPI.buscarOrdemAtual()
    .then(ordem => { if (ordem) atualizarEtapa(ordem.etapa || 1); })
    .catch(window.MimeticTela.avisarErro);
