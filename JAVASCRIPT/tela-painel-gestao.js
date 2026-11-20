/*
  PAINEL DE GESTÃO (somente leitura).
  Os indicadores são calculados pelo banco (rota GET /painel) e refletem as
  ordens do funcionário logado. O tempo médio é o tempo entre o pagamento
  confirmado e o clique em CONCLUIR, das ordens concluídas no mês.
*/
// Preenche o painel com os indicadores recebidos (serviços do mês, tempo médio, comparativos,
// serviços mais solicitados e previsão de demandas). Campos ausentes em "dados" são ignorados.
//USER: Matheus Lino
function atualizarPainel(dados) {
    if (!dados) return;

    if (dados.servicosMes != null) {
        document.getElementById("servicos-mes").textContent = dados.servicosMes;
    }

    if (dados.tempoMedio) {
        document.getElementById("tempo-medio").textContent = dados.tempoMedio;
    }

    if (dados.comparativoServicos) {
        document.getElementById("comparativo-servicos").textContent = dados.comparativoServicos;
    }

    if (dados.comparativoTempo) {
        document.getElementById("comparativo-tempo").textContent = dados.comparativoTempo;
    }

    if (Array.isArray(dados.servicosSolicitados)) {
        document.getElementById("servicos-solicitados").innerHTML =
            dados.servicosSolicitados.map(escaparHtml).join("<br>");
    }

    if (Array.isArray(dados.previsaoDemandas)) {
        document.getElementById("previsao-demandas").innerHTML =
            dados.previsaoDemandas.map(escaparHtml).join("<br>");
    }
}

// Converte um texto em HTML seguro (escapa <, > e &), evitando que conteúdo digitado vire código na página.
//USER: Matheus Lino
function escaparHtml(valor) {
    const elemento = document.createElement("div");
    elemento.textContent = valor ?? "";
    return elemento.innerHTML;
}

// Texto que compara as ordens do mês atual com as do mês anterior.
//userC: Vinicius Sanches
function comparativoDoMes(atual, anterior, total) {
    if (!total) return "Nenhum serviço registrado.";
    if (!anterior) return atual ? "Sem serviços no mês passado para comparar." : "Nenhum serviço registrado neste mês.";
    const pct = Math.round(((atual - anterior) / anterior) * 100);
    if (pct > 0) return `${pct}% a mais que mês passado.`;
    if (pct < 0) return `${Math.abs(pct)}% a menos que mês passado.`;
    return "Igual ao mês passado.";
}

// Escreve uma duração em segundos como "4h e 35min", "2d 3h e 10min", "12min" ou "45s".
//userC: Vinicius Sanches
function formatarDuracao(segundos) {
    if (segundos < 60) return `${segundos}s`;
    const minutosTotais = Math.round(segundos / 60);
    const partes = [];
    const dias = Math.floor(minutosTotais / 1440);
    const horas = Math.floor((minutosTotais % 1440) / 60);
    const minutos = minutosTotais % 60;
    if (dias) partes.push(`${dias}d`);
    if (horas) partes.push(`${horas}h`);
    if (minutos || !partes.length) partes.push(`${minutos}min`);
    return partes.length > 1 ? `${partes.slice(0, -1).join(" ")} e ${partes[partes.length - 1]}` : partes[0];
}

// Texto que compara o tempo médio do mês atual com o do mês anterior.
//userC: Vinicius Sanches
function comparativoDoTempo(atual, anterior) {
    if (atual == null) return "Nenhum serviço concluído neste mês.";
    if (!anterior) return "Sem serviços concluídos no mês passado para comparar.";
    const pct = Math.round(((atual - anterior) / anterior) * 100);
    if (pct > 0) return `${pct}% a mais que mês passado.`;
    if (pct < 0) return `${Math.abs(pct)}% a menos que mês passado.`;
    return "Igual ao mês passado.";
}

// Enquanto a API responde, não mostra os números de exemplo do protótipo.
atualizarPainel({ servicosMes: "...", comparativoServicos: "Carregando...", tempoMedio: "...", comparativoTempo: "Carregando...", servicosSolicitados: ["..."], previsaoDemandas: ["..."] });

window.MimeticAPI.buscarPainel().then((painel) => {
    const nomes = painel.servicosSolicitados.map(s => s.nome);
    atualizarPainel({
        servicosMes: painel.servicosMes,
        comparativoServicos: comparativoDoMes(painel.servicosMes, painel.servicosMesAnterior, painel.totalOrdens),
        tempoMedio: painel.tempoMedioSegundos == null ? "Sem dados" : formatarDuracao(painel.tempoMedioSegundos),
        comparativoTempo: comparativoDoTempo(painel.tempoMedioSegundos, painel.tempoMedioMesAnteriorSegundos),
        servicosSolicitados: nomes.length ? nomes : ["Nenhum serviço registrado"],
        previsaoDemandas: nomes.length ? nomes : ["Sem dados suficientes"]
    });
}).catch((erro) => {
    window.MimeticTela.avisarErro(erro);
    atualizarPainel({ servicosMes: "-", comparativoServicos: "Não foi possível carregar os dados.", tempoMedio: "-", comparativoTempo: "Não foi possível carregar os dados.", servicosSolicitados: ["-"], previsaoDemandas: ["-"] });
});
