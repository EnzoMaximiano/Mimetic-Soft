// Tela Ordem de Serviço — comportamento de front-end do protótipo.
//USER: Matheus Lino
const formulario = document.getElementById("form-ordem-servico");
const cpf = document.getElementById("cpf");
const telefone = document.getElementById("telefone");
const orcamento = document.getElementById("orcamento");
const listaServicos = document.getElementById("lista-servicos");

// Converte um valor em texto brasileiro (ex.: "1.234,56") para número (1234.56).
//USER: Matheus Lino
function moedaNumero(v){ return Number(String(v||'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'')) || 0; }

// Formata um número como moeda brasileira, com duas casas decimais.
//USER: Matheus Lino
function moedaBR(v){ return v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }

// Aplica máscara de moeda ao campo enquanto o usuário digita (só dígitos; os dois últimos são os centavos)
// e recalcula o orçamento total.
function formatarValor(input){ const n=String(input.value).replace(/\D/g,''); input.value=n?moedaBR(Number(n)/100):''; atualizarOrcamento(); }

// Devolve a lista de serviços preenchidos no formulário, como [{ nome, preco }].
// Quando o serviço escolhido é "Outro serviço", usa o texto digitado como nome.
//USER: Matheus Lino
function servicosSelecionados(){
  return [...document.querySelectorAll('.linha-servico')].map(l=>{ const escolha=l.querySelector('.servico-nome')?.value||''; const especificacao=l.querySelector('.servico-outro')?.value.trim()||''; return {nome: escolha==='Outro serviço' ? especificacao : escolha, preco:l.querySelector('.servico-valor')?.value||'0,00'}; }).filter(x=>x.nome);
}

// Soma o preço de todos os serviços e escreve o total no campo Orçamento.
//USER: Matheus Lino
function atualizarOrcamento(){ const total=servicosSelecionados().reduce((a,x)=>a+moedaNumero(x.preco),0); if(orcamento) orcamento.value=moedaBR(total); }

// Liga os comportamentos de uma linha de serviço: máscara de valor, campo "Outro serviço"
// que só aparece quando necessário e botão de remover a linha.
//USER: Matheus Lino
function prepararLinha(linha){
  const seletor=linha.querySelector('.servico-nome');
  const outro=linha.querySelector('.servico-outro');
  // Mostra o campo de especificação só quando o serviço escolhido é "Outro serviço" e atualiza o orçamento.
  function atualizarOutro(){ const mostrar=seletor?.value==='Outro serviço'; if(outro){ outro.hidden=!mostrar; if(!mostrar) outro.value=''; } atualizarOrcamento(); }
  linha.querySelector('.servico-valor')?.addEventListener('input',e=>formatarValor(e.target));
  seletor?.addEventListener('change',atualizarOutro);
  outro?.addEventListener('input',atualizarOrcamento);
  atualizarOutro();
  linha.querySelector('.remover-servico')?.addEventListener('click',()=>{ if(document.querySelectorAll('.linha-servico').length>1) linha.remove(); else { linha.querySelector('.servico-nome').value=''; linha.querySelector('.servico-valor').value=''; const outro=linha.querySelector('.servico-outro'); if(outro){outro.value='';outro.hidden=true;} } atualizarOrcamento(); });
}
document.querySelectorAll('.linha-servico').forEach(prepararLinha);
document.getElementById('adicionar-servico')?.addEventListener('click',()=>{ const base=document.querySelector('.linha-servico'); const nova=base.cloneNode(true); nova.querySelector('.servico-nome').value=''; nova.querySelector('.servico-valor').value=''; const outro=nova.querySelector('.servico-outro'); if(outro){outro.value='';outro.hidden=true;} listaServicos.appendChild(nova); prepararLinha(nova); });
document.getElementById('limpar-previsao')?.addEventListener('click',()=>{document.getElementById('previsao-conclusao').value='';});

cpf?.addEventListener('input',()=>{ let v=cpf.value.replace(/\D/g,'').slice(0,11); v=v.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2'); cpf.value=v; });
telefone?.addEventListener('input',()=>{ let v=telefone.value.replace(/\D/g,'').slice(0,11); if(v.length>10) v=v.replace(/(\d{2})(\d{5})(\d{4})/,'($1) $2-$3'); else v=v.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3'); telefone.value=v; });

// Confere se o CPF foi preenchido (campo obrigatório), marcando o erro visualmente. Devolve true se está preenchido.
//USER: Matheus Lino
function validarCpf(){ const grupo=cpf.closest('.campo'); const vazio=!cpf.value.trim(); cpf.classList.toggle('campo-invalido',vazio); grupo?.classList.toggle('com-erro',vazio); return !vazio; }
cpf?.addEventListener('input',()=>{if(cpf.value.trim()) validarCpf();});

// Expõe a lista para o salvamento da ordem e para o PDF.
//USER: Matheus Lino
window.MimeticServicos={listar:servicosSelecionados,atualizarTotal:atualizarOrcamento};

document.getElementById("gerar-pdf")?.addEventListener("click",function(){
  if(!validarCpf()){ alert("Preencha o CPF antes de gerar o PDF."); return; }
  if(window.MimeticPDF) window.MimeticPDF.gerarOrdemServico();
});

// Limpa a previsão inteira com uma única tecla, sem precisar apagar dia/mês/ano separadamente.
//USER: Matheus Lino
const campoPrevisao = document.getElementById('previsao-conclusao');
campoPrevisao?.addEventListener('keydown', (evento) => {
  if ((evento.key === 'Backspace' || evento.key === 'Delete') && campoPrevisao.value) {
    evento.preventDefault();
    campoPrevisao.value = '';
    campoPrevisao.dispatchEvent(new Event('change', { bubbles: true }));
  }
});

// Mantém o placeholder de Solicitação claro e a opção escolhida em preto.
const chassiCliente = document.getElementById('chassi');
// Deixa o texto da Solicitação em preto quando uma opção foi escolhida (e mais claro no placeholder).
//USER: Matheus Lino
function atualizarCorChassi(){
  chassiCliente?.classList.toggle('selecao-realizada', Boolean(chassiCliente.value));
}
chassiCliente?.addEventListener('change', atualizarCorChassi);
atualizarCorChassi();

// Previsão de conclusão: valida somente quando existe uma data completa.
// Assim o navegador não interrompe a digitação do dia/mês/ano.
// Devolve a data no formato AAAA-MM-DD usando o fuso do computador (o "hoje" real do usuário).
//USER: Matheus Lino
function dataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Garante que a previsão de conclusão não é uma data passada. Se for, avisa (opcional), limpa o campo
// e devolve false; campo vazio ou data válida devolve true.
//USER: Matheus Lino
function validarPrevisaoNaoPassada(mostrarAviso = true) {
  if (!campoPrevisao?.value) return true;
  const hoje = dataLocalISO();
  if (campoPrevisao.value < hoje) {
    if (mostrarAviso) alert('A previsão de conclusão deve ser a data de hoje ou uma data futura.');
    campoPrevisao.value = '';
    campoPrevisao.focus();
    return false;
  }
  return true;
}

// A validação ocorre após a data completa ser confirmada/alterada, nunca durante a digitação.
campoPrevisao?.removeAttribute('min');
// Não valida no evento change: inputs type=date podem dispará-lo enquanto o ano ainda está sendo digitado.
// A comparação só ocorre quando o usuário termina e sai do campo (ou ao enviar o formulário).
campoPrevisao?.addEventListener('blur', () => validarPrevisaoNaoPassada(true));

// Máscara da placa e preenchimento automático por CPF.
const { valor, obrigatoriosPreenchidos, mascaraPlaca } = window.MimeticTela;
mascaraPlaca(document.getElementById('placa'));

// Ao digitar o CPF completo (14 caracteres, com máscara), busca na API:
//  - o CLIENTE cadastrado com esse CPF, para preencher nome, telefone e e-mail;
//  - a última ordem desse CPF, para repetir o veículo (modelo e placa).
// Espera 300 ms depois da última tecla, para não chamar a API a cada caractere.
let temporizadorCpf;
//userC: Vinicius Sanches
function preencherPorCpf() {
  const digitado = cpf.value.trim();
  clearTimeout(temporizadorCpf);
  if (digitado.length < 14) return;
  temporizadorCpf = setTimeout(async () => {
    const [cliente, ordens] = await Promise.allSettled([
      window.MimeticAPI.buscarClientePorCpf(digitado),
      window.MimeticAPI.listarOrdensPorCpf(digitado)
    ]);
    if (cpf.value.trim() !== digitado) return; // ignora se o CPF mudou enquanto buscava
    if (cliente.status === 'fulfilled' && cliente.value) {
      document.getElementById('nome').value = cliente.value.nome || '';
      telefone.value = cliente.value.telefone || '';
      document.getElementById('email').value = cliente.value.email || '';
    } else if (cliente.status === 'rejected') console.error('Não foi possível buscar o cliente deste CPF.', cliente.reason);
    if (ordens.status === 'fulfilled' && ordens.value.length) {
      const ultima = ordens.value[ordens.value.length - 1];
      document.getElementById('modelo').value = ultima.veiculo || '';
      document.getElementById('placa').value = ultima.placa || '';
    } else if (ordens.status === 'rejected') console.error('Não foi possível buscar o último veículo deste CPF.', ordens.reason);
  }, 300);
}
['input', 'blur'].forEach(tipo => cpf?.addEventListener(tipo, preencherPorCpf));

// ENVIO: confere CPF e previsão, manda a ordem para a API (que calcula o orçamento e
// grava ordem e serviços) e segue para o pagamento. A ordem registra QUAL FUNCIONÁRIO
// a abriu (o logado). Se a API recusar, mostra o motivo e mantém o formulário preenchido.
let enviandoOrdem = false; // evita enviar duas vezes com cliques repetidos
//userC: Vinicius Sanches
formulario?.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!validarCpf()) { cpf.focus(); return; }
  if (!validarPrevisaoNaoPassada(true)) return;
  if (!obrigatoriosPreenchidos(formulario) || enviandoOrdem) return;
  enviandoOrdem = true;
  try {
    const ordem = await window.MimeticAPI.criarOrdem({
      cliente: valor('nome'), cpf: valor('cpf'), telefone: valor('telefone'), email: valor('email'),
      placa: valor('placa').toUpperCase(), veiculo: valor('modelo'), anoCarro: valor('ano-carro'),
      chassi: valor('chassi'), previsao: valor('previsao-conclusao'),
      servicos: servicosSelecionados()
    });
    localStorage.setItem('mimeticOrdemAtual', String(ordem.id));
    location.href = 'tela-pagamento.html';
  } catch (erro) {
    alert(erro.message);
    enviandoOrdem = false;
  }
});
