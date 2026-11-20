/* =========================================================
   MIMETIC SOFT - TELA DE LOGIN (design "tela-login-mimetic")
   Esta tela autentica FUNCIONÁRIOS pela API (servidorREST) e também
   permite criar uma conta de funcionário.
   Clientes NÃO fazem login aqui: eles são cadastrados por um funcionário
   na tela "Cadastro de Cliente".
   Depende de api-client.js (window.MimeticAPI) carregado antes.
   ========================================================= */
//USER: Vinicius Sanches
const wrapper = document.querySelector('.wrapper');
const loginLink = document.querySelector('.login-link');
const registerLink = document.querySelector('.register-link');
const btnLogin = document.querySelector('.btnLogin');
const iconClose = document.querySelector('.iconeFechar');
const formLogin = document.getElementById('form-login');
const formRegistro = document.getElementById('form-registro');

// Tela principal do sistema, aberta após o login.
const DESTINO_APOS_LOGIN = 'tela-principal.html';

// ---------------------------------------------------------
// EFEITOS / MOVIMENTAÇÃO DO FORMULÁRIO
// ---------------------------------------------------------
//USER: Vinicius Sanches

// Mostra o formulário "Criar conta" no lugar do login.
registerLink.addEventListener('click', (evento) => {
    evento.preventDefault();
    wrapper.classList.add('active');
});

// Volta do "Criar conta" para o formulário de login.
loginLink.addEventListener('click', (evento) => {
    evento.preventDefault();
    wrapper.classList.remove('active');
});

// Abre a caixa (pop-up) de login ao clicar no botão "Login" do cabeçalho.
btnLogin.addEventListener('click', () => {
    wrapper.classList.add('active-popup');
});

// Fecha a caixa de login/cadastro.
iconClose.addEventListener('click', () => {
    wrapper.classList.remove('active-popup');
});

// ---------------------------------------------------------
// VALIDAÇÃO
// ---------------------------------------------------------

// Confere as mesmas regras de senha do resto do sistema:
// 8+ caracteres, maiúscula, minúscula, número e símbolo.
// Retorna true se a senha é forte o bastante.
//USER: Vinicius Sanches & Matheus Lino
function senhaForte(senha) {
    return senha.length >= 8
        && /[A-Z]/.test(senha)
        && /[a-z]/.test(senha)
        && /[0-9]/.test(senha)
        && /[^A-Za-z0-9]/.test(senha);
}

// Liga/desliga o botão de envio enquanto o servidor responde,
// evitando cliques duplos que enviariam o formulário duas vezes.
//USER: Vinicius Sanches
function bloquearBotao(formulario, bloquear) {
    const botao = formulario.querySelector('button[type="submit"]');
    if (botao) botao.disabled = bloquear;
}

// ---------------------------------------------------------
// LOGIN
// ---------------------------------------------------------

// Envia e-mail e senha para a API. Se estiverem corretos, guarda a sessão
// do funcionário e abre a tela principal; senão, mostra o erro devolvido.
//USER: Vinicius Sanches
async function logar(evento) {
    evento.preventDefault();

    const email = document.getElementById('email').value.trim().toLowerCase();
    // A senha NÃO é "aparada" (trim): precisa ser idêntica à que foi cadastrada.
    const senha = document.getElementById('senha').value;
    const manterConectado = document.getElementById('manter-conectado').checked;

    bloquearBotao(formLogin, true);
    try {
        const dados = await window.MimeticAPI.login(email, senha);
        window.MimeticAPI.salvarSessao(dados.funcionario, manterConectado, dados.token);
        location.href = DESTINO_APOS_LOGIN;
    } catch (erro) {
        alert(erro.message);
    } finally {
        bloquearBotao(formLogin, false);
    }
}

// ---------------------------------------------------------
// CADASTRO DE FUNCIONÁRIO
// ---------------------------------------------------------

// Valida a senha e envia o novo funcionário para a API. Se der certo, volta
// para o login com o e-mail já preenchido (o usuário então entra normalmente).
//USER: Vinicius Sanches
async function registrar(evento) {
    evento.preventDefault();

    const nome = document.getElementById('registro-nome').value.trim();
    const email = document.getElementById('registro-email').value.trim().toLowerCase();
    const senha = document.getElementById('registro-senha').value;

    if (!senhaForte(senha)) {
        alert('A senha deve ter 8 caracteres ou mais, com letra maiúscula, minúscula, número e símbolo.');
        return;
    }

    bloquearBotao(formRegistro, true);
    try {
        await window.MimeticAPI.cadastrarFuncionario(nome, email, senha);
        alert('Funcionário cadastrado com sucesso! Agora faça o login.');
        formRegistro.reset();
        document.getElementById('email').value = email;
        wrapper.classList.remove('active');
    } catch (erro) {
        alert(erro.message);
    } finally {
        bloquearBotao(formRegistro, false);
    }
}

formLogin.addEventListener('submit', logar);
formRegistro.addEventListener('submit', registrar);

// ---------------------------------------------------------
// MOSTRAR SENHA: a caixa "Mostrar senha" alterna o campo entre texto e senha
// ---------------------------------------------------------
//userC: Vinicius Sanches
document.querySelectorAll('.mostrar-senha').forEach((caixa) => {
    caixa.addEventListener('change', () => {
        const campo = document.getElementById(caixa.dataset.campo);
        if (campo) campo.type = caixa.checked ? 'text' : 'password';
    });
});
