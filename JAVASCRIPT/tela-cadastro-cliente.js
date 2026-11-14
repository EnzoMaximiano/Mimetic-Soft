//USER: Matheus Lino
const formulario = document.getElementById("form-cadastro-cliente");
const camposObrigatorios = [...formulario.querySelectorAll("[required]")];
const senha = document.getElementById("senha");
const repetirSenha = document.getElementById("repetir-senha");
const grupoRepetirSenha = repetirSenha.closest(".grupo-campo");

const { valor, requisitosSenha } = window.MimeticTela;
// Atualiza a lista de requisitos da senha e confere se todos foram atendidos.
const senhaAtendeRequisitos = requisitosSenha(senha);


// Marca o campo como inválido (aviso "Campo obrigatório") quando está vazio.
// Devolve true se o campo está preenchido.
//USER: Matheus Lino
function atualizarEstadoObrigatorio(campo, mostrarErro = false) {
    const grupo = campo.closest(".grupo-campo");
    const vazio = campo.value.trim() === "";

    grupo.classList.toggle("invalido", mostrarErro && vazio);
    return !vazio;
}

camposObrigatorios.forEach((campo) => {
    campo.addEventListener("input", () => {
        atualizarEstadoObrigatorio(campo, true);

        if (campo === senha || campo === repetirSenha) {
            grupoRepetirSenha.classList.remove("senhas-diferentes");
        }
    });
});

//USER: Matheus Lino
// Máscara de CPF: 000.000.000-00
document.getElementById("cpf").addEventListener("input", (evento) => {
    let valor = evento.target.value.replace(/\D/g, "").slice(0, 11);
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    evento.target.value = valor;
});

//USER: Matheus Lino
// Máscara de data: DD/MM/AAAA
document.getElementById("data-nascimento").addEventListener("input", (evento) => {
    let valor = evento.target.value.replace(/\D/g, "").slice(0, 8);
    if (valor.length > 4) valor = valor.replace(/(\d{2})(\d{2})(\d+)/, "$1/$2/$3");
    else if (valor.length > 2) valor = valor.replace(/(\d{2})(\d+)/, "$1/$2");
    evento.target.value = valor;
});

//USER: Matheus Lino
// Máscara de telefone: (00) 00000-0000
document.getElementById("telefone").addEventListener("input", (evento) => {
    let valor = evento.target.value.replace(/\D/g, "").slice(0, 11);

    if (valor.length > 10) {
        valor = valor.replace(/(\d{2})(\d{5})(\d{1,4})/, "($1) $2-$3");
    } else if (valor.length > 6) {
        valor = valor.replace(/(\d{2})(\d{4})(\d{1,4})/, "($1) $2-$3");
    } else if (valor.length > 2) {
        valor = valor.replace(/(\d{2})(\d+)/, "($1) $2");
    } else if (valor.length) {
        valor = valor.replace(/(\d{1,2})/, "($1");
    }

    evento.target.value = valor;
});

//USER: Matheus Lino
//userC: Vinicius Sanches
formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    let formularioValido = true;

    camposObrigatorios.forEach((campo) => {
        if (!atualizarEstadoObrigatorio(campo, true)) {
            formularioValido = false;
        }
    });

    if (!formularioValido) return;

    if (!senhaAtendeRequisitos()) {
        senha.focus();
        return;
    }

    if (senha.value !== repetirSenha.value) {
        grupoRepetirSenha.classList.add("senhas-diferentes");
        repetirSenha.focus();
        return;
    }

    grupoRepetirSenha.classList.remove("senhas-diferentes");

    // O cliente é gravado no banco pela API. Ele não tem login, então a senha
    // digitada NÃO é enviada (a tabela Cliente não guarda senha).
    try {
        await window.MimeticAPI.cadastrarCliente({
            nome: valor("nome"), cpf: valor("cpf"), dataNascimento: valor("data-nascimento"),
            telefone: valor("telefone"), email: valor("email")
        });
        alert("Cliente cadastrado com sucesso.");
        location.href = "tela-principal.html";
    } catch (erro) {
        alert(erro.message);
    }
});
