const listaOrdens = document.getElementById("lista-ordens");

// Desenha a tabela de ordens de serviço em andamento. Cada linha mostra cliente, placa,
// solicitação, status e conclusão, com os botões GERAR PDF e APAGAR daquela ordem.
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

        // O PDF é gerado novamente a partir dos dados já salvos desta ordem.
        const botaoPdf = document.createElement("button");
        botaoPdf.type = "button";
        botaoPdf.className = "botao-pdf-registro";
        botaoPdf.textContent = "GERAR PDF";
        botaoPdf.title = "Gerar PDF desta ordem de serviço";
        botaoPdf.addEventListener("click", (evento) => {
            evento.preventDefault();
            evento.stopPropagation();
            if (window.MimeticPDF) window.MimeticPDF.gerarOrdemServico(ordem);
        });
        botoes.appendChild(botaoPdf);

        // Exclusão individual: remove somente esta ordem, nunca todas de uma vez.
        const botaoApagar = document.createElement("button");
        botaoApagar.type = "button";
        botaoApagar.className = "botao-apagar-registro";
        botaoApagar.dataset.apagarOrdem = String(ordem.id ?? "");
        botaoApagar.textContent = "APAGAR";
        botaoApagar.title = "Apagar somente esta informação";
        botoes.appendChild(botaoApagar);

        colunaAcoes.appendChild(botoes);
        item.appendChild(colunaAcoes);
        listaOrdens.appendChild(item);
    });
}

// Busca as ordens na API e desenha a tabela. Clicar em uma linha define a
// "ordem atual" e abre o acompanhamento dela.
window.MimeticAPI.listarOrdens().then((ordens) => {
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
