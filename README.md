# MIMETIC SOFT

**Sistema de gestão para oficina mecânica**: ordens de serviço, clientes, pagamentos,
acompanhamento do veículo e painel de gestão, com front-end web, API REST e banco
de dados MySQL. O ambiente completo pode ser executado com **Docker**.

> **Organização em grupo:** a linha logo acima de cada função traz o autor
> (`//USER: Nome` ou `//userC: Nome`). Ao criar uma função nova, adicione o seu.

---

## Sumário

1. [Sobre o projeto](#1-sobre-o-projeto)
2. [Tecnologias](#2-tecnologias)
3. [Estrutura do projeto](#3-estrutura-do-projeto)
4. [Como executar](#4-como-executar)
5. [Ambiente virtualizado (Docker)](#5-ambiente-virtualizado-docker)
6. [Histórico de alterações](#6-histórico-de-alterações)
7. [Funcionário x Cliente](#7-funcionário-x-cliente)
8. [API REST (servidorREST)](#8-api-rest-servidorrest)
9. [Guia de desenvolvimento](#9-guia-de-desenvolvimento)
10. [Testes realizados](#10-testes-realizados)

---

## 1. Sobre o projeto

O MIMETIC SOFT reúne, em um único repositório, o **front-end** (telas do sistema)
e o **servidor da API** (`servidorREST`). Login, cadastro de funcionário, clientes,
ordens de serviço, pagamento e painel de gestão **funcionam integrados ao MySQL**.

Principais funcionalidades:

- Login de funcionários com senha protegida por hash e sessão por token (JWT)
- Cadastro de clientes e de funcionários
- Abertura de ordens de serviço com orçamento calculado pelo servidor
- Pagamento por PIX, boleto e cartão
- Acompanhamento das etapas do serviço e histórico por placa do veículo
- Painel de gestão com indicadores do mês
- Geração de PDF da ordem de serviço
- Recuperação de senha com código de 6 dígitos

---

## 2. Tecnologias

| Camada | Tecnologia |
|---|---|
| Front-end | HTML5, CSS3 e JavaScript |
| Back-end | Node.js e Express |
| Banco de dados | MySQL 8 |
| Autenticação | JWT (HS256) e senhas com `scrypt` |
| Virtualização | Docker, Docker Compose e Nginx |

---

## 3. Estrutura do projeto

```
Mimetic-Soft/
├── HTML/                    # Telas do sistema
├── CSS/                     # Estilos de cada tela
├── JAVASCRIPT/              # Lógica das telas e cliente da API (api-client.js)
├── assets/                  # Imagens (logo e fundos)
├── servidorREST/            # API REST (Node.js + Express)
│   ├── routes/              # Rotas: funcionários, clientes e ordens
│   ├── database/            # Conexão com o MySQL
│   ├── utils/               # Autenticação, senha, validações, recuperação
│   ├── scripts/             # Scripts de manutenção (migrar-senhas.js)
│   ├── schema.sql           # Estrutura do banco de dados
│   └── Dockerfile           # Imagem Docker da API
├── docker/                  # Configurações do ambiente Docker
│   ├── nginx/default.conf   # Servidor web do front-end
│   ├── mysql/               # Scripts extras de criação do banco
│   └── env.exemplo          # Modelo de variáveis por ambiente
├── Dockerfile.frontend      # Imagem Docker do front-end
├── docker-compose.yml       # Sobe front-end, API e banco juntos
├── DOCKER.md                # Documentação do ambiente virtualizado
└── README.md
```

---

## 4. Como executar

### 4.1 Com Docker (recomendado)

Pré-requisito: [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e aberto.

```bash
docker compose up -d --build
```

| Serviço | Endereço |
|---|---|
| Sistema (front-end) | http://localhost:8080 |
| API | http://localhost:3000 |
| Banco de dados (MySQL) | `localhost:3307` |

Na primeira execução o banco é criado vazio a partir do `schema.sql`. Cadastre um
funcionário em **Login → Registre-se** para acessar o sistema.

Comandos úteis:

```bash
docker compose ps              # status dos containers
docker compose logs -f api     # log da API
docker compose down            # para o ambiente (mantém os dados)
docker compose down -v         # para o ambiente e apaga o banco
```

> Pare o `npm start` local antes de subir o Docker: os dois usam a porta 3000.

### 4.2 Sem Docker (execução manual)

**Servidor (API)**, dentro de `servidorREST/`:

```bash
npm install
# copie .env.example para .env e preencha o MySQL e o JWT_SECRET
npm start                   # ou: npm run dev  (reinicia ao salvar)
```

Abra `http://localhost:3000`: deve responder `{"status":"ok", ...}`.

**Front-end:** abrir `HTML/tela-login.html` com o Live Server (porta 5501).
O endereço da API fica em um único lugar: `JAVASCRIPT/api-client.js`
(`http://localhost:3000`, ou defina `window.MIMETIC_API_URL` antes do script).

**Banco:** criar com `servidorREST/schema.sql` (MySQL 8). A tabela
`recuperacao_senha`, usada na recuperação de senha, está em
`docker/mysql/02-recuperacao-senha.sql`.

> **Banco que já existe?** A tabela `ordem_servico` mudou (ver seção 9.2). Rode
> **uma vez** o script `migracao-ordens.sql` no MySQL. Em um banco novo, o
> `schema.sql` já vem com as mudanças. Sem isso, salvar uma ordem de serviço
> falha com "Unknown column 'servicos'" (ou 'cliente_nome'). O script também
> alarga `Funcionario.senha` para `VARCHAR(255)` (cabe o hash da seção 9.3) e pode
> ser rodado mais de uma vez. **Requer MySQL 8** (a conversão do JSON antigo usa
> `JSON_TABLE`, só durante a migração).

---

## 5. Ambiente virtualizado (Docker)

O sistema roda em três containers ligados por uma rede interna (`mimetic-net`):

| Container | Imagem base | Porta | Função |
|---|---|---|---|
| `mimetic-frontend` | `nginx:1.27-alpine` | 8080 | Entrega as telas do sistema |
| `mimetic-api` | `node:22-alpine` | 3000 | API REST (servidorREST) |
| `mimetic-db` | `mysql:8.4` | 3307 | Banco de dados `oficina_mecanica` |

- **Banco automático:** na primeira subida, o MySQL executa o `schema.sql` e os scripts de `docker/mysql/`.
- **Dados persistentes:** o volume `mimetic-db-data` mantém o banco entre reinícios.
- **Ordem de inicialização:** a API só inicia quando o banco responde (healthcheck).
- **Ambientes:** desenvolvimento, testes, homologação e produção usam o mesmo
  `docker-compose.yml`; muda apenas o arquivo `.env` na raiz (modelo em `docker/env.exemplo`).

O levantamento, as decisões e o detalhamento de cada ambiente estão em
**[DOCKER.md](DOCKER.md)**.

---

## 6. Histórico de alterações

| Arquivo | Mudança |
|---|---|
| `HTML/tela-login.html`, `CSS/tela-login.css`, `JAVASCRIPT/tela-login.js` | **Substituídos** pelo design da `tela-login-mimetic`. O nome `tela-login.html` foi mantido para que todos os redirecionamentos do sistema continuem funcionando. Fundo em `assets/fundo-login.png`. |
| `JAVASCRIPT/api-client.js` | **Novo.** Único arquivo que fala com a API + funções de sessão do funcionário. Foi incluído em todas as telas, antes do `app-core.js`. |
| `JAVASCRIPT/app-core.js` | **Enxuto** (131 linhas): só sessão, nome no cabeçalho, menu "Sair", botão VOLTAR e APAGAR ordem. |
| `JAVASCRIPT/tela-comum.js` | **Novo.** Funções repetidas entre telas (`window.MimeticTela`): leitura de campos, máscara de placa, aviso "Campo obrigatório", requisitos da senha, `finalizarPagamento`. Carregado depois do `api-client.js`. |
| `servidorREST/` | **Unificado** ao projeto e corrigido (ver seção 8). Ganhou as rotas de ordens, pagamento e painel. |
| `servidorREST/server.js`, `routes/funcionarios.js`, `routes/ordens.js`, `utils/validacoes.js` | Rotas `/ordens`, `/ordens/:id/pagamento` e `/painel`, com validações novas. |
| `servidorREST/schema.sql`, `migracao-ordens.sql` | `ordem_servico`: `id_cliente` passou a aceitar NULL e ganhou 4 colunas com os dados do cliente (seção 9.2). |
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
- A caixa de login fica **fechada até clicar em "Login" no cabeçalho**, como
  no design recebido. Para que abra sozinha, adicione
  `wrapper.classList.add('active-popup');` no fim de `tela-login.js`.
- No design original, `<h2 class="Nome">` não recebe o estilo `.nome` do CSS
  (maiúscula x minúscula). Foi mantido assim para não alterar o visual.

---

## 7. Funcionário x Cliente

Na revisão do protótipo, os cadastros de funcionário e de cliente estavam
misturados em três pontos do `app-core.js` original:

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

## 8. API REST (servidorREST)

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
| POST | `/ordens` | **Exige token.** Cria a ordem `{ cliente:{nome,cpf,telefone,email}, placa, veiculo, anoCarro, chassi, previsao, servicos:[{nome,preco}] }`. O **orçamento é calculado pelo servidor** (soma dos serviços). Ordem e serviços são gravados juntos (transação). |
| GET | `/ordens` | Lista as ordens, com os serviços. Filtros opcionais: `?placa=` e `?cpf=` |
| GET | `/ordens/:id` | Busca uma ordem (usada pela "ordem atual" nas telas de pagamento e acompanhamento) |
| PUT | `/ordens/:id` | Atualiza `status`, `etapa` (1 a 4) e/ou `previsao`. **Ainda sem tela**; pronta para o fluxo do mecânico |
| PUT | `/ordens/:id/pagamento` | `{ forma }` (PIX, BOLETO, CARTÃO, DÉBITO, CRÉDITO): marca "Pagamento confirmado" e etapa 2. Ordem já paga -> 409 |
| PUT | `/ordens/:id/conclusao` | Conclui o serviço: status "Concluída" e etapa 4. Só ordem com pagamento confirmado; concluída/cancelada/sem pagamento -> 409 |
| PUT | `/ordens/:id/cancelamento` | Cancela a ordem: `UPDATE` do status para "Cancelada" (**nada é apagado do banco**). Concluída ou já cancelada -> 409 |
| GET | `/painel` | Indicadores calculados no banco: ordens do mês e do mês anterior, 2 serviços mais pedidos |

---

## 9. Guia de desenvolvimento

### 9.1 Padrão para novas funcionalidades

1. **Servidor:** criar a rota em `servidorREST/server.js` (ou, quando crescer,
   criar `routes/clientes.js` com `express.Router()` e ligá-lo em `server.js` com `app.use(clientes)`, como já é feito com `routes/funcionarios.js` e `routes/ordens.js`).
   Sempre validar no servidor e usar `?` nas queries (nunca concatenar texto).
2. **Front:** adicionar a função correspondente em `MimeticAPI`
   (`JAVASCRIPT/api-client.js`). Nenhuma tela deve usar `fetch` direto.
3. **Tela:** trocar o `read('mimeticXxx')`/`write(...)` do `localStorage` por
   `await api().função(...)`. Os locais estão listados abaixo.

### 9.2 Situação de cada dado

| Dado | Situação | Onde ficou |
|---|---|---|
| **Ordens de serviço** (criar, listar em andamento, histórico por placa, concluir, cancelar) | **Feito (API)** | `routes/ordens.js`, `tela-ordem-servico.js`, `tela-servicos-andamento.js`, `tela-historico-veiculo.js`, `app-core.js` (concluir/cancelar), `api-client.js` |
| **Ordem atual** | **Feito (API)**. O `localStorage` guarda só o **id** (`mimeticOrdemAtual`); os dados vêm de `GET /ordens/:id` | `tela-pagamento.js`, `tela-pagamento-pix.js`, `tela-boleto.js`, `tela-cartao.js`, `tela-acompanhamento.js` |
| **Pagamento** (status/etapa) | **Feito (API)** | `PUT /ordens/:id/pagamento`, `finalizarPagamento` em `tela-comum.js` |
| **Painel de gestão** | **Feito (API)**, calculado no banco | `GET /painel`, `tela-painel-gestao.js` |
| **Forma de pagamento escolhida** `mimeticFormaPagamento` | Continua em `localStorage` de propósito: é só a escolha entre duas telas; vai para o banco quando o pagamento é confirmado | `tela-pagamento.js` |
| **Clientes** | **Feito (API)**: tabela `Cliente`. O `localStorage` `mimeticClientes` deixou de ser usado | `routes/clientes.js`, `api-client.js`, `tela-cadastro-cliente.js`, `tela-ordem-servico.js` (preenche por CPF), `tela-boleto.js` (e-mail) |
| **Recuperação de senha** | **Feito (API)** com código de 6 dígitos; o envio por e-mail ainda não está configurado (aparece no console do servidor) | ver 9.3 |

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

- **Nº do chassi:** o campo que antes se chamava `solicitacao` agora é `chassi` em todo o
  sistema (coluna `ordem_servico.chassi`, corpo e resposta da API, tela de OS, andamento e
  PDF). **Banco existente:** rodar
  `ALTER TABLE ordem_servico CHANGE COLUMN solicitacao chassi VARCHAR(50) NULL;`.
  O painel não usa esse campo: os "serviços mais solicitados" vêm da coluna `servicos`.
- **Abrir uma ordem exige funcionário logado**, porque a tabela guarda quem a
  abriu (`id_funcionario NOT NULL`). Com `EXIGIR_LOGIN = false` dá para abrir as
  telas sem login, mas salvar uma ordem mostra "Faça login...".
- **A placa passou a ser obrigatória ao salvar** (a coluna é `NOT NULL`). Antes só
  o CPF era obrigatório na tela; agora, sem placa, a API recusa e a tela mostra o aviso.
- **Tempo médio do painel (feito):** é o tempo entre o **pagamento confirmado** (`pago_em`,
  início do serviço) e o clique em **CONCLUIR** (`concluida_em`), em média, das ordens
  concluídas pelo funcionário **no mês atual**; o comparativo é com o mês anterior
  (`GET /painel`: `tempoMedioSegundos`, `tempoMedioMesAnteriorSegundos`,
  `servicosConcluidosMes`). Aparece como "4h e 35min". **Banco existente:** rodar
  `ALTER TABLE ordem_servico ADD COLUMN pago_em DATETIME NULL, ADD COLUMN concluida_em DATETIME NULL;`. Ordens pagas ou
  concluídas antes dessas colunas existirem não têm o horário e ficam fora da média.
- **Ordens não são mais apagadas:** o botão CANCELAR faz `UPDATE` do status para "Cancelada" e o
  botão CONCLUIR (só em ordem paga) marca "Concluída" e etapa 4. Na tela de ordens em andamento, o botão CONFIRMAR PAGAMENTO (só em ordem aguardando
  pagamento; atalho de testes, pergunta a forma) usa `PUT /ordens/:id/pagamento`. Ela
  mostra só as que não estão concluídas nem canceladas; o histórico do veículo mostra todas.
  Concluída ou cancelada não muda mais (409). O painel não conta as canceladas.
  Não existe mais `DELETE /ordens/:id`.
- **Nomes de tabela:** o `schema.sql` cria `Funcionario` e `Cliente` com inicial
  maiúscula, e as consultas do servidor usam exatamente esses nomes. Isso importa em
  **Linux** (onde o MySQL diferencia maiúsculas de minúsculas), que é o caso do
  ambiente Docker. Mantenham esse padrão em novas tabelas e consultas.

### 9.3 Segurança

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
   Continuam públicos: `GET /`, `POST /login`, `POST /funcionarios` (item 4 abaixo) e a recuperação de senha.
3. **Recuperação de senha com código: FEITO, mas o envio de e-mail NÃO.** A pessoa
   informa o e-mail e recebe um código de 6 dígitos (vale 15 min, uso único,
   bloqueado após 5 tentativas erradas; só o hash dele fica na tabela
   `recuperacao_senha`). A resposta é igual exista o e-mail ou não. **O projeto ainda não
   tem servidor de e-mail:** em desenvolvimento o código aparece no **console do
   servidor**; com `NODE_ENV=production` ele não é impresso e a recuperação não
   funciona até alguém ligar o envio real (troque o corpo de `enviarCodigoRecuperacao`
   em `utils/recuperacao.js`, por exemplo com nodemailer/SMTP).
4. **Criar conta na tela de login é público:** qualquer pessoa vira funcionário.
   O design recebido tem esse botão, por isso foi mantido. Recomenda-se que só um
   funcionário logado (ou administrador) possa cadastrar outros. A tela
   `tela-cadastro-funcionario.html` já exige login, mas hoje **nenhum botão leva a
   ela**; abre só pela URL. Pode virar o cadastro "oficial" e o popup público sair.
5. `cors()` está aberto a qualquer origem. Em produção, liberar só o endereço do front-end.
6. Permissões por perfil (atendente x mecânico) continuam em aberto, como no protótipo.

---

## 10. Testes realizados

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
