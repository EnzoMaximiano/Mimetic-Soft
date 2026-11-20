/* =========================================================
   MIMETIC SOFT - PARTE GLOBAL DO FRONT-END (app-core)
   Carregado em TODAS as telas, por último. Cuida só do que é comum:
     - proteção de telas (sessão), nome do funcionário no cabeçalho
     - menu da conta / "Sair"
     - botão VOLTAR (destino fixo de cada tela)
     - botões CONFIRMAR PAGAMENTO, CONCLUIR e CANCELAR de uma ordem (usados em duas telas)
   O que é de uma tela só fica no próprio tela-xxx.js.
   Funções repetidas entre telas: tela-comum.js. Chamadas HTTP: api-client.js.

   REGRA FUNCIONÁRIO x CLIENTE: são cadastros separados. Só o funcionário
   tem login e sessão; cliente é apenas um registro feito por ele.
   ========================================================= */

// Se true, telas internas só abrem com um funcionário logado (recomendado).
// Coloque false apenas para testar telas soltas, sem passar pelo login.
//User: Vinicius Sanches
const EXIGIR_LOGIN = false;

// Telas que podem ser abertas sem estar logado.
const PAGINAS_PUBLICAS = new Set(['tela-login.html', 'tela-recuperar-senha.html', 'tela-nova-senha.html']);

// Destino do botão VOLTAR em cada tela (as que não estão aqui voltam à principal).
const DESTINO_VOLTAR = {
  'tela-recuperar-senha.html': 'tela-login.html',
  'tela-nova-senha.html': 'tela-recuperar-senha.html',
  'tela-pagamento-pix.html': 'tela-pagamento.html',
  'tela-cartao.html': 'tela-pagamento.html',
  'tela-boleto.html': 'tela-pagamento.html'
};

(() => {
  const page = location.pathname.split('/').pop() || 'tela-login.html';
  //userC: Vinicius Sanches
  const go = arquivo => { location.href = arquivo; };
  const funcionarioLogado = window.MimeticAPI?.lerSessao() ?? null;

  // PROTEÇÃO DE TELAS: sem funcionário logado, telas internas voltam ao login.
  if (EXIGIR_LOGIN && !PAGINAS_PUBLICAS.has(page) && !funcionarioLogado) {
    location.replace('tela-login.html');
    return;
  }

  // ACESSO TEMPORÁRIO DO PROTÓTIPO: todo funcionário logado acessa todas as telas.
  // A divisão de permissões (mecânico x atendente) será definida com o grupo.

  // ---------------------------------------------------------
  // CABEÇALHO: nome do funcionário logado
  // ---------------------------------------------------------
  const nome = funcionarioLogado?.nome || 'Nome Funcionário';
  //USER: Luan Viel
  document.querySelectorAll('.nome-funcionario').forEach(el => { el.textContent = nome; });

  //USER: Matheus Lino
  document.querySelectorAll('.menu-funcionario').forEach(btn => {
    // Telas públicas de senha, sem sessão, não exibem o menu.
    if (PAGINAS_PUBLICAS.has(page) && !funcionarioLogado) { btn.style.visibility = 'hidden'; return; }
    const spans = [...btn.querySelectorAll('span')];
    const seta = btn.querySelector('.seta') || btn.querySelector('[aria-hidden="true"]') || spans.find(x => x.textContent.includes('⌄'));
    const nomeSpan = spans.find(x => x !== seta && !x.textContent.includes('⌄'));
    if (nomeSpan) nomeSpan.textContent = nome;
    else {
      [...btn.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).forEach(n => { n.textContent = ''; });
      btn.insertBefore(document.createTextNode(nome + ' '), btn.firstChild);
    }
    btn.title = 'Abrir menu da conta';
    btn.setAttribute('aria-label', 'Menu de ' + nome);
  });

  // ---------------------------------------------------------
  // MENU DA CONTA: só "Sair" (o retorno ao menu é feito pelo botão VOLTAR)
  // ---------------------------------------------------------
  const menuConta = document.createElement('div');
  menuConta.className = 'menu-conta-mimetic';
  menuConta.hidden = true;
  menuConta.style.cssText = 'position:fixed;z-index:1000;min-width:120px;padding:6px;border:1px solid rgba(0,0,0,.14);border-radius:8px;background:#fff;box-shadow:0 8px 24px rgba(0,0,0,.18)';
  menuConta.innerHTML = '<button type="button" data-conta="sair" style="width:100%;border:0;border-radius:6px;padding:9px 12px;background:transparent;color:#222;cursor:pointer;text-align:left">Sair</button>';
  document.body.appendChild(menuConta);

  // Encerra a sessão, limpa a ordem em andamento e volta ao login.
  //userC: Vinicius Sanches
  function sairDoSistema() {
    window.MimeticAPI?.encerrarSessao();
    localStorage.removeItem('mimeticOrdemAtual');
    go('tela-login.html');
  }

  // Pergunta e, se confirmado, cancela UMA ordem (pelo id) via API e recarrega a tela.
  // A ordem não é apagada: fica no banco com o status "Cancelada".
  //USER: Matheus Lino
  //userC: Vinicius Sanches
  async function cancelarOrdem(id) {
    if (!id || !window.confirm('Deseja cancelar esta ordem de serviço?')) return;
    try {
      await window.MimeticAPI.cancelarOrdem(id);
    } catch (erro) {
      alert(erro.message);
      if (erro.status !== 409) return;
    }
    if (localStorage.getItem('mimeticOrdemAtual') === String(id)) localStorage.removeItem('mimeticOrdemAtual');
    location.reload();
  }

  // Confirma o pagamento de UMA ordem direto da lista (atalho para testes, sem passar pelas
  // telas de PIX/boleto/cartão). Pergunta a forma de pagamento e recarrega a tela.
  //userC: Vinicius Sanches
  async function confirmarPagamento(id) {
    if (!id) return;
    const resposta = window.prompt('Forma de pagamento (PIX, BOLETO, CARTÃO, DÉBITO ou CRÉDITO):', 'PIX');
    if (resposta === null) return;
    try {
      await window.MimeticAPI.pagarOrdem(id, resposta.trim().toUpperCase());
    } catch (erro) {
      alert(erro.message);
      if (erro.status !== 409) return;
    }
    location.reload();
  }

  // Pergunta e, se confirmado, conclui o serviço de UMA ordem (pelo id) e recarrega a tela.
  //userC: Vinicius Sanches
  async function concluirOrdem(id) {
    if (!id || !window.confirm('Deseja concluir o serviço desta ordem?')) return;
    try {
      await window.MimeticAPI.concluirOrdem(id);
    } catch (erro) {
      alert(erro.message);
      if (erro.status !== 409) return;
    }
    location.reload();
  }

  // ---------------------------------------------------------
  // CLIQUES GLOBAIS (fase de captura: vence os cliques das linhas/tabelas)
  // ---------------------------------------------------------
  //USER: Matheus Lino
  //userC: Vinicius Sanches
  document.addEventListener('click', e => {
    const t = e.target.closest('button, a');
    if (!t) { menuConta.hidden = true; return; }

    // Qualquer clique fora do menu o fecha.
    if (!t.classList.contains('menu-funcionario') && !t.closest('.menu-conta-mimetic')) menuConta.hidden = true;

    if (t.classList.contains('menu-funcionario')) {
      e.preventDefault(); e.stopImmediatePropagation();
      const r = t.getBoundingClientRect();
      menuConta.style.top = (r.bottom + 8) + 'px';
      menuConta.style.left = Math.max(8, r.right - 120) + 'px';
      menuConta.hidden = !menuConta.hidden;
    } else if (t.dataset.cancelarOrdem) {
      e.preventDefault(); e.stopImmediatePropagation();
      cancelarOrdem(t.dataset.cancelarOrdem);
    } else if (t.dataset.confirmarPagamento) {
      e.preventDefault(); e.stopImmediatePropagation();
      confirmarPagamento(t.dataset.confirmarPagamento);
    } else if (t.dataset.concluirOrdem) {
      e.preventDefault(); e.stopImmediatePropagation();
      concluirOrdem(t.dataset.concluirOrdem);
    } else if (t.dataset.conta === 'sair') {
      e.preventDefault(); e.stopImmediatePropagation();
      sairDoSistema();
    } else if (t.id === 'link-esqueci-senha') {
      e.preventDefault(); e.stopImmediatePropagation();
      go('tela-recuperar-senha.html');
    } else if (t.id === 'botao-voltar' || t.id === 'voltar') {
      e.preventDefault(); e.stopImmediatePropagation();
      go(DESTINO_VOLTAR[page] || 'tela-principal.html');
    }
  }, true);
})();
