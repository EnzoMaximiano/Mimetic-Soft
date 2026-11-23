# MIMETIC SOFT - Virtualização do ambiente com Docker (item 7.2)

## 1. Levantamento do ambiente

O sistema tem três partes, e cada uma precisa de um ambiente diferente para rodar:

| Parte | Tecnologia | O que precisa para rodar |
|---|---|---|
| Front-end | HTML, CSS e JavaScript puros (pastas `HTML/`, `CSS/`, `JAVASCRIPT/`, `assets/`) | Um servidor web que entregue arquivos estáticos |
| Back-end (API) | Node.js + Express (`servidorREST/`) | Node.js, dependências do `package.json` e variáveis do `.env` |
| Banco de dados | MySQL 8 (`servidorREST/schema.sql`) | Servidor MySQL com o banco `oficina_mecanica` criado |

Problemas encontrados no ambiente sem virtualização:

- Cada integrante precisava instalar Node.js e MySQL na própria máquina, em versões diferentes.
- O front-end dependia do Live Server do VS Code (porta 5501).
- O banco precisava ser criado manualmente rodando o `schema.sql`.
- O `.env` precisava ser configurado à mão em cada computador.
- O README alerta que nomes de tabela com maiúsculas/minúsculas se comportam diferente em Windows e Linux. Com o Docker, todos usam o mesmo MySQL em Linux, igual ao de um servidor real.

## 2. Definição do ambiente

Foi escolhido o **Docker** com **Docker Compose**: cada parte do sistema roda em um container isolado, e um único arquivo (`docker-compose.yml`) sobe tudo junto.

| Container | Imagem base | Porta no computador | Função |
|---|---|---|---|
| `mimetic-frontend` | `nginx:1.27-alpine` | 8080 | Entrega as telas do sistema |
| `mimetic-api` | `node:22-alpine` | 3000 | API REST (servidorREST) |
| `mimetic-db` | `mysql:8.4` | 3307 | Banco de dados `oficina_mecanica` |

Decisões tomadas:

- **Rede interna `mimetic-net`:** a API acessa o banco pelo nome `db`, sem expor credenciais no código.
- **Volume `mimetic-db-data`:** os dados do banco continuam salvos mesmo se o container for removido.
- **Banco criado automaticamente:** na primeira subida, o MySQL roda o `schema.sql` e o script `docker/mysql/02-recuperacao-senha.sql` (tabela da recuperação de senha, que não estava no schema).
- **Healthchecks:** a API só inicia quando o banco está pronto para receber conexões.
- **Imagens Alpine:** são menores e mais rápidas de baixar.
- **API como usuário sem privilégios (`USER node`):** boa prática de segurança.

### Ambientes (desenvolvimento, testes, homologação e produção)

A mesma configuração atende todos os ambientes. O que muda é só o arquivo `.env` na raiz do projeto (modelo em `.env.docker.example`):

| Ambiente | `NODE_ENV` | Senhas e `JWT_SECRET` | Observação |
|---|---|---|---|
| Desenvolvimento | `development` | Valores padrão do compose | Código de recuperação de senha aparece no log da API |
| Testes | `development` | Valores padrão | Banco pode ser zerado com `docker compose down -v` |
| Homologação | `production` | Senhas próprias no `.env` | Igual à produção, com dados de teste |
| Produção | `production` | Senhas fortes e `JWT_SECRET` longo e aleatório | Não expor a porta do banco; limitar o `cors()` ao endereço do front-end |

## 3. Implementação

Arquivos criados:

| Arquivo | Conteúdo |
|---|---|
| `Dockerfile.frontend` | Imagem do front-end (Nginx + telas) |
| `docker/nginx/default.conf` | Configuração do Nginx: `http://localhost:8080` abre a tela de login |
| `servidorREST/Dockerfile` | Imagem da API Node.js |
| `docker-compose.yml` | Sobe os três containers juntos |
| `docker/mysql/02-recuperacao-senha.sql` | Tabela `recuperacao_senha` |
| `.dockerignore`, `servidorREST/.dockerignore` | Arquivos que não entram nas imagens |
| `.env.docker.example` | Modelo de variáveis por ambiente |

### Como rodar

Pré-requisito: **Docker Desktop** instalado e aberto.

```bash
# Na pasta raiz do projeto
docker compose up -d --build
```

Depois:

- Sistema: **http://localhost:8080** (abre a tela de login)
- API: **http://localhost:3000** (deve responder `{"status":"ok", ...}`)

Comandos úteis:

```bash
docker compose ps              # lista os containers e o status
docker compose logs -f api     # acompanha o log da API
docker compose down            # para tudo (mantém os dados do banco)
docker compose down -v         # para tudo e APAGA o banco (recria do schema.sql)
```

> Se você já tem um MySQL rodando no computador, ele usa a porta 3306. Por isso o banco do Docker fica na porta **3307**, para não haver conflito.
