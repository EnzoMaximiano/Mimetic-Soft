// =========================================================
// TELA: CADASTRO DE FUNCIONÁRIO
// Envia o novo funcionário para a API (mesma tabela do login; não cria cliente).
// =========================================================
//USER: Matheus Lino
const { valor, valorSenha, marcarObrigatorios, requisitosSenha } = window.MimeticTela;

marcarObrigatorios();
const senhaAtendeRequisitos = requisitosSenha(document.getElementById('senha'));

//USER: Vinicius Sanches & Matheus Lino
//userC: Vinicius Sanches
document.getElementById('form-cadastro-funcionario').addEventListener('submit', async evento => {
    evento.preventDefault();

    const senha = valorSenha('senha');
    if (!senhaAtendeRequisitos()) return alert('A senha ainda não atende a todos os requisitos.');
    if (senha !== valorSenha('repetir-senha')) return alert('As senhas não coincidem.');

    try {
        await window.MimeticAPI.cadastrarFuncionario(valor('nome'), valor('email').toLowerCase(), senha);
        alert('Funcionário cadastrado com sucesso.');
        location.href = 'tela-principal.html';
    } catch (erro) {
        alert(erro.message);
    }
});
