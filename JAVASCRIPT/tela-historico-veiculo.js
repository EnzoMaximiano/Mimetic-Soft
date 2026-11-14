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
// ou um objeto { id, texto }; objetos com id ganham o botão APAGAR daquela ordem.
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
            const botaoApagar = document.createElement("button");
            botaoApagar.type = "button";
            botaoApagar.className = "botao-apagar-registro";
            botaoApagar.dataset.apagarOrdem = String(servico.id);
            botaoApagar.textContent = "APAGAR";
            botaoApagar.title = "Apagar somente este serviço salvo";
            item.appendChild(botaoApagar);
        }

        lista.appendChild(item);
    });
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
            ? ordens.map(o => ({ id: o.id, texto: `${o.solicitacao || "Serviço"} • ${o.veiculo || "Veículo"} • ${o.status}` }))
            : ["Nenhum serviço encontrado para esta placa."]);
    } catch (erro) {
        window.MimeticTela.avisarErro(erro);
    }
});
