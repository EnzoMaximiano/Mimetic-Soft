// =========================================================
// ROTAS DE CLIENTES (cadastro feito por um FUNCIONÁRIO logado)
//
//   POST   /clientes        { nome, cpf, telefone, email, dataNascimento } -> 201
//   GET    /clientes        lista; filtro opcional ?cpf=000.000.000-00
//   GET    /clientes/:id
//   PUT    /clientes/:id    mesmos campos do POST (substitui os dados)
//   DELETE /clientes/:id    409 se o cliente já tem ordens/veículos/agendamentos ligados
//
// Todas exigem o token de login (Authorization: Bearer <token>).
// Cliente NÃO tem senha nem login: é só um cadastro. Tabela: Cliente (schema.sql).
// CPF e e-mail não podem se repetir (409).
// (montadas em server.js)
// =========================================================
import express from 'express';
import { connection } from '../database/conexao.js';
import { normalizarEmail, emailValido, formatarCpf, idValido, dataISO, dataISOValida, primeiroCampoLongo } from '../utils/validacoes.js';
import { exigirLogin } from '../utils/auth.js';

const router = express.Router();
router.use('/clientes', exigirLogin);

const COLUNAS = 'id_cliente, nome, email, telefone, cpf, data_nascimento, data_cadastro';

// Cliente no formato que a API devolve (sem expor nomes de colunas do banco).
//userC: Vinicius Sanches
function montarCliente(linha) {
    return {
        id: linha.id_cliente,
        nome: linha.nome,
        cpf: linha.cpf ?? '',
        telefone: linha.telefone ?? '',
        email: linha.email ?? '',
        dataNascimento: dataISO(linha.data_nascimento),
        dataCadastro: dataISO(linha.data_cadastro),
    };
}

// Valida o corpo do POST/PUT. Devolve { erro } com a mensagem para o usuário
// ou { dados } já limpos (CPF formatado, e-mail em minúsculas, vazios viram null).
//userC: Vinicius Sanches
function lerCorpoDoCliente(corpo) {
    const nome = String(corpo?.nome ?? '').trim();
    const telefone = String(corpo?.telefone ?? '').trim() || null;
    const email = normalizarEmail(corpo?.email) || null;
    const nascimento = String(corpo?.dataNascimento ?? '').trim() || null;
    const cpf = formatarCpf(corpo?.cpf);

    if (!nome) return { erro: 'O nome do cliente é obrigatório.' };
    if (!cpf) return { erro: 'Informe um CPF com 11 números.' };
    if (email && !emailValido(email)) return { erro: 'E-mail inválido.' };
    if (nascimento && (!dataISOValida(nascimento) || nascimento < '1900-01-01' || nascimento > dataISO(new Date()))) {
        return { erro: 'Data de nascimento inválida (use AAAA-MM-DD, sem data futura).' };
    }
    const longo = primeiroCampoLongo([['Nome', nome, 100], ['Telefone', telefone, 20], ['E-mail', email, 100]]);
    if (longo) return { erro: longo };

    return { dados: { nome, cpf, telefone, email, nascimento } };
}

// Procura outro cliente com o mesmo CPF ou e-mail (ignorando "idAtual" ao editar).
// Devolve a mensagem de conflito, ou null se pode salvar.
//userC: Vinicius Sanches
async function conflitoDeCadastro({ cpf, email }, idAtual = 0) {
    const [porCpf] = await connection.query('SELECT id_cliente FROM Cliente WHERE cpf = ? AND id_cliente <> ?', [cpf, idAtual]);
    if (porCpf.length) return 'Já existe um cliente cadastrado com este CPF.';
    if (email) {
        const [porEmail] = await connection.query('SELECT id_cliente FROM Cliente WHERE LOWER(email) = ? AND id_cliente <> ?', [email, idAtual]);
        if (porEmail.length) return 'Já existe um cliente cadastrado com este e-mail.';
    }
    return null;
}

// Lê o id da URL (/clientes/:id); se inválido responde 400 e devolve null.
//userC: Vinicius Sanches
function lerIdDaUrl(req, res) {
    const id = idValido(req.params.id);
    if (!id) res.status(400).json({ erro: 'Id do cliente inválido.' });
    return id;
}

// Cadastra um cliente.
//userC: Vinicius Sanches
router.post('/clientes', async (req, res) => {
    const { erro, dados } = lerCorpoDoCliente(req.body || {});
    if (erro) return res.status(400).json({ erro });
    try {
        const conflito = await conflitoDeCadastro(dados);
        if (conflito) return res.status(409).json({ erro: conflito });

        const [resultado] = await connection.query(
            'INSERT INTO Cliente (nome, email, telefone, cpf, data_nascimento) VALUES (?, ?, ?, ?, ?)',
            [dados.nome, dados.email, dados.telefone, dados.cpf, dados.nascimento]
        );
        const [linhas] = await connection.query(`SELECT ${COLUNAS} FROM Cliente WHERE id_cliente = ?`, [resultado.insertId]);
        res.status(201).json(montarCliente(linhas[0]));
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Já existe um cliente cadastrado com este CPF.' });
        console.error(e);
        res.status(500).json({ erro: 'Erro ao cadastrar cliente.' });
    }
});

// Lista os clientes (ordem alfabética). Com ?cpf= devolve só o daquele CPF.
//userC: Vinicius Sanches
router.get('/clientes', async (req, res) => {
    try {
        let sql = `SELECT ${COLUNAS} FROM Cliente`;
        const parametros = [];
        if (req.query.cpf) {
            const cpf = formatarCpf(req.query.cpf);
            if (!cpf) return res.status(400).json({ erro: 'Informe um CPF com 11 números.' });
            sql += ' WHERE cpf = ?';
            parametros.push(cpf);
        }
        const [linhas] = await connection.query(sql + ' ORDER BY nome', parametros);
        res.json(linhas.map(montarCliente));
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: 'Falha ao buscar clientes.' });
    }
});

// Busca um cliente pelo id.
//userC: Vinicius Sanches
router.get('/clientes/:id', async (req, res) => {
    const id = lerIdDaUrl(req, res);
    if (!id) return;
    try {
        const [linhas] = await connection.query(`SELECT ${COLUNAS} FROM Cliente WHERE id_cliente = ?`, [id]);
        if (!linhas.length) return res.status(404).json({ erro: 'Cliente não encontrado.' });
        res.json(montarCliente(linhas[0]));
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: 'Falha ao buscar o cliente.' });
    }
});

// Atualiza os dados de um cliente.
//userC: Vinicius Sanches
router.put('/clientes/:id', async (req, res) => {
    const id = lerIdDaUrl(req, res);
    if (!id) return;
    const { erro, dados } = lerCorpoDoCliente(req.body || {});
    if (erro) return res.status(400).json({ erro });
    try {
        const conflito = await conflitoDeCadastro(dados, id);
        if (conflito) return res.status(409).json({ erro: conflito });

        const [resultado] = await connection.query(
            'UPDATE Cliente SET nome = ?, email = ?, telefone = ?, cpf = ?, data_nascimento = ? WHERE id_cliente = ?',
            [dados.nome, dados.email, dados.telefone, dados.cpf, dados.nascimento, id]
        );
        if (!resultado.affectedRows) return res.status(404).json({ erro: 'Cliente não encontrado.' });
        const [linhas] = await connection.query(`SELECT ${COLUNAS} FROM Cliente WHERE id_cliente = ?`, [id]);
        res.json(montarCliente(linhas[0]));
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Já existe um cliente cadastrado com este CPF.' });
        console.error(e);
        res.status(500).json({ erro: 'Erro ao atualizar cliente.' });
    }
});

// Remove um cliente. Se ele já tem ordem de serviço, agendamento ou veículo ligado, o banco recusa (409).
//userC: Vinicius Sanches
router.delete('/clientes/:id', async (req, res) => {
    const id = lerIdDaUrl(req, res);
    if (!id) return;
    try {
        const [resultado] = await connection.query('DELETE FROM Cliente WHERE id_cliente = ?', [id]);
        if (!resultado.affectedRows) return res.status(404).json({ erro: 'Cliente não encontrado.' });
        res.json({ mensagem: 'Cliente removido.' });
    } catch (e) {
        if (e.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ erro: 'Este cliente tem ordens de serviço ou agendamentos e não pode ser removido.' });
        }
        console.error(e);
        res.status(500).json({ erro: 'Erro ao remover cliente.' });
    }
});

export default router;
