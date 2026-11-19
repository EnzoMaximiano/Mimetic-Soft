/* =========================================================
   MIMETIC SOFT - CLIENTE DA API (front-end -> servidorREST)

   Este é o ÚNICO arquivo do front-end que sabe o endereço do servidor e
   monta as chamadas HTTP. As telas usam window.MimeticAPI.<função>().
   Quando novas rotas forem criadas no servidor (ex.: clientes), basta
   adicionar a função correspondente aqui.

   ORDENS DE SERVIÇO: a API trabalha com valores em NÚMERO (150.5) e datas
   AAAA-MM-DD; as telas trabalham com texto brasileiro ("150,50"). As funções
   abaixo já convertem nos dois sentidos, então as telas continuam recebendo a
   ordem no mesmo formato de antes (cliente = nome, orcamento = "150,50"...).

   Para trocar o endereço do servidor sem editar este arquivo, defina antes
   dele:  <script>window.MIMETIC_API_URL = 'http://meu-servidor:3000';</script>
   ========================================================= */
   //USER: Vinicius Sanches
(() => {
  // Endereço base da API (o servidorREST usa a porta 3000 por padrão).
  const API_URL = window.MIMETIC_API_URL || 'http://localhost:3000';

  // Rotas que NÃO levam o token de login (o próprio login e a recuperação de senha).
  const ROTAS_SEM_TOKEN = ['/login', '/recuperar-senha/'];

  // Envia uma requisição JSON ao servidor e devolve a resposta já convertida.
  // - rota:   caminho da API, ex.: '/login'
  // - metodo: 'GET', 'POST', 'PUT' ou 'DELETE'
  // - corpo:  objeto enviado como JSON (opcional)
  // Envia o token do funcionário logado no cabeçalho Authorization (exceto nas
  // rotas de ROTAS_SEM_TOKEN). Se o servidor responder com erro (401, 409...),
  // lança um Error com a mensagem devolvida pela API, pronta para ser exibida ao usuário.
  //userC: Vinicius Sanches
  async function requisicao(rota, metodo, corpo) {
    const token = ROTAS_SEM_TOKEN.some(r => rota.startsWith(r)) ? null : lerSessao()?.token;
    const cabecalhos = { 'Content-Type': 'application/json' };
    if (token) cabecalhos.Authorization = 'Bearer ' + token;

    let resposta;
    try {
      resposta = await fetch(API_URL + rota, {
        method: metodo,
        headers: cabecalhos,
        body: corpo ? JSON.stringify(corpo) : undefined,
      });
    } catch (erroDeRede) {
      // fetch só falha aqui quando o servidor está desligado ou inacessível.
      throw new Error('Não foi possível conectar ao servidor. Verifique se o servidorREST está rodando.');
    }

    // Se o corpo não for JSON válido, segue com objeto vazio.
    let dados = {};
    try { dados = await resposta.json(); } catch (erroDeLeitura) { /* sem corpo JSON */ }

    if (!resposta.ok) {
      // 401 para quem enviou token = login vencido ou inválido: encerra a sessão e volta ao login.
      // (401 do próprio /login, senha errada, não passa por aqui: ele não envia token.)
      if (resposta.status === 401 && token) {
        encerrarSessao();
        if (!/tela-login\.html$/.test(location.pathname)) setTimeout(() => location.replace('tela-login.html'), 0);
        const expirada = new Error('Sua sessão expirou. Faça login novamente.');
        expirada.status = 401;
        throw expirada;
      }
      const erro = new Error(dados.erro || `Erro inesperado do servidor (${resposta.status}).`);
      erro.status = resposta.status; // ex.: 404 = não encontrado, 409 = conflito (ex.: ordem já paga)
      throw erro;
    }
    return dados;
  }

  // ---------------------------------------------------------
  // SESSÃO DO FUNCIONÁRIO LOGADO
  // Só FUNCIONÁRIOS têm sessão. Clientes são apenas registros cadastrados por
  // um funcionário e nunca entram aqui.
  // "Manter conectado" -> localStorage (continua após fechar o navegador).
  // Sem marcar         -> sessionStorage (termina ao fechar a aba).
  // ---------------------------------------------------------
  //USER: Vinicius Sanches
  const CHAVE_SESSAO = 'mimeticFuncionarioLogado';

  // Guarda o funcionário logado. Recebe { id, nome, email } e o token vindos da API
  // e se a sessão deve ser mantida após fechar o navegador.
  // O token é enviado em todas as chamadas protegidas (ver "requisicao").
  //userC: Vinicius Sanches
  function salvarSessao(funcionario, manterConectado, token) {
    encerrarSessao();
    const armazenamento = manterConectado ? localStorage : sessionStorage;
    armazenamento.setItem(CHAVE_SESSAO, JSON.stringify({ ...funcionario, token, tipo: 'funcionario' }));
  }

  // Devolve o funcionário logado ou null quando não há sessão.
  //USER: Vinicius Sanches
  //userC: Vinicius Sanches
  function lerSessao() {
    try {
      const bruto = sessionStorage.getItem(CHAVE_SESSAO) || localStorage.getItem(CHAVE_SESSAO);
      return bruto ? JSON.parse(bruto) : null;
    } catch (erroDeLeitura) {
      return null;
    }
  }

  // Encerra a sessão (logout). Também apaga chaves antigas do protótipo
  // que misturavam cliente e funcionário no mesmo "usuário logado".
  //USER: Vinicius Sanches
  //userC: Vinicius Sanches
  function encerrarSessao() {
    [sessionStorage, localStorage].forEach(a => a.removeItem(CHAVE_SESSAO));
    ['mimeticUsuarioLogado', 'mimeticFuncionarioNome'].forEach(k => localStorage.removeItem(k));
  }

  // ---------------------------------------------------------
  // ORDENS DE SERVIÇO: conversões entre o formato da API e o das telas
  // ---------------------------------------------------------

  // Chave do localStorage que guarda SÓ o id da "ordem atual" (a que está sendo
  // paga/acompanhada). É apenas um ponteiro de navegação; os dados da ordem ficam no banco.
  const CHAVE_ORDEM_ATUAL = 'mimeticOrdemAtual';

  // Converte um valor em texto brasileiro ("1.234,56" ou "R$ 1.234,56") em número (1234.56).
  // Texto vazio ou inválido vira 0.
  //USER: Vinicius Sanches
  //userC: Vinicius Sanches
  function brParaNumero(texto) {
    if (typeof texto === 'number') return texto;
    const limpo = String(texto ?? '').replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const n = Number(limpo);
    return Number.isFinite(n) ? n : 0;
  }

  // Converte um número (1234.5) em texto brasileiro com duas casas ("1.234,50").
  //USER: Vinicius Sanches
  //userC: Vinicius Sanches
  function numeroParaBR(numero) {
    return Number(numero || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Transforma a ordem devolvida pela API no formato que as telas já usavam:
  // cliente = nome (texto), orcamento e preço dos serviços em "150,00",
  // conclusao = previsão ou "A definir", pagamento = forma de pagamento.
  //USER: Vinicius Sanches
  //userC: Vinicius Sanches
  function ordemParaTela(ordem) {
    return {
      id: ordem.id,
      idFuncionario: ordem.idFuncionario,
      cliente: ordem.cliente?.nome || '',
      cpf: ordem.cliente?.cpf || '',
      telefone: ordem.cliente?.telefone || '',
      email: ordem.cliente?.email || '',
      placa: ordem.placa,
      veiculo: ordem.veiculo,
      anoCarro: ordem.anoCarro,
      solicitacao: ordem.solicitacao,
      chassi: ordem.solicitacao, // o PDF ainda lê este campo (comportamento herdado do protótipo)
      // A API devolve só os nomes dos serviços (o preço de cada um não é guardado); o total fica em "orcamento".
      servicos: (ordem.servicos || []).map(nome => ({ nome, preco: '' })),
      previsao: ordem.previsao || '',
      orcamento: numeroParaBR(ordem.orcamento),
      status: ordem.status,
      etapa: ordem.etapa,
      conclusao: ordem.previsao || 'A definir',
      pagamento: ordem.formaPagamento || '',
    };
  }

  // Monta o corpo enviado ao servidor a partir dos dados digitados na tela de OS:
  // junta o cliente em um objeto e converte os preços para número
  // (o funcionário que abre a ordem é identificado pelo token enviado no cabeçalho).
  //USER: Vinicius Sanches
  //userC: Vinicius Sanches
  function corpoDaOrdem(dados) {
    return {
      cliente: { nome: dados.cliente, cpf: dados.cpf, telefone: dados.telefone, email: dados.email },
      placa: dados.placa,
      veiculo: dados.veiculo,
      anoCarro: dados.anoCarro,
      solicitacao: dados.solicitacao,
      previsao: dados.previsao,
      servicos: (dados.servicos || []).map(s => ({ nome: s.nome, preco: brParaNumero(s.preco) })),
    };
  }

  // ---------------------------------------------------------
  // ORDENS DE SERVIÇO: chamadas à API
  // ---------------------------------------------------------

  // Cria uma ordem de serviço. Recebe os dados da tela (ver corpoDaOrdem) e
  // devolve a ordem criada, já com o id e o orçamento calculado pelo servidor.
  //USER: Vinicius Sanches
  //userC: Vinicius Sanches
  async function criarOrdem(dados) {
    return ordemParaTela(await requisicao('/ordens', 'POST', corpoDaOrdem(dados)));
  }

  // Lista todas as ordens (da mais antiga para a mais nova).
  //USER: Vinicius Sanches
  //userC: Vinicius Sanches
  async function listarOrdens() {
    return (await requisicao('/ordens', 'GET')).map(ordemParaTela);
  }

  // Lista as ordens de uma placa (usado no Histórico do Veículo).
  //USER: Vinicius Sanches
  //userC: Vinicius Sanches
  async function listarOrdensPorPlaca(placa) {
    return (await requisicao('/ordens?placa=' + encodeURIComponent(placa), 'GET')).map(ordemParaTela);
  }

  // Lista as ordens de um CPF (usado para repetir o último veículo na tela de OS).
  //USER: Vinicius Sanches
  //userC: Vinicius Sanches
  async function listarOrdensPorCpf(cpf) {
    return (await requisicao('/ordens?cpf=' + encodeURIComponent(cpf), 'GET')).map(ordemParaTela);
  }

  // Busca uma ordem pelo id. Lança erro (status 404) se não existir.
  //USER: Vinicius Sanches
  //userC: Vinicius Sanches
  async function buscarOrdem(id) {
    return ordemParaTela(await requisicao('/ordens/' + encodeURIComponent(id), 'GET'));
  }

  // Busca a "ordem atual" (a guardada em localStorage pela tela de OS ou pela lista).
  // Devolve null quando não há ordem atual ou quando o id guardado não existe mais;
  // outros erros (servidor desligado, por exemplo) são lançados para a tela tratar.
  //USER: Vinicius Sanches
  //userC: Vinicius Sanches
  async function buscarOrdemAtual() {
    const id = localStorage.getItem(CHAVE_ORDEM_ATUAL);
    if (!id) return null;
    try {
      return await buscarOrdem(id);
    } catch (erro) {
      if (erro.status === 404 || erro.status === 400) return null;
      throw erro;
    }
  }

  // Confirma o pagamento de uma ordem. "forma" é PIX, BOLETO, CARTÃO, DÉBITO ou CRÉDITO.
  // A ordem passa para "Pagamento confirmado" e etapa 2. Erro 409 = já estava paga.
  //USER: Vinicius Sanches
  //userC: Vinicius Sanches
  async function pagarOrdem(id, forma) {
    return ordemParaTela(await requisicao('/ordens/' + encodeURIComponent(id) + '/pagamento', 'PUT', { forma }));
  }

  // Atualiza status, etapa e/ou previsão de uma ordem (ex.: { etapa: 3 }).
  // Ainda não há tela que use; fica pronta para o fluxo do mecânico.
  //USER: Vinicius Sanches
  //userC: Vinicius Sanches
  async function atualizarOrdem(id, campos) {
    return ordemParaTela(await requisicao('/ordens/' + encodeURIComponent(id), 'PUT', campos));
  }

  // Apaga uma ordem (e os serviços dela) do banco.
  //USER: Vinicius Sanches
  //userC: Vinicius Sanches
  function apagarOrdem(id) {
    return requisicao('/ordens/' + encodeURIComponent(id), 'DELETE');
  }

  // Busca os indicadores do painel de gestão, calculados pelo banco:
  // { totalOrdens, servicosMes, servicosMesAnterior, servicosSolicitados:[{nome,quantidade}], tempoMedioMinutos }.
  //USER: Vinicius Sanches
  //userC: Vinicius Sanches
  function buscarPainel() {
    return requisicao('/painel', 'GET');
  }

  // ---------------------------------------------------------
  // CLIENTES (rotas /clientes). O cliente não tem senha nem login.
  // A tela usa a data como DD/MM/AAAA; a API usa AAAA-MM-DD.
  // ---------------------------------------------------------

  // "25/12/1990" -> "1990-12-25". Texto fora desse formato segue como está (a API recusa com mensagem).
  //userC: Vinicius Sanches
  function dataBRparaISO(texto) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(texto ?? '').trim());
    return m ? `${m[3]}-${m[2]}-${m[1]}` : String(texto ?? '').trim();
  }

  // "1990-12-25" -> "25/12/1990" (vazio se não houver data).
  //userC: Vinicius Sanches
  function dataISOparaBR(texto) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto || '');
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
  }

  // Cliente devolvido pela API, já com a data de nascimento no formato da tela.
  //userC: Vinicius Sanches
  function clienteParaTela(cliente) {
    return { ...cliente, dataNascimento: dataISOparaBR(cliente.dataNascimento) };
  }

  // Corpo enviado à API: { nome, cpf, telefone, email, dataNascimento }.
  //userC: Vinicius Sanches
  function corpoDoCliente(dados) {
    return {
      nome: dados.nome, cpf: dados.cpf, telefone: dados.telefone, email: dados.email,
      dataNascimento: dataBRparaISO(dados.dataNascimento),
    };
  }

  // Cadastra um cliente. Erro 409 = CPF ou e-mail já cadastrado.
  //userC: Vinicius Sanches
  async function cadastrarCliente(dados) {
    return clienteParaTela(await requisicao('/clientes', 'POST', corpoDoCliente(dados)));
  }

  // Lista todos os clientes.
  //userC: Vinicius Sanches
  async function listarClientes() {
    return (await requisicao('/clientes', 'GET')).map(clienteParaTela);
  }

  // Busca o cliente de um CPF (com ou sem máscara). Devolve null se não existir.
  //userC: Vinicius Sanches
  async function buscarClientePorCpf(cpf) {
    const lista = await requisicao('/clientes?cpf=' + encodeURIComponent(cpf), 'GET');
    return lista.length ? clienteParaTela(lista[0]) : null;
  }

  // Atualiza os dados de um cliente (mesmos campos do cadastro).
  //userC: Vinicius Sanches
  async function atualizarCliente(id, dados) {
    return clienteParaTela(await requisicao('/clientes/' + encodeURIComponent(id), 'PUT', corpoDoCliente(dados)));
  }

  // Remove um cliente (409 se ele já tem ordens de serviço).
  //userC: Vinicius Sanches
  function apagarCliente(id) {
    return requisicao('/clientes/' + encodeURIComponent(id), 'DELETE');
  }

  // Conjunto de chamadas disponíveis para as telas.
  //USER: Vinicius Sanches
  window.MimeticAPI = {
    url: API_URL,

    // Funções de sessão (ver acima).
    salvarSessao,
    lerSessao,
    encerrarSessao,

    // Autentica um FUNCIONÁRIO. Devolve { mensagem, funcionario: { id, nome, email }, token }.
    //USER: Vinicius Sanches
    //userC: Vinicius Sanches
    login: (email, senha) => requisicao('/login', 'POST', { email, senha }),

    // Cadastra um novo funcionário. Devolve { id, nome, email }.
    //USER: Vinicius Sanches
    //userC: Vinicius Sanches
    cadastrarFuncionario: (nome, email, senha) =>
      requisicao('/funcionarios', 'POST', { nome, email, senha }),

    // Recuperação de senha, passo 1: pede o envio do código de 6 dígitos por e-mail.
    // A resposta é a mesma exista o e-mail ou não.
    //USER: Vinicius Sanches
    //userC: Vinicius Sanches
    solicitarRecuperacao: (email) =>
      requisicao('/recuperar-senha/solicitar', 'POST', { email }),

    // Recuperação de senha, passo 2: troca a senha usando o código recebido.
    //USER: Vinicius Sanches
    //userC: Vinicius Sanches
    redefinirSenha: (email, codigo, novaSenha) =>
      requisicao('/recuperar-senha/redefinir', 'PUT', { email, codigo, novaSenha }),

    // Ordens de serviço, pagamento e painel (detalhes nas funções acima).
    criarOrdem,
    listarOrdens,
    listarOrdensPorPlaca,
    listarOrdensPorCpf,
    buscarOrdem,
    buscarOrdemAtual,
    pagarOrdem,
    atualizarOrdem,
    apagarOrdem,
    buscarPainel,

    // Clientes.
    cadastrarCliente,
    listarClientes,
    buscarClientePorCpf,
    atualizarCliente,
    apagarCliente,
  };
})();
