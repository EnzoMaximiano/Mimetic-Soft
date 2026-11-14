// =========================================================
// ROTAS DE ORDENS DE SERVIÇO, PAGAMENTO E PAINEL DE GESTÃO
// (montadas em server.js)
// =========================================================
import express from 'express';
import { connection } from '../database/conexao.js';
import { idValido, formatarCpf, dataISO, dataISOValida, dinheiroValido, primeiroCampoLongo } from '../utils/validacoes.js';
import { exigirLogin } from '../utils/auth.js';

const router = express.Router();

// =========================================================
// ORDENS DE SERVIÇO, PAGAMENTO E PAINEL DE GESTÃO (README, seção 5.2)
//
// Tabela usada: ordem_servico. Os serviços de cada ordem ficam na própria
// linha, na coluna JSON "servicos" ([{ nome, preco }, ...]). Ver schema.sql.
// Enquanto a API de CLIENTES não existe, os dados do cliente (nome, CPF,
// telefone e e-mail) ficam gravados na própria ordem.
// =========================================================

// Status que a ordem recebe ao ser criada e depois de paga.
const STATUS_AGUARDANDO = 'Aguardando pagamento';
const STATUS_PAGO = 'Pagamento confirmado';

// Formas de pagamento aceitas pela tela de pagamento.
const FORMAS_PAGAMENTO = ['PIX', 'BOLETO', 'CARTÃO', 'DÉBITO', 'CRÉDITO'];

// Etapas do acompanhamento: 1 pagamento, 2 diagnóstico, 3 manutenção, 4 concluída.
const ETAPA_MIN = 1;
const ETAPA_MAX = 4;

// Máximo de serviços em uma mesma ordem (proteção contra requisições absurdas).
const MAX_SERVICOS_POR_ORDEM = 50;

// Colunas lidas sempre que uma ordem é buscada (evita repetir a lista).
const COLUNAS_ORDEM = ` o.id_ordem, o.id_cliente, o.id_funcionario, o.cliente_nome, o.cliente_cpf, o.cliente_telefone, o.cliente_email,
    o.placa, o.veiculo, o.ano_carro, o.solicitacao, o.previsao_conclusao, o.orcamento, o.servicos,
    o.status, o.etapa, o.forma_pagamento, o.criada_em `;

// Monta a ordem no formato JSON que a API devolve ao front-end,
// juntando a linha da tabela ordem_servico com seus itens (serviços).
// Valores em dinheiro saem como NÚMERO (o front-end cuida da formatação R$).
//USER: Vinicius Sanches
//userC: Vinicius Sanches
function montarOrdem(linha) {

    let servicos = [];

    try {

        if (linha.servicos) {

            servicos = typeof linha.servicos === 'string'
                ? JSON.parse(linha.servicos)
                : linha.servicos;

        }

    } catch (e) {

        console.error('Erro ao ler serviços da ordem:', e);

        servicos = [];
    }

    return {

        id: linha.id_ordem,

        idCliente: linha.id_cliente ?? null,

        idFuncionario: linha.id_funcionario,

        cliente: {
            nome: linha.cliente_nome ?? '',
            cpf: linha.cliente_cpf ?? '',
            telefone: linha.cliente_telefone ?? '',
            email: linha.cliente_email ?? ''
        },

        placa: linha.placa,

        veiculo: linha.veiculo ?? '',

        anoCarro: linha.ano_carro ?? '',

        solicitacao: linha.solicitacao ?? '',

        previsao: dataISO(linha.previsao_conclusao),

        servicos: Array.isArray(servicos)
            ? servicos.map(servico => ({
                nome: servico.nome,
                preco: Number(servico.preco || 0)
            }))
            : [],

        orcamento: Number(linha.orcamento || 0),

        status: linha.status,

        etapa: Number(linha.etapa),

        formaPagamento: linha.forma_pagamento ?? null,

        criadaEm: linha.criada_em
    };
}

// Busca UMA ordem completa (com os serviços) pelo id.
// Devolve o objeto da ordem ou null quando o id não existe.
//userC: Vinicius Sanches
async function buscarOrdemPorId(id) {

    const [linhas] = await connection.query(
        `SELECT ${COLUNAS_ORDEM}
         FROM ordem_servico o
         WHERE o.id_ordem = ?`,
        [id]
    );

    if (linhas.length === 0) {
        return null;
    }

    return montarOrdem(linhas[0]);
}

// Lê o id da URL (/ordens/:id). Se não for um inteiro positivo, responde 400
// e devolve null (quem chamou deve encerrar a rota).
//userC: Vinicius Sanches
function lerIdDaUrl(req, res) {
    const id = idValido(req.params.id);
    if (!id) res.status(400).json({ erro: 'Id da ordem inválido.' });
    return id;
}

// Todas as rotas de ordens e do painel exigem login (token no cabeçalho Authorization)
router.use('/ordens', exigirLogin);
router.use('/painel', exigirLogin);

// ---------------------------------------------------------
// CRIAR ORDEM DE SERVIÇO
// Recebe { cliente:{nome,cpf,telefone,email}, placa, veiculo,
// anoCarro, solicitacao, previsao, servicos:[{nome,preco}] }.
// O orçamento é SEMPRE calculado aqui, somando o preço dos serviços.
// A ordem e seus itens são gravados juntos (transação): ou salva tudo ou nada.
// O funcionário que abre a ordem é o do TOKEN de login (req.funcionario.id);
// um idFuncionario enviado no corpo é ignorado. Responde 201 com a ordem criada.
// ---------------------------------------------------------
//USER: Vinicius Sanches
//userC: Vinicius Sanches
router.post('/ordens', async (req, res) => {

    let conexao;
    try {
        const {
            idCliente,
            cliente,
            placa,
            veiculo,
            anoCarro,
            solicitacao,
            previsao,
            servicos = [],
            formaPagamento
        } = req.body || {}; // sem corpo JSON, req.body vem undefined no Express 5

        // -----------------------------------------
        // DADOS DO CLIENTE E DA ORDEM (texto sem espaços nas pontas)
        // -----------------------------------------
        const nomeCliente = String(cliente?.nome ?? '').trim() || null;
        const cpf = String(cliente?.cpf ?? '').trim() || null;
        const telefone = String(cliente?.telefone ?? '').trim() || null;
        const email = String(cliente?.email ?? '').trim() || null;
        const placaTexto = String(placa ?? '').trim();

        // -----------------------------------------
        // VALIDAÇÕES (o servidor sempre valida de novo: ver utils/validacoes.js)
        // -----------------------------------------
        const idFuncionarioNumero = req.funcionario.id; // vem do token, nunca do corpo

        if (!cpf) {
            return res.status(400).json({
                erro: 'O CPF do cliente é obrigatório.'
            });
        }

        if (!placaTexto) {
            return res.status(400).json({
                erro: 'A placa é obrigatória.'
            });
        }

        // idCliente é opcional (a API de clientes ainda não existe); se vier, tem que ser um id válido
        const idClienteNumero = idCliente ? idValido(idCliente) : null;
        if (idCliente && !idClienteNumero) {
            return res.status(400).json({
                erro: 'Cliente inválido.'
            });
        }

        // Texto maior que a coluna do banco viraria erro 500 ("Data too long"); recusa antes com 400
        const erroTamanho = primeiroCampoLongo([
            ['Nome do cliente', nomeCliente, 100],
            ['CPF', cpf, 14],
            ['Telefone', telefone, 20],
            ['E-mail', email, 100],
            ['Placa', placaTexto, 8],
            ['Veículo', veiculo, 100],
            ['Ano do carro', anoCarro, 10],
            ['Solicitação', solicitacao, 150],
        ]);
        if (erroTamanho) {
            return res.status(400).json({ erro: erroTamanho });
        }

        // Previsão: vazia = sem previsão; preenchida = data real AAAA-MM-DD
        const previsaoTexto = previsao ? String(previsao).trim() : null;
        if (previsaoTexto && !dataISOValida(previsaoTexto)) {
            return res.status(400).json({
                erro: 'Previsão de conclusão inválida.'
            });
        }

        // A forma de pagamento normalmente só é gravada ao pagar; se vier aqui, precisa ser uma das aceitas
        const formaTexto = formaPagamento ? String(formaPagamento).trim().toUpperCase() : null;
        if (formaTexto && !FORMAS_PAGAMENTO.includes(formaTexto)) {
            return res.status(400).json({
                erro: `Forma de pagamento inválida. Use: ${FORMAS_PAGAMENTO.join(', ')}.`
            });
        }

        if (!Array.isArray(servicos) || servicos.length === 0) {
            return res.status(400).json({
                erro: 'Informe pelo menos um serviço.'
            });
        }

        if (servicos.length > MAX_SERVICOS_POR_ORDEM) {
            return res.status(400).json({
                erro: `A ordem pode ter no máximo ${MAX_SERVICOS_POR_ORDEM} serviços.`
            });
        }

        // -----------------------------------------
        // VALIDA E NORMALIZA OS SERVIÇOS
        // Cada serviço: { nome: texto até 100 caracteres, preco: número >= 0 }.
        // O preço precisa chegar como NÚMERO (o front-end converte "150,50" antes de enviar).
        // -----------------------------------------
        const servicosNormalizados = [];
        for (const servico of servicos) {
            if (!servico || typeof servico !== 'object') {
                return res.status(400).json({
                    erro: 'Serviço inválido.'
                });
            }

            const nomeServico = typeof servico.nome === 'string' ? servico.nome.trim() : '';
            if (!nomeServico) {
                return res.status(400).json({
                    erro: 'Todos os serviços precisam ter um nome.'
                });
            }
            if (nomeServico.length > 100) {
                return res.status(400).json({
                    erro: 'O nome de um serviço deve ter no máximo 100 caracteres.'
                });
            }
            if (!dinheiroValido(servico.preco)) {
                return res.status(400).json({
                    erro: `Preço inválido no serviço "${nomeServico}".`
                });
            }

            servicosNormalizados.push({
                nome: nomeServico,
                preco: Math.round(servico.preco * 100) / 100
            });
        }

        // -----------------------------------------
        // CALCULA O ORÇAMENTO (em centavos, para não acumular erro de ponto flutuante)
        // -----------------------------------------
        const centavos = servicosNormalizados.reduce(
            (total, servico) => total + Math.round(servico.preco * 100),
            0
        );
        const orcamento = centavos / 100;

        // A soma também precisa caber na coluna DECIMAL(10,2)
        if (!dinheiroValido(orcamento)) {
            return res.status(400).json({
                erro: 'O valor total da ordem é alto demais.'
            });
        }

        // -----------------------------------------
        // O FUNCIONÁRIO DO TOKEN PRECISA EXISTIR (a ordem registra quem a abriu)
        // -----------------------------------------
        const [funcionarios] = await connection.query(
            'SELECT id_funcionario FROM Funcionario WHERE id_funcionario = ?',
            [idFuncionarioNumero]
        );
        if (funcionarios.length === 0) {
            // O token é válido, mas o funcionário dele foi removido do banco
            return res.status(401).json({
                erro: 'Funcionário não encontrado. Faça login novamente.'
            });
        }

        // -----------------------------------------
        // LIGA A ORDEM AO CLIENTE CADASTRADO
        // Procura na tabela Cliente o CPF digitado (com ou sem máscara). Se existir,
        // a ordem guarda o id_cliente; se não, segue sem vínculo (id_cliente NULL),
        // como antes. As colunas cliente_* continuam guardando o que foi digitado.
        // -----------------------------------------
        let idDoCliente = idClienteNumero;
        const cpfFormatado = formatarCpf(cpf);
        if (!idDoCliente && cpfFormatado) {
            const [achados] = await connection.query('SELECT id_cliente FROM Cliente WHERE cpf = ?', [cpfFormatado]);
            if (achados.length) idDoCliente = achados[0].id_cliente;
        }

        // -----------------------------------------
        // CONEXÃO COM O BANCO
        // -----------------------------------------
        conexao = await connection.getConnection();

        await conexao.beginTransaction();

        // -----------------------------------------
        // INSERE A ORDEM
        // -----------------------------------------
        const [resultado] = await conexao.query(
            `INSERT INTO ordem_servico
            (
                id_cliente,
                id_funcionario,
                cliente_nome,
                cliente_cpf,
                cliente_telefone,
                cliente_email,
                placa,
                veiculo,
                ano_carro,
                solicitacao,
                previsao_conclusao,
                orcamento,
                servicos,
                status,
                etapa,
                forma_pagamento
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                idDoCliente,
                idFuncionarioNumero,
                nomeCliente,
                cpf,
                telefone,
                email,
                placaTexto,
                veiculo || null,
                anoCarro || null,
                solicitacao || null,
                previsaoTexto,
                orcamento,
                JSON.stringify(servicosNormalizados),
                STATUS_AGUARDANDO,
                ETAPA_MIN,
                formaTexto
            ]
        );
        const idOrdem = resultado.insertId;

        // -----------------------------------------
        // CONFIRMA A TRANSAÇÃO
        // -----------------------------------------
        await conexao.commit();

        // -----------------------------------------
        // RETORNA A ORDEM CRIADA
        // -----------------------------------------
        const ordem = await buscarOrdemPorId(idOrdem);

        res.status(201).json(ordem);

    } catch (e) {
        if (conexao) {
            await conexao.rollback().catch(() => {});
        }
        // Chave estrangeira recusada (cliente ou funcionário que não existe): erro de quem enviou, não do servidor
        if (e.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                erro: 'Cliente ou funcionário informado não existe.'
            });
        }
        console.error(e);
        res.status(500).json({
            erro: 'Erro ao criar ordem de serviço.'
        });

    } finally {
        if (conexao) {
            conexao.release();
        }
    }
});

// ---------------------------------------------------------
// LISTAR ORDENS DE SERVIÇO
// Devolve todas as ordens (da mais antiga para a mais nova). Filtros opcionais:
//   ?placa=ABC1D23   -> só as daquele veículo (Histórico do Veículo)
//   ?cpf=123.456...  -> só as daquele cliente (preenche a última ordem na tela de OS)
// Faz apenas 2 consultas: uma para as ordens e outra para todos os itens.
// ---------------------------------------------------------
//USER: Vinicius Sanches
//userC: Vinicius Sanches
router.get('/ordens', async (req, res) => {

try {

    const placa = String(
        req.query.placa ?? ''
    ).trim().toUpperCase();

    const cpf = String(
        req.query.cpf ?? ''
    ).trim();

    const condicoes = [];
    const parametros = [];

    if (placa) {
        condicoes.push('UPPER(o.placa) = ?');
        parametros.push(placa);
    }
    if (cpf) {
        condicoes.push('o.cliente_cpf = ?');
        parametros.push(cpf);
    }
    const filtro = condicoes.length
        ? `WHERE ${condicoes.join(' AND ')}`
        : '';
    const [linhas] = await connection.query(
        `SELECT ${COLUNAS_ORDEM}
         FROM ordem_servico o
         ${filtro}
         ORDER BY o.id_ordem`,
        parametros
    );
    res.json(
        linhas.map(linha => montarOrdem(linha))
    );

} catch (e) {

    console.error(e);

    res.status(500).json({
        erro: 'Falha ao buscar ordens de serviço.'
    });
}
});

// ---------------------------------------------------------
// BUSCAR UMA ORDEM
// Usada pelas telas de pagamento, PIX, boleto, cartão e acompanhamento,
// que trabalham sempre com "a ordem atual".
// ---------------------------------------------------------
//USER: Vinicius Sanches
//userC: Vinicius Sanches
router.get('/ordens/:id', async (req, res) => {
    try {
        const id = lerIdDaUrl(req, res);
        if (!id) return;

        const ordem = await buscarOrdemPorId(id);
        if (!ordem) return res.status(404).json({ erro: 'Ordem de serviço não encontrada.' });

        res.json(ordem);
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: 'Falha ao buscar a ordem de serviço.' });
    }
});

// ---------------------------------------------------------
// ATUALIZAR ORDEM (status, etapa e previsão)
// Recebe qualquer combinação de { status, etapa, previsao }; o que não vier
// permanece como está. Para limpar a previsão, envie previsao: "" ou null.
// Ainda não há tela que use esta rota: ela já fica pronta para o fluxo do
// mecânico (avançar de diagnóstico para manutenção e concluída).
// ---------------------------------------------------------
//USER: Vinicius Sanches
//userC: Vinicius Sanches
router.put('/ordens/:id', async (req, res) => {
    try {
        const id = lerIdDaUrl(req, res);
        if (!id) return;
        const corpo = req.body || {};

        // Monta só os campos enviados (nomes de coluna fixos: sem risco de SQL injection)
        const campos = [];
        const valores = [];

        if (corpo.status !== undefined) {
            const status = String(corpo.status ?? '').trim();
            if (!status) return res.status(400).json({ erro: 'Status inválido.' });
            const erroTamanho = primeiroCampoLongo([['Status', status, 40]]);
            if (erroTamanho) return res.status(400).json({ erro: erroTamanho });
            campos.push('status = ?'); valores.push(status);
        }
        if (corpo.etapa !== undefined) {
            const etapa = Number(corpo.etapa);
            if (!Number.isInteger(etapa) || etapa < ETAPA_MIN || etapa > ETAPA_MAX) {
                return res.status(400).json({ erro: `Etapa deve ser um número de ${ETAPA_MIN} a ${ETAPA_MAX}.` });
            }
            campos.push('etapa = ?'); valores.push(etapa);
        }
        if (corpo.previsao !== undefined) {
            const previsao = corpo.previsao ? String(corpo.previsao).trim() : null;
            if (previsao && !dataISOValida(previsao)) {
                return res.status(400).json({ erro: 'Previsão de conclusão inválida.' });
            }
            campos.push('previsao_conclusao = ?'); valores.push(previsao);
        }
        if (campos.length === 0) {
            return res.status(400).json({ erro: 'Informe status, etapa ou previsao para atualizar.' });
        }

        const ordemExiste = await buscarOrdemPorId(id);
        if (!ordemExiste) return res.status(404).json({ erro: 'Ordem de serviço não encontrada.' });

        await connection.query(
            `UPDATE ordem_servico SET ${campos.join(', ')} WHERE id_ordem = ? `,
            [...valores, id]
        );

        res.json(await buscarOrdemPorId(id));
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: 'Erro ao atualizar a ordem de serviço.' });
    }
});

// ---------------------------------------------------------
// CONFIRMAR PAGAMENTO
// Recebe { forma } (PIX, BOLETO, CARTÃO, DÉBITO ou CRÉDITO). Marca a ordem como
// "Pagamento confirmado", avança para a etapa 2 (diagnóstico) e guarda a forma
// de pagamento. Uma ordem já paga não pode ser paga de novo (409), o que evita
// "voltar" uma ordem que já está em manutenção.
// Protótipo: apenas registra o pagamento; não há cobrança real (ver telas de PIX/boleto/cartão).
// ---------------------------------------------------------
//USER: Vinicius Sanches
//userC: Vinicius Sanches
router.put('/ordens/:id/pagamento', async (req, res) => {
    try {
        const id = lerIdDaUrl(req, res);
        if (!id) return;

        const forma = String(req.body?.forma ?? '').trim().toUpperCase();
        if (!FORMAS_PAGAMENTO.includes(forma)) {
            return res.status(400).json({ erro: `Forma de pagamento inválida. Use: ${FORMAS_PAGAMENTO.join(', ')}.` });
        }

        const ordem = await buscarOrdemPorId(id);
        if (!ordem) return res.status(404).json({ erro: 'Ordem de serviço não encontrada.' });
        if (ordem.status !== STATUS_AGUARDANDO) {
            return res.status(409).json({ erro: 'Esta ordem de serviço já teve o pagamento confirmado.' });
        }

        // O "AND status = ?" garante que só UM pagamento vença se dois chegarem ao mesmo tempo
        const [atualizado] = await connection.query(
            'UPDATE ordem_servico SET status = ?, etapa = ?, forma_pagamento = ? WHERE id_ordem = ? AND status = ?',
            [STATUS_PAGO, 2, forma, id, STATUS_AGUARDANDO]
        );
        if (!atualizado.affectedRows) {
            return res.status(409).json({ erro: 'Esta ordem de serviço já teve o pagamento confirmado.' });
        }

        res.json(await buscarOrdemPorId(id));
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: 'Erro ao confirmar o pagamento.' });
    }
});

// ---------------------------------------------------------
// REMOVER ORDEM DE SERVIÇO
// Apaga a ordem; os serviços dela vão junto, pois ficam na coluna "servicos" da
// própria linha. (TRATATIVA MANTIDA PORQUE A TELA TEM O BOTÃO "APAGAR"; em
// produção o ideal é marcar como cancelada em vez de apagar dados do banco.)
// ---------------------------------------------------------
//USER: Vinicius Sanches
//userC: Vinicius Sanches
router.delete('/ordens/:id', async (req, res) => {
    try {
        const id = lerIdDaUrl(req, res);
        if (!id) return;

        const [resultado] = await connection.query(
            'DELETE FROM ordem_servico WHERE id_ordem = ?',
            [id]
        );

        // Nenhuma linha afetada = o id informado não existe
        if (!resultado.affectedRows) {
            return res.status(404).json({ erro: 'Ordem de serviço não encontrada.' });
        }

        res.json({ mensagem: 'Deletado com sucesso' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: 'Erro ao remover a ordem de serviço.' });
    }
});

// Formata uma data como 'AAAA-MM-DD HH:MM:SS' (formato de DATETIME do MySQL),
// usada nos limites de mês do painel.
//userC: Vinicius Sanches
function dataHoraSQL(data) {
    const p = n => String(n).padStart(2, '0');
    return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())} ${p(data.getHours())}:${p(data.getMinutes())}:${p(data.getSeconds())}`;
}

// ---------------------------------------------------------
// PAINEL DE GESTÃO
// Os indicadores são calculados no banco (COUNT / GROUP BY), não no navegador:
//   - servicosMes / servicosMesAnterior: ordens abertas no mês atual e no anterior
//   - servicosSolicitados: os 2 SERVIÇOS mais frequentes nas ordens (lidos da
//     coluna JSON "servicos" com JSON_TABLE, ex.: "Troca de óleo"; exige MySQL 8)
//   - tempoMedioMinutos: null por enquanto (o banco ainda não guarda a data de
//     conclusão; será calculado quando existir esse campo)
// ---------------------------------------------------------
//USER: Vinicius Sanches
//userC: Vinicius Sanches
router.get('/painel', async (req, res) => {
    try {
        const agora = new Date();
        const inicioMesAnterior = dataHoraSQL(new Date(agora.getFullYear(), agora.getMonth() - 1, 1));
        const inicioMes = dataHoraSQL(new Date(agora.getFullYear(), agora.getMonth(), 1));
        const inicioProximoMes = dataHoraSQL(new Date(agora.getFullYear(), agora.getMonth() + 1, 1));

        const [[doMes]] = await connection.query(
            'SELECT COUNT(*) AS total FROM ordem_servico WHERE criada_em >= ? AND criada_em < ?',
            [inicioMes, inicioProximoMes]
        );
        const [[doMesAnterior]] = await connection.query(
            'SELECT COUNT(*) AS total FROM ordem_servico WHERE criada_em >= ? AND criada_em < ?',
            [inicioMesAnterior, inicioMes]
        );
        const [[geral]] = await connection.query('SELECT COUNT(*) AS total FROM ordem_servico');
        const [maisSolicitados] = await connection.query(
            `SELECT s.nome AS nome, COUNT(*) AS quantidade
               FROM ordem_servico o,
                    JSON_TABLE(o.servicos, '$[*]'
                        COLUMNS (nome VARCHAR(255) PATH '$.nome')) AS s
              WHERE s.nome IS NOT NULL AND s.nome <> ''
              GROUP BY s.nome
              ORDER BY quantidade DESC, s.nome ASC
              LIMIT 2`
        );

        res.json({
            totalOrdens: Number(geral.total),
            servicosMes: Number(doMes.total),
            servicosMesAnterior: Number(doMesAnterior.total),
            servicosSolicitados: maisSolicitados.map(l => ({ nome: l.nome, quantidade: Number(l.quantidade) })),
            tempoMedioMinutos: null,
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: 'Falha ao calcular o painel de gestão.' });
    }
});

export default router;
