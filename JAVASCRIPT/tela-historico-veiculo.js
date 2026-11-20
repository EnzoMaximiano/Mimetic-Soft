const formulario = document.getElementById("form-historico");
const campos = [...formulario.querySelectorAll("[required]")];
const placa = document.getElementById("placa");

// Marca o campo como inválido quando está vazio (se mostrarErro for true).
// Devolve true se o campo está preenchido.
//USER: Matheus Lino
function validarCampo(campo, mostrarErro = true) {
    const grupo = campo.closest(".grupo-campo");
    const vazio = campo.value.trim() === "";
    grupo.classList.toggle("invalido", mostrarErro && vazio);
    return !vazio;
}

campos.forEach(campo => {
    campo.addEventListener("input", () => validarCampo(campo, true));
    campo.addEventListener("change", () => validarCampo(campo, true));
});

window.MimeticTela.mascaraPlaca(placa);


// Desenha na tela a lista de serviços encontrados. Cada item pode ser um texto simples
// ou um objeto { id, texto }; objetos com id ganham o botão CANCELAR daquela ordem.
//USER: Matheus Lino
function exibirServicos(servicos) {
    const lista = document.getElementById("lista-servicos");
    lista.innerHTML = "";

    servicos.forEach(servico => {
        const item = document.createElement("div");
        item.className = "servico";

        const texto = document.createElement("span");
        texto.textContent = typeof servico === "string" ? servico : servico.texto;
        item.appendChild(texto);

        if (typeof servico === "object" && servico.id) {
            const botaoCancelar = document.createElement("button");
            botaoCancelar.type = "button";
            botaoCancelar.className = "botao-cancelar-registro";
            botaoCancelar.dataset.cancelarOrdem = String(servico.id);
            botaoCancelar.textContent = "CANCELAR";
            botaoCancelar.title = "Cancelar esta ordem de serviço";
            item.appendChild(botaoCancelar);
        }

        lista.appendChild(item);
    });
}

// Serviços da ordem como estão no banco (coluna "servicos"), ex.: "Troca de óleo, Alinhamento".
//userC: Vinicius Sanches
function nomesDosServicos(ordem) {
    const nomes = (ordem.servicos || []).map((servico) => servico.nome).filter(Boolean);
    return nomes.length ? nomes.join(", ") : "Serviço não informado";
}

// Consulta as ordens da placa na API e lista os serviços encontrados.
//USER: Matheus Lino
//userC: Vinicius Sanches
document.getElementById("botao-confirmar").addEventListener("click", async () => {
    let valido = true;
    campos.forEach(campo => {
        if (!validarCampo(campo, true)) valido = false;
    });

    if (!valido) {
        campos.find(campo => !campo.value.trim())?.focus();
        return;
    }

    try {
        const ordens = await window.MimeticAPI.listarOrdensPorPlaca(placa.value.trim().toUpperCase());
        exibirServicos(ordens.length
            ? ordens.map(o => ({ id: (o.status === "Cancelada" || o.status === "Concluída") ? null : o.id, texto: `${nomesDosServicos(o)} • ${o.veiculo || "Veículo"} • ${o.status}` }))
            : ["Nenhum serviço encontrado para esta placa."]);
    } catch (erro) {
        window.MimeticTela.avisarErro(erro);
    }
});
