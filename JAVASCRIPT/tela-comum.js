/* =========================================================
   MIMETIC SOFT - FUNÇÕES COMUNS ÀS TELAS (window.MimeticTela)
   Só o que era repetido em várias telas fica aqui:
   leitura de campos, máscara de placa, aviso "Campo obrigatório",
   lista de requisitos da senha e confirmação de pagamento.
   Carregue DEPOIS de api-client.js e ANTES do tela-xxx.js.
   ========================================================= */
(() => {
  // Valor de um campo pelo id, sem espaços nas pontas.
  //userC: Vinicius Sanches
  const valor = id => document.getElementById(id)?.value?.trim() || '';

  // Valor de um campo de SENHA: exatamente como digitado (sem tirar espaços).
  //userC: Vinicius Sanches
  const valorSenha = id => document.getElementById(id)?.value || '';

  // true se todos os campos obrigatórios (required) do formulário estão preenchidos.
  // (Usado nos formulários com "novalidate", onde o navegador não confere sozinho.)
  //userC: Vinicius Sanches
  const obrigatoriosPreenchidos = form => [...form.elements].filter(el => el.required).every(el => el.value.trim());

  // Máscara de placa: maiúsculas, só letras/números/hífen, até 8 caracteres.
  //userC: Vinicius Sanches
  function mascaraPlaca(campo) {
    campo?.addEventListener('input', () => {
      campo.value = campo.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8);
    });
  }

  // Cria o aviso "Campo obrigatório" ao lado do asterisco de cada input required
  // e o mostra quando o navegador recusa o envio por campo vazio.
  //userC: Vinicius Sanches
  function marcarObrigatorios() {
    document.querySelectorAll('input[required]').forEach(campo => {
      const grupo = campo.closest('.campo');
      const label = grupo?.querySelector('label');
      if (label && !label.querySelector('.mensagem-obrigatorio')) {
        const mensagem = document.createElement('span');
        mensagem.className = 'mensagem-obrigatorio';
        mensagem.textContent = 'Campo obrigatório';
        label.appendChild(mensagem);
      }
      campo.addEventListener('invalid', e => {
        e.preventDefault();
        if (campo.validity.valueMissing) {
          campo.classList.add('campo-invalido');
          grupo?.classList.add('com-erro');
        }
      });
      campo.addEventListener('input', () => {
        if (campo.value.trim() !== '') {
          campo.classList.remove('campo-invalido');
          grupo?.classList.remove('com-erro');
        }
      });
    });
  }

  // Regras da senha (iguais às do servidor). Atualiza a lista ✓/✕ da tela
  // (elementos #req-tamanho, #req-maiuscula...) conforme o usuário digita.
  // Devolve uma função que confere a senha atual e diz se todas as regras foram atendidas.
  const TEXTOS_SENHA = {
    tamanho: '8 caracteres ou mais',
    maiuscula: '1 letra maiúscula',
    minuscula: '1 letra minúscula',
    numero: '1 número',
    simbolo: '1 símbolo (ex.: @, #, !, $)'
  };
  //userC: Vinicius Sanches
  function requisitosSenha(campoSenha) {
    //userC: Vinicius Sanches
    function conferir() {
      const s = campoSenha.value;
      const regras = {
        tamanho: s.length >= 8,
        maiuscula: /[A-Z]/.test(s),
        minuscula: /[a-z]/.test(s),
        numero: /[0-9]/.test(s),
        simbolo: /[^A-Za-z0-9]/.test(s)
      };
      Object.entries(regras).forEach(([chave, ok]) => {
        const item = document.getElementById('req-' + chave);
        if (!item) return;
        item.classList.toggle('valido', ok);
        item.classList.toggle('invalido', !ok);
        item.textContent = `${ok ? '✓' : '✕'} ${TEXTOS_SENHA[chave]}`;
      });
      return Object.values(regras).every(Boolean);
    }
    campoSenha?.addEventListener('input', conferir);
    return conferir;
  }

  // Mostra ao usuário o motivo de uma falha da API (ex.: servidor desligado).
  //userC: Vinicius Sanches
  function avisarErro(erro) {
    console.error(erro);
    alert(erro.message);
  }

  // Confirma na API o pagamento da ordem atual (ela passa para a etapa 2) e abre o
  // acompanhamento. "forma" é PIX, BOLETO, CARTÃO, DÉBITO ou CRÉDITO.
  // Se a ordem já estava paga (409), avisa e abre o acompanhamento mesmo assim.
  //userC: Vinicius Sanches
  async function finalizarPagamento(forma) {
    const id = localStorage.getItem('mimeticOrdemAtual');
    if (!id) {
      alert('Nenhuma ordem de serviço selecionada para pagamento.');
      location.href = 'tela-ordem-servico.html';
      return;
    }
    try {
      await window.MimeticAPI.pagarOrdem(id, forma);
      location.href = 'tela-acompanhamento.html';
    } catch (erro) {
      alert(erro.message);
      if (erro.status === 409) location.href = 'tela-acompanhamento.html';
    }
  }

  window.MimeticTela = { obrigatoriosPreenchidos, valor, valorSenha, mascaraPlaca, marcarObrigatorios, requisitosSenha, avisarErro, finalizarPagamento };
})();
