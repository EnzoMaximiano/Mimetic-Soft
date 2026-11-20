const listaOrdens = document.getElementById("lista-ordens");

// Status que não aparecem nesta tela (ver routes/ordens.js).
const STATUS_CONCLUIDA = "Concluída";
const STATUS_CANCELADA = "Cancelada";

// Desenha a tabela de ordens de serviço em andamento. Cada linha mostra cliente, placa,
// solicitação, status e conclusão, com os botões da ordem, copiados do <template id="modelo-botoes-ordem"> do HTML.
//USER: Matheus Lino
function exibirOrdens(ordens) {
    listaOrdens.innerHTML = "";

    ordens.forEach((ordem) => {
        const item = document.createElement("article");
        item.className = "ordem";

        const campos = [
            ["cliente", ordem.cliente],
            ["placa", ordem.placa],
            ["solicitacao", ordem.solicitacao],
            ["status", ordem.status]
        ];

        campos.forEach(([classe, valor]) => {
            const span = document.createElement("span");
            span.className = classe;
            span.textContent = valor ?? "";
            item.appendChild(span);
        });

        // A última coluna mantém a conclusão e as ações individuais da ordem.
        const colunaAcoes = document.createElement("div");
        colunaAcoes.className = "coluna-acoes-registro";

        const conclusao = document.createElement("span");
        conclusao.className = "conclusao";
        conclusao.textContent = ordem.conclusao ?? "";
        colunaAcoes.appendChild(conclusao);

        const botoes = document.createElement("div");
        botoes.className = "acoes-registro";

        // Os botões vêm do <template> do HTML. Cada um só aparece nos status listados em
        // data-aparece-em, e recebe o id desta ordem para o app-core.js tratar o clique.
        const modelo = document.getElementById("modelo-botoes-ordem");
        modelo.content.querySelectorAll("button").forEach((modeloBotao) => {
            const statusPermitidos = modeloBotao.dataset.apareceEm;
            if (statusPermitidos && !statusPermitidos.split("|").includes(ordem.status)) return;

            const botao = modeloBotao.cloneNode(true);
            const id = String(ordem.id ?? "");
            switch (botao.dataset.acao) {
                case "pdf":
                    // O PDF é gerado novamente a partir dos dados já salvos desta ordem.
                    botao.addEventListener("click", (evento) => {
                        evento.preventDefault();
                        evento.stopPropagation();
                        if (window.MimeticPDF) window.MimeticPDF.gerarOrdemServico(ordem);
                    });
                    break;
                case "confirmar-pagamento": botao.dataset.confirmarPagamento = id; break;
                case "concluir": botao.dataset.concluirOrdem = id; break;
                case "cancelar": botao.dataset.cancelarOrdem = id; break;
            }
            botoes.appendChild(botao);
        });

        colunaAcoes.appendChild(botoes);
        item.appendChild(colunaAcoes);
        listaOrdens.appendChild(item);
    });
}

// Busca as ordens na API e desenha só as que estão em andamento (concluídas e canceladas
// continuam no banco e aparecem no histórico do veículo). Clicar em uma linha define a
// "ordem atual" e abre o acompanhamento dela.
window.MimeticAPI.listarOrdens().then((todas) => {
    const ordens = todas.filter((o) => o.status !== STATUS_CONCLUIDA && o.status !== STATUS_CANCELADA);
    exibirOrdens(ordens);
    document.querySelectorAll(".ordem").forEach((linha, i) => {
        linha.style.cursor = "pointer";
        linha.title = "Abrir acompanhamento";
        linha.addEventListener("click", () => {
            localStorage.setItem("mimeticOrdemAtual", String(ordens[i].id));
            location.href = "tela-acompanhamento.html";
        });
    });
}).catch(window.MimeticTela.avisarErro);
