# MIMETIC SOFT - Projeto integrado (front-end + servidorREST)

Este projeto reúne o front-end (`HTML/`, `CSS/`, `JAVASCRIPT/`, `assets/`) e o
servidor da API (`servidorREST/`). Nesta versão, **login, cadastro de
funcionário, clientes, ordens de serviço, pagamento e painel de gestão já
funcionam de verdade com o MySQL**. O passo a passo para novas telas está no
[guia da seção 5](#5-como-aplicar-o-resto-da-api).

**Organização em grupo:** a linha logo acima de cada função traz o autor
(`//USER: Nome` ou `//userC: Nome`). Ao criar uma função nova, adicione o seu.

---

## 1. Como rodar

**Servidor (API)** - dentro de `servidorREST/`:

```bash
npm install
# copie .env.example para .env e preencha o MySQL e o JWT_SECRET (veja o comentário no arquivo)
npm start                   # ou: npm run dev  (reinicia ao salvar)
```

Abra `http://localhost:3000` - deve responder `{"status":"ok", ...}`.

**Front-end** - abrir `HTML/tela-login.html` com o Live Server (porta 5501).
O endereço da API fica em um único lugar: `JAVASCRIPT/api-client.js`
(`http://localhost:3000`, ou defina `window.MIMETIC_API_URL` antes do script).

**Banco** - segue conforme arquivo do banco de dados no Google Drive. (exemplo no schema.sql)

> **Banco que já existe?** A tabela `ordem_servico` mudou (ver seção 5.2). Rode
> **uma vez** `servidorREST/migracao-ordens.sql` no MySQL. Em um banco novo, o
> `schema.sql` já vem com as mudanças. Sem isso, salvar uma ordem de serviço
> falha com "Unknown column 'servicos'" (ou 'cliente_nome'). O script também
> alarga `Funcionario.senha` para `VARCHAR(255)` (cabe o hash da seção 5.3) e pode
> ser rodado mais de uma vez. **Requer MySQL 8** (a conversão do JSON antigo usa `JSON_TABLE`, só durante a migração).

---

## 2. O que foi alterado

| Arquivo | Mudança |
|---|---|
| `HTML/tela-login.html`, `CSS/tela-login.css`, `JAVASCRIPT/tela-login.js` | **Substituídos** pelo design da `tela-login-mimetic`. Mantive o nome `tela-login.html` para que todos os redirecionamentos do sistema continuem funcionando. Fundo em `assets/fundo-login.png`. |
| `JAVASCRIPT/api-client.js` | **Novo.** Único arquivo que fala com a API + funções de sessão do funcionário. Foi incluído em todas as telas, antes do `app-core.js`. |
| `JAVASCRIPT/app-core.js` | **Enxuto** (131 linhas): só sessão, nome no cabeçalho, menu "Sair", botão VOLTAR e APAGAR ordem. |
| `JAVASCRIPT/tela-comum.js` | **Novo.** Funções repetidas entre telas (`window.MimeticTela`): leitura de campos, máscara de placa, aviso "Campo obrigatório", requisitos da senha, `finalizarPagamento`. Carregado depois do `api-client.js`. |
| `servidorREST/` | **Unificado** ao projeto e corrigido (ver seção 4). Ganhou as rotas de ordens, pagamento e painel. |
| `servidorREST/server.js`, `routes/funcionarios.js`, `routes/ordens.js`, `utils/validacoes.js` | Rotas `/ordens`, `/ordens/:id/pagamento` e `/painel`, com validações novas. |
| `servidorREST/schema.sql`, `migracao-ordens.sql` | `ordem_servico`: `id_cliente` passou a aceitar NULL e ganhou 4 colunas com os dados do cliente (seção 5.2). |
| `JAVASCRIPT/api-client.js` | Novas funções de ordens, pagamento e painel + conversão de valores (`150.5` <-> `"150,50"`). Passou a ser carregado **antes** do script de cada tela. |
| `JAVASCRIPT/app-core.js`, `tela-pagamento.js`, `tela-pagamento-pix.js`, `tela-boleto.js`, `tela-cartao.js` | Deixaram de ler/gravar ordens no `localStorage` e passaram a usar a API. |
| Demais `JAVASCRIPT/*.js` | Apenas **comentários** explicando cada função. Nenhuma lógica alterada. |

Comportamentos novos da tela de login:

- **Login e "Criar conta"** usam a API (`/login` e `/funcionarios`). O cadastro
  exige a senha forte (mesmas regras das outras telas) e, ao concluir, volta ao
  login com o e-mail preenchido.
- **"Manter conectado"** agora funciona: marcado, a sessão fica no
  `localStorage`; desmarcado, fica no `sessionStorage` (termina ao fechar a aba).
- **"Esqueci minha senha"** leva ao fluxo de recuperação (agora ligado à API).
- **Telas internas exigem login.** Abrir `tela-principal.html` (ou qualquer tela
  interna) sem estar logado volta para o login. Para desligar durante testes,
  mude `EXIGIR_LOGIN` para `false` no topo do `app-core.js`.
- Os ícones da tela vêm do CDN do Ionicons (precisa de internet), como já era
  na tela original.
- Mantive a caixa de login **fechada até clicar em "Login" no cabeçalho**, como
  era no design recebido. Se preferir que abra sozinha, adicione
  `wrapper.classList.add('active-popup');` no fim de `tela-login.js`.
- No design original, `<h2 class="Nome">` não recebe o estilo `.nome` do CSS
  (maiúscula x minúscula). Deixei como veio para não alterar o visual.

---

## 3. Funcionário x Cliente: o que foi encontrado e corrigido

Você pediu para verificar se cadastro de funcionário e de cliente estavam
misturados. Estavam, em três pontos do `app-core.js` original:

1. **Login aceitava cliente.** O login procurava o e-mail/senha na lista de
   funcionários **e** na de clientes, e um cliente entrava no mesmo painel do
   funcionário, com o nome dele no menu.
2. **Um único "usuário logado".** A chave `mimeticUsuarioLogado` guardava tanto
   funcionário quanto cliente, e o nome do cabeçalho dependia de `tipo === 'cliente'`.
3. **Recuperação de senha** procurava em funcionários e clientes.

Além disso, o cadastro de cliente tinha um ramo "público" (sem ninguém logado,
voltava para o login), como se o cliente pudesse se cadastrar sozinho.

**Como ficou:**

- Só **funcionário** tem login, sessão (`mimeticFuncionarioLogado`) e recuperação
  de senha. Cliente **nunca** entra no sistema.
- O funcionário logado cadastra clientes na tela "Cadastrar Cliente". O cliente
  vai para a lista de clientes e **não altera a sessão nem a tabela de
  funcionários**. Cadastrar um cliente não transforma ninguém em cliente.
- O cadastro de cliente só abre com funcionário logado e volta para a tela principal.
- Chaves antigas (`mimeticUsuarioLogado`, `mimeticFuncionarioNome`) são apagadas no logout.

Isso foi conferido no navegador: ao cadastrar um cliente, a lista de funcionários
não muda, quem está logado continua sendo o funcionário, e as credenciais do
cliente **não** dão acesso ao sistema.

O formulário de cliente **não tem campo de senha** (cliente não faz login).

---

## 4. servidorREST (unificado e corrigido)

Rotas atuais (todas tratam **apenas funcionários**):

| Método | Rota | Função |
|---|---|---|
| GET | `/` | Teste: servidor no ar |
| POST | `/login` | Autentica funcionário `{ email, senha }`; devolve os dados dele e o **token** |
| POST | `/funcionarios` | Cadastra `{ nome, email, senha }` |
| GET | `/funcionarios` | Lista (id, nome, e-mail). **Exige token** |
| PUT | `/funcionarios/:id` | Atualiza campos enviados. **Exige token; só o próprio cadastro** |
| DELETE | `/funcionarios/:id` | Remove. **Exige token; só o próprio cadastro** |
| POST | `/recuperar-senha/solicitar` | `{ email }`: gera e envia o código de 6 dígitos (resposta igual exista o e-mail ou não) |
| PUT | `/recuperar-senha/redefinir` | `{ email, codigo, novaSenha }`: troca a senha se o código estiver certo e válido |
| POST | `/ordens` | **Exige token.** Cria a ordem `{ cliente:{nome,cpf,telefone,email}, placa, veiculo, anoCarro, solicitacao, previsao, servicos:[{nome,preco}] }`. O **orçamento é calculado pelo servidor** (soma dos serviços). Ordem e serviços são gravados juntos (transação). |
| GET | `/ordens` | Lista as ordens, com os serviços. Filtros opcionais: `?placa=` e `?cpf=` |
| GET | `/ordens/:id` | Busca uma ordem (usada pela "ordem atual" nas telas de pagamento e acompanhamento) |
| PUT | `/ordens/:id` | Atualiza `status`, `etapa` (1 a 4) e/ou `previsao`. **Ainda sem tela**; pronta para o fluxo do mecânico |
| PUT | `/ordens/:id/pagamento` | `{ forma }` (PIX, BOLETO, CARTÃO, DÉBITO, CRÉDITO): marca "Pagamento confirmado" e etapa 2. Ordem já paga -> 409 |
| PUT | `/ordens/:id/conclusao` | Conclui o serviço: status "Concluída" e etapa 4. Só ordem com pagamento confirmado; concluída/cancelada/sem pagamento -> 409 |
| PUT | `/ordens/:id/cancelamento` | Cancela a ordem: `UPDATE` do status para "Cancelada" (**nada é apagado do banco**). Concluída ou já cancelada -> 409 |
| GET | `/painel` | Indicadores calculados no banco: ordens do mês e do mês anterior, 2 serviços mais pedidos |

---

## 5. Como aplicar o resto da API

### 5.1 Padrão a seguir (vale para todas as telas)

1. **Servidor:** criar a rota em `servidorREST/server.js` (ou, quando crescer,
   criar `routes/clientes.js` com `express.Router()` e ligá-lo em `server.js` com `app.use(clientes)`, como já é feito com `routes/funcionarios.js` e `routes/ordens.js`).
   Sempre validar no servidor e usar `?` nas queries (nunca concatenar texto).
2. **Front:** adicionar a função correspondente em `MimeticAPI`
   (`JAVASCRIPT/api-client.js`). Nenhuma tela deve usar `fetch` direto.
3. **Tela:** trocar o `read('mimeticXxx')`/`write(...)` do `localStorage` por
   `await api().função(...)`. Os locais estão listados abaixo.

### 5.2 Situação de cada dado

| Dado | Situação | Onde ficou |
|---|---|---|
| **Ordens de serviço** (criar, listar em andamento, histórico por placa, concluir, cancelar) | **Feito (API)** | `routes/ordens.js`, `tela-ordem-servico.js`, `tela-servicos-andamento.js`, `tela-historico-veiculo.js`, `app-core.js` (concluir/cancelar), `api-client.js` |
| **Ordem atual** | **Feito (API)**. O `localStorage` guarda só o **id** (`mimeticOrdemAtual`); os dados vêm de `GET /ordens/:id` | `tela-pagamento.js`, `tela-pagamento-pix.js`, `tela-boleto.js`, `tela-cartao.js`, `tela-acompanhamento.js` |
| **Pagamento** (status/etapa) | **Feito (API)** | `PUT /ordens/:id/pagamento`, `finalizarPagamento` em `tela-comum.js` |
| **Painel de gestão** | **Feito (API)**, calculado no banco | `GET /painel`, `tela-painel-gestao.js` |
| **Forma de pagamento escolhida** `mimeticFormaPagamento` | Continua em `localStorage` de propósito: é só a escolha entre duas telas; vai para o banco quando o pagamento é confirmado | `tela-pagamento.js` |
| **Clientes** | **Feito (API)**: tabela `Cliente`. O `localStorage` `mimeticClientes` deixou de ser usado | `routes/clientes.js`, `api-client.js`, `tela-cadastro-cliente.js`, `tela-ordem-servico.js` (preenche por CPF), `tela-boleto.js` (e-mail) |
| **Recuperação de senha** | **Feito (API)** com código de 6 dígitos; o envio por e-mail ainda não está configurado (aparece no console do servidor) | ver 5.3 |

**Dados antigos:** o `localStorage` antigo (`mimeticOrdens`) deixou de ser usado.
Ordens que só existiam lá não aparecem mais. Para limpar, apague essa chave em
"Application > Local Storage" do navegador.

#### O que mudou no banco (e por quê)

A ordem de serviço ainda não é ligada à tabela `Cliente` e o
`ordem_servico` do `schema.sql` exigia `id_cliente NOT NULL`. Para ser possível
salvar uma ordem, ela passou a guardar os dados do cliente nela mesma:

- `id_cliente` agora aceita **NULL**.
- Novas colunas: `cliente_nome`, `cliente_cpf`, `cliente_telefone`, `cliente_email`.
- Nova coluna de **texto** `servicos`: os serviços ficam escritos como as opções da
  tela, separados por vírgula (ex.: `Troca de óleo, Alinhamento`). Não existe tabela
  separada de itens. O **preço de cada serviço não é guardado**: o banco guarda só o
  orçamento total (`orcamento`), somado pela API. Vírgulas digitadas em "Outro serviço"
  viram espaço. O painel conta os nomes a partir desse texto (sem contar ordens canceladas). A API devolve `servicos` como lista de nomes. O PDF de uma ordem
  já salva mostra os nomes e o total, sem valor por item.
- Aplicar em banco existente: `servidorREST/migracao-ordens.sql`.

#### Clientes (API pronta)

Rotas (todas exigem login): `POST /clientes`, `GET /clientes` (`?cpf=`),
`GET /clientes/:id`, `PUT /clientes/:id`, `DELETE /clientes/:id`.
Campos: `nome`, `cpf` (11 números, guardado como `000.000.000-00`), `telefone`,
`email`, `dataNascimento` (AAAA-MM-DD na API; a tela usa DD/MM/AAAA).

- CPF ou e-mail repetido responde **409** (antes, a tela atualizava o cliente
  em silêncio). Apagar cliente que já tem ordens ou agendamentos também dá 409.
- **Banco existente:** rodar `migracao-ordens.sql` (cria `Cliente.data_nascimento`).
- O formulário de cliente não pede senha: a tabela `Cliente` não tem senha e cliente não faz login.
- A validação do CPF confere só o formato (11 números), não os dígitos verificadores.

**Ordem ligada ao cliente:** ao criar uma ordem (`POST /ordens`), o servidor procura
o CPF na tabela `Cliente` (com ou sem máscara):

- **CPF já cadastrado:** a ordem usa o `id_cliente` dele (os dados do cliente não mudam).
- **CPF novo:** o servidor **cadastra o cliente** (nome, e-mail, telefone e CPF) na tabela
  `Cliente`, como a tela de cadastro de cliente, e liga a ordem a ele. Isso acontece na
  mesma transação da ordem: se a ordem falhar, o cliente também não é criado.
- **E-mail** que já pertence a outro cliente (ou inválido): o cliente é criado sem
  e-mail, e a ordem continua guardando o e-mail digitado.
- **Sem nome ou com CPF fora do formato:** a ordem é salva do mesmo jeito, sem cliente
  (`id_cliente` vazio).

As colunas `cliente_*` da ordem continuam guardando o que foi digitado. Depois de ligada,
a ordem de um cliente passa a impedir que ele seja apagado (409). A data de nascimento
fica vazia (a tela de OS não pede).

#### Cada funcionário vê só as suas ordens

Toda ordem guarda o funcionário que a criou (`id_funcionario`, vindo do token de
login). Todas as rotas de `/ordens` e o `/painel` filtram por esse funcionário:

- listar (inclusive as buscas por placa e CPF), abrir, editar, pagar, concluir e cancelar só
  funcionam nas **próprias** ordens;
- a ordem de outro funcionário responde **404** (como se não existisse);
- os números do painel de gestão também são só das ordens do funcionário logado;
- o `idFuncionario` enviado no corpo de uma ordem é ignorado.

Os **clientes** continuam compartilhados entre todos os funcionários (o cadastro de
cliente é único por CPF). Ordens antigas ficam com o funcionário que as abriu.

#### Pontos de atenção encontrados nesta etapa

- **O campo `solicitacao` da tela de OS é, na prática, o número do chassi.** O
  input tem o placeholder "Digite o nº do chassi" e o PDF imprime esse valor
  como chassi. Por isso o painel **não** usa esse campo para "serviços mais
  solicitados" (contaria chassis): usa os **serviços** da coluna
  `servicos` de `ordem_servico`. Sugestão: renomear a coluna/campo para `chassi`.
- **Abrir uma ordem exige funcionário logado**, porque a tabela guarda quem a
  abriu (`id_funcionario NOT NULL`). Com `EXIGIR_LOGIN = false` dá para abrir as
  telas sem login, mas salvar uma ordem mostra "Faça login...".
- **A placa passou a ser obrigatória ao salvar** (a coluna é `NOT NULL`). Antes só
  o CPF era obrigatório na tela; agora, sem placa, a API recusa e a tela mostra o aviso.
- **Tempo médio do painel** continua "A calcular": o banco ainda não guarda a
  data de conclusão. Quando existir (`concluida_em`), calcular no `GET /painel`.
- **Ordens não são mais apagadas:** o botão CANCELAR faz `UPDATE` do status para "Cancelada" e o
  botão CONCLUIR (só em ordem paga) marca "Concluída" e etapa 4. Na tela de ordens em andamento, o botão CONFIRMAR PAGAMENTO (só em ordem aguardando
  pagamento; atalho de testes, pergunta a forma) usa `PUT /ordens/:id/pagamento`. Ela
  mostra só as que não estão concluídas nem canceladas; o histórico do veículo mostra todas.
  Concluída ou cancelada não muda mais (409). O painel não conta as canceladas.
  Não existe mais `DELETE /ordens/:id`.
- **Nomes de tabela:** o `schema.sql` cria `Funcionario` e `Cliente` com inicial
  maiúscula, mas o servidor consulta `funcionario` em minúsculas. Funciona em
  Windows e Mac (MySQL ignora maiúsculas/minúsculas); em **Linux** falha. Se forem
  hospedar em Linux, padronizem os nomes.

### 5.3 Segurança: fazer antes de usar de verdade

1. **Senhas com hash: FEITO.** Ficam no banco como `scrypt$<sal>$<hash>` (168
   caracteres, cabem em `VARCHAR(255)`), com sal aleatório por senha
   (`servidorREST/utils/senha.js`). O `/login` busca só pelo e-mail e compara em
   tempo constante; e-mail inexistente e senha errada recebem a mesma resposta.
   **Senhas antigas em texto puro** continuam funcionando e são convertidas em hash
   no primeiro login de cada pessoa. Para converter todos de uma vez, depois do
   `migracao-ordens.sql`, rode: `cd servidorREST && node scripts/migrar-senhas.js`
   (pode repetir; só mexe em quem ainda está em texto puro).
2. **Login com token: FEITO.** O `/login` devolve um token (JWT HS256, validade de
   12 h, configurável) que o front-end guarda na sessão e envia em
   `Authorization: Bearer ...`. **Exigem token:** `/ordens`, `/ordens/:id`,
   `/ordens/:id/pagamento`, `/ordens/:id/conclusao`, `/ordens/:id/cancelamento`, `/painel` e `GET/PUT/DELETE /funcionarios`. O funcionário
   que abre a ordem é o do **token** (um `idFuncionario` enviado no corpo é ignorado).
   `PUT` e `DELETE /funcionarios/:id` só valem para o **próprio** cadastro (403 nos demais).
   Se o token vencer, o front-end encerra a sessão e volta ao login.
   **Configure o `JWT_SECRET`** no `.env` (veja `.env.example`). Sem ele o servidor sobe
   com um segredo temporário e **todo mundo perde o login a cada reinício**.
   Continuam públicos: `GET /`, `POST /login`, `POST /funcionarios` (item 4) e a recuperação de senha.
3. **Recuperação de senha com código: FEITO, mas o envio de e-mail NÃO.** A pessoa
   informa o e-mail e recebe um código de 6 dígitos (vale 15 min, uso único,
   bloqueado após 5 tentativas erradas; só o hash dele fica na tabela
   `recuperacao_senha`). A resposta é igual exista o e-mail ou não. **O projeto ainda não
   tem servidor de e-mail:** em desenvolvimento o código aparece no **console do
   servidor**; com `NODE_ENV=production` ele não é impresso e a recuperação não
   funciona até alguém ligar o envio real (troque o corpo de `enviarCodigoRecuperacao`
   em `utils/recuperacao.js`, por exemplo com nodemailer/SMTP).
4. **Criar conta na tela de login é público:** qualquer pessoa vira funcionário.
   O design recebido tem esse botão, então mantive. Recomendo que só um
   funcionário logado (ou administrador) possa cadastrar outros. A tela
   `tela-cadastro-funcionario.html` já exige login, mas hoje **nenhum botão leva a
   ela**; abre só pela URL. Pode virar o cadastro "oficial" e o popup público sair.
5. `cors()` está aberto a qualquer origem. Em produção, liberar só o endereço do front-end.
6. Permissões por perfil (atendente x mecânico) continuam em aberto, como no protótipo.

---

## 6. Como foi testado

- **API (57 chamadas):** criar ordem (válida, sem CPF, sem placa, placa longa, data
  impossível, preço negativo/gigante/texto, 51 serviços, JSON quebrado, funcionário
  inexistente), orçamento calculado pelo servidor, falha no meio não deixa ordem
  pela metade, listar e filtrar por placa, busca por id (inclusive `1; DROP TABLE`),
  pagamento (5 formas, pagar duas vezes, forma inválida), PUT e DELETE.
- **Painel (6 verificações):** contagem do mês e do mês anterior com datas nos
  limites (1º dia 00:00:00 e último segundo do mês), ranking dos 2 serviços e desempate.
- **Navegador (34 verificações, Chromium):** login; aviso ao abrir ordem sem login;
  cliente no `localStorage`; preenchimento por CPF; orçamento somado; ordem gravada
  no banco com funcionário e cliente; pagamento por PIX, boleto e cartão (12 parcelas);
  acompanhamento na etapa 2; ordem já paga; lista em andamento; PDF da ordem salva;
  histórico por placa; painel; APAGAR; e servidor fora do ar (aviso amigável, sem números falsos).
- **Regressão (21 verificações):** login, cadastro de funcionário, recuperação de senha,
  cliente x funcionário e logout continuam funcionando.
