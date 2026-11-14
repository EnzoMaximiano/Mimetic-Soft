// =========================================================
// TELA: NOVA SENHA (passo 2)
// Envia o código recebido por e-mail e a nova senha para o e-mail informado
// no passo anterior; se a API aceitar, volta ao login.
// =========================================================
//USER: Matheus Lino
const { valor, valorSenha, marcarObrigatorios, requisitosSenha } = window.MimeticTela;

marcarObrigatorios();
const senhaAtendeRequisitos = requisitosSenha(document.getElementById('nova-senha'));

//USER: Vinicius Sanches & Matheus Lino
//userC: Vinicius Sanches
document.getElementById('form-nova-senha').addEventListener('submit', async evento => {
    evento.preventDefault();

    const nova = valorSenha('nova-senha');
    if (!senhaAtendeRequisitos()) return alert('A senha ainda não atende a todos os requisitos.');
    if (nova !== valorSenha('confirmar-senha')) return alert('As senhas não coincidem.');

    const codigo = valor('codigo');
    if (!/^\d{6}$/.test(codigo)) return alert('Informe o código de 6 dígitos enviado para o seu e-mail.');

    const email = (localStorage.getItem('mimeticEmailRecuperacao') || '').toLowerCase();
    if (!email) {
        alert('Não foi possível localizar o cadastro para alterar a senha. Refaça a recuperação.');
        location.href = 'tela-recuperar-senha.html';
        return;
    }

    try {
        await window.MimeticAPI.redefinirSenha(email, codigo, nova);
        localStorage.removeItem('mimeticEmailRecuperacao');
        alert('Senha alterada com sucesso. Faça o login com a nova senha.');
        location.href = 'tela-login.html';
    } catch (erro) {
        alert(erro.message);
    }
});
