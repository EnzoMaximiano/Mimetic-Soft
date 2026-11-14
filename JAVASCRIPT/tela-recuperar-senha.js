// =========================================================
// TELA: RECUPERAR SENHA (passo 1)
// Pede à API o envio de um código de 6 dígitos para o e-mail e segue para a
// tela de nova senha. A API responde igual exista o e-mail ou não.
// =========================================================
//USER: Matheus Lino
const { valor, marcarObrigatorios } = window.MimeticTela;

marcarObrigatorios();

//USER: Vinicius Sanches & Matheus Lino
//userC: Vinicius Sanches
document.getElementById('form-recuperar-senha').addEventListener('submit', async evento => {
    evento.preventDefault();

    if (valor('email') !== valor('repetir-email')) return alert('Os e-mails informados não coincidem.');

    const email = valor('email').toLowerCase();
    try {
        const resposta = await window.MimeticAPI.solicitarRecuperacao(email);
        localStorage.setItem('mimeticEmailRecuperacao', email);
        alert(`${resposta.mensagem} Digite o código na próxima tela.`);
        location.href = 'tela-nova-senha.html';
    } catch (erro) {
        alert(erro.message);
    }
});
