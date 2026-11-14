// =========================================================
// ROTAS DE FUNCIONÁRIOS: login, cadastro, consulta e recuperação de senha.
// (montadas em server.js)
// =========================================================
import express from 'express';
import { connection } from '../database/conexao.js';
import { normalizarEmail, emailValido, senhaForte, MENSAGEM_SENHA_FRACA } from '../utils/validacoes.js';
import { hashSenha, conferirSenha, senhaJaEhHash, HASH_FALSO } from '../utils/senha.js';
import { criarTokenFuncionario, exigirLogin } from '../utils/auth.js';
import { gerarCodigo, hashCodigo, codigoConfere, enviarCodigoRecuperacao, MINUTOS_VALIDADE_CODIGO, MAX_TENTATIVAS_CODIGO } from '../utils/recuperacao.js';

const router = express.Router();

// Monta o objeto de funcionário que pode ser devolvido ao front-end.
// A SENHA NUNCA É DEVOLVIDA: só id, nome e e-mail saem da API.
//USER: Vinicius Sanches
//userC: Vinicius Sanches
function funcionarioPublico(linha) {
    return {
        id: linha.id_funcionario,
        nome: linha.nome,
        email: linha.email,
    };
}


// ---------------------------------------------------------
// LOGIN DO FUNCIONÁRIO
// Recebe { email, senha }. Busca o funcionário pelo e-mail e confere a senha
// contra o hash guardado. Se estiver certo, devolve os dados públicos dele
// (sem a senha) e o TOKEN que o front-end envia nas próximas chamadas.
// Senha errada e e-mail inexistente recebem a MESMA resposta (401).
// ---------------------------------------------------------
//USER: Vinicius Sanches
//userC: Vinicius Sanches
router.post('/login', async (req, res) => {
    try {
        const corpo = req.body || {};
        const email = normalizarEmail(corpo.email);
        const senha = String(corpo.senha ?? '');

        if (!email || !senha) {
            return res.status(400).json({ erro: 'Informe e-mail e senha.' });
        }

        const [linhas] = await connection.query(
            'SELECT id_funcionario, nome, email, senha FROM Funcionario WHERE LOWER(email) = ?',
            [email]
        );
        const funcionario = linhas[0];

        // Sem funcionário, confere contra um hash falso só para gastar o mesmo tempo
        const senhaConfere = await conferirSenha(senha, funcionario ? funcionario.senha : HASH_FALSO);

        if (!funcionario || !senhaConfere) {
            return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
        }

        // Senha antiga ainda em texto puro: troca por hash agora que a pessoa provou que sabe a senha
        if (!senhaJaEhHash(funcionario.senha)) {
            await connection.query(
                'UPDATE Funcionario SET senha = ? WHERE id_funcionario = ?',
                [await hashSenha(senha), funcionario.id_funcionario]
            );
        }

        res.status(200).json({
            mensagem: 'Login realizado com sucesso',
            funcionario: funcionarioPublico(funcionario),
            token: criarTokenFuncionario(funcionario),
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: 'Erro ao realizar login.' });
    }
});

// ---------------------------------------------------------
// CADASTRAR FUNCIONÁRIO
// Recebe { nome, email, senha }. Valida os dados, impede e-mail repetido e
// grava na tabela "funcionario" (a senha vai como HASH). Responde 201 com os
// dados públicos. Esta rota ainda é PÚBLICA porque a tela de login tem o botão
// "Criar conta" (ver README, seção 5.3).
// ---------------------------------------------------------
//USER: Vinicius Sanches
//userC: Vinicius Sanches
router.post('/funcionarios', async (req, res) => {
    try {
        const nome = String(req.body.nome ?? '').trim();
        const email = normalizarEmail(req.body.email);
        const senha = String(req.body.senha ?? '');

        if (!nome || !email || !senha) {
            return res.status(400).json({ erro: 'Preencha nome, e-mail e senha.' });
        }
        if (!emailValido(email)) {
            return res.status(400).json({ erro: 'E-mail inválido.' });
        }
        if (!senhaForte(senha)) {
            return res.status(400).json({ erro: MENSAGEM_SENHA_FRACA });
        }

        // Evita dois funcionários com o mesmo e-mail (o login depende disso)
        const [existentes] = await connection.query(
            'SELECT id_funcionario FROM Funcionario WHERE LOWER(email) = ?',
            [email]
        );
        if (existentes.length > 0) {
            return res.status(409).json({ erro: 'Já existe um funcionário com este e-mail.' });
        }

        const [resultado] = await connection.query(
            'INSERT INTO Funcionario (nome, email, senha) VALUES (?, ?, ?)',
            [nome, email, await hashSenha(senha)]
        );

        res.status(201).json({ id: resultado.insertId, nome, email });
    } catch (e) {
        // Proteção extra caso o banco tenha índice UNIQUE no e-mail
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Já existe um funcionário com este e-mail.' });
        }
        console.error(e);
        res.status(500).json({ erro: 'Erro ao cadastrar funcionário.' });
    }
});

// ---------------------------------------------------------
// LISTAR FUNCIONÁRIOS
// Devolve todos os funcionários (somente id, nome e e-mail; nunca a senha).
// ---------------------------------------------------------
//USER: Vinicius Sanches
//userC: Vinicius Sanches
router.get('/funcionarios', exigirLogin, async (req, res) => {
    try {
        const [linhas] = await connection.query(
            'SELECT id_funcionario, nome, email FROM Funcionario'
        );
        res.status(200).json(linhas.map(funcionarioPublico));
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: 'Falha ao buscar funcionários.' });
    }
});

// ---------------------------------------------------------
// ATUALIZAR FUNCIONÁRIO
// Recebe qualquer combinação de { nome, email, senha }. Campos não enviados
// permanecem como estavam (COALESCE mantém o valor atual quando vem NULL).
// Exige login e cada funcionário só altera o PRÓPRIO cadastro (403 nos demais);
// perfis de administrador ainda não existem. A senha nova é gravada como hash.
// ---------------------------------------------------------
//USER: Vinicius Sanches
//userC: Vinicius Sanches
router.put('/funcionarios/:id', exigirLogin, async (req, res) => {
    try {
        const { id } = req.params;
        if (Number(id) !== req.funcionario.id) {
            return res.status(403).json({ erro: 'Você só pode alterar o seu próprio cadastro.' });
        }
        const nome = String(req.body.nome ?? '').trim() || null;
        const email = req.body.email ? normalizarEmail(req.body.email) : null;
        const senha = req.body.senha ? String(req.body.senha) : null;

        if (email && !emailValido(email)) {
            return res.status(400).json({ erro: 'E-mail inválido.' });
        }
        if (senha && !senhaForte(senha)) {
            return res.status(400).json({ erro: MENSAGEM_SENHA_FRACA });
        }

        // Se o e-mail mudou, ele não pode pertencer a outro funcionário
        if (email) {
            const [outros] = await connection.query(
                'SELECT id_funcionario FROM Funcionario WHERE LOWER(email) = ? AND id_funcionario <> ?',
                [email, id]
            );
            if (outros.length > 0) {
                return res.status(409).json({ erro: 'Já existe um funcionário com este e-mail.' });
            }
        }

        const [resultado] = await connection.query(
            'UPDATE Funcionario SET nome = COALESCE(?, nome), email = COALESCE(?, email), senha = COALESCE(?, senha) WHERE id_funcionario = ?',
            [nome, email, senha ? await hashSenha(senha) : null, id]
        );

        // Nenhuma linha afetada = o id informado não existe
        if (!resultado.affectedRows) {
            return res.status(404).json({ erro: 'Funcionário não encontrado.' });
        }

        res.json({ mensagem: 'Atualizado com sucesso' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: 'Erro ao atualizar funcionário.' });
    }
});

// ---------------------------------------------------------
// REMOVER FUNCIONÁRIO
// Apaga o funcionário do id informado. Exige login e só vale para o PRÓPRIO
// cadastro (403 nos demais). (TRATATIVA FEITA PARA FINS DE TESTE, NUNCA SE DEVE DELETAR DADOS DO BD)
// ---------------------------------------------------------
//USER: Vinicius Sanches
//userC: Vinicius Sanches
router.delete('/funcionarios/:id', exigirLogin, async (req, res) => {
    try {
        const { id } = req.params;
        if (Number(id) !== req.funcionario.id) {
            return res.status(403).json({ erro: 'Você só pode remover o seu próprio cadastro.' });
        }

        const [resultado] = await connection.query(
            'DELETE FROM Funcionario WHERE id_funcionario = ?',
            [id]
        );

        if (!resultado.affectedRows) {
            return res.status(404).json({ erro: 'Funcionário não encontrado.' });
        }

        res.json({ mensagem: 'Deletado com sucesso' });
    } catch (e) {
        if (e.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ erro: 'Este funcionário abriu ordens de serviço e não pode ser removido.' });
        }
        console.error(e);
        res.status(500).json({ erro: 'Erro ao remover funcionário.' });
    }
});

// ---------------------------------------------------------
// RECUPERAÇÃO DE SENHA - PASSO 1: SOLICITAR O CÓDIGO
// Recebe { email }. Se existir um funcionário com esse e-mail, gera um código
// de 6 dígitos (vale poucos minutos, uso único), guarda só o hash dele e o
// envia por e-mail (ver utils/recuperacao.js: o envio ainda é só no console).
// A resposta é SEMPRE a mesma, exista o e-mail ou não, para ninguém descobrir
// quais e-mails estão cadastrados.
// ---------------------------------------------------------
//USER: Vinicius Sanches
const MENSAGEM_CODIGO_SOLICITADO = 'Se o e-mail estiver cadastrado, enviamos um código de recuperação.';
const MENSAGEM_CODIGO_INVALIDO = 'Código inválido ou expirado. Solicite um novo código.';

//userC: Vinicius Sanches
router.post('/recuperar-senha/solicitar', async (req, res) => {
    try {
        const email = normalizarEmail((req.body || {}).email);
        if (!email || !emailValido(email)) {
            return res.status(400).json({ erro: 'Informe um e-mail válido.' });
        }

        const [linhas] = await connection.query(
            'SELECT id_funcionario FROM Funcionario WHERE LOWER(email) = ?',
            [email]
        );

        if (linhas.length > 0) {
            const idFuncionario = linhas[0].id_funcionario;
            const codigo = gerarCodigo();

            // Só existe um código ativo por funcionário: o pedido novo substitui o anterior
            await connection.query('DELETE FROM recuperacao_senha WHERE id_funcionario = ?', [idFuncionario]);
            await connection.query(
                'INSERT INTO recuperacao_senha (id_funcionario, codigo_hash, expira_em) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))',
                [idFuncionario, hashCodigo(codigo), MINUTOS_VALIDADE_CODIGO]
            );

            // Falha no envio é registrada, mas a resposta continua igual (não revela que o e-mail existe)
            try {
                await enviarCodigoRecuperacao(email, codigo);
            } catch (erroEnvio) {
                console.error('Falha ao enviar o código de recuperação:', erroEnvio);
            }
        }

        res.json({ mensagem: MENSAGEM_CODIGO_SOLICITADO });
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: 'Erro ao solicitar a recuperação de senha.' });
    }
});

// ---------------------------------------------------------
// RECUPERAÇÃO DE SENHA - PASSO 2: TROCAR A SENHA COM O CÓDIGO
// Recebe { email, codigo, novaSenha }. O código precisa existir, não ter
// expirado e estar certo; depois de MAX_TENTATIVAS_CODIGO erros ele é
// bloqueado. Código errado, expirado, já usado ou e-mail inexistente recebem
// a mesma resposta (400). Ao dar certo, o código é apagado (uso único).
// ---------------------------------------------------------
//USER: Vinicius Sanches
//userC: Vinicius Sanches
router.put('/recuperar-senha/redefinir', async (req, res) => {
    let conexao;
    try {
        const corpo = req.body || {};
        const email = normalizarEmail(corpo.email);
        const codigo = String(corpo.codigo ?? '').trim();
        const novaSenha = String(corpo.novaSenha ?? '');

        if (!email || !codigo || !novaSenha) {
            return res.status(400).json({ erro: 'Informe o e-mail, o código e a nova senha.' });
        }
        if (!senhaForte(novaSenha)) {
            return res.status(400).json({ erro: MENSAGEM_SENHA_FRACA });
        }

        const [linhas] = await connection.query(
            `SELECT r.id_recuperacao, r.id_funcionario, r.codigo_hash, r.tentativas
               FROM recuperacao_senha r
               JOIN Funcionario f ON f.id_funcionario = r.id_funcionario
              WHERE LOWER(f.email) = ? AND r.expira_em > NOW()`,
            [email]
        );
        const pedido = linhas[0];

        if (!pedido) {
            return res.status(400).json({ erro: MENSAGEM_CODIGO_INVALIDO });
        }

        // Muitas tentativas erradas: o código é queimado e a pessoa precisa pedir outro
        if (pedido.tentativas >= MAX_TENTATIVAS_CODIGO) {
            await connection.query('DELETE FROM recuperacao_senha WHERE id_recuperacao = ?', [pedido.id_recuperacao]);
            return res.status(400).json({ erro: MENSAGEM_CODIGO_INVALIDO });
        }

        if (!codigoConfere(codigo, pedido.codigo_hash)) {
            await connection.query(
                'UPDATE recuperacao_senha SET tentativas = tentativas + 1 WHERE id_recuperacao = ?',
                [pedido.id_recuperacao]
            );
            return res.status(400).json({ erro: MENSAGEM_CODIGO_INVALIDO });
        }

        // Código certo: troca a senha (hash) e apaga o código na mesma transação
        const senhaHash = await hashSenha(novaSenha);
        conexao = await connection.getConnection();
        await conexao.beginTransaction();
        await conexao.query('UPDATE Funcionario SET senha = ? WHERE id_funcionario = ?', [senhaHash, pedido.id_funcionario]);
        await conexao.query('DELETE FROM recuperacao_senha WHERE id_funcionario = ?', [pedido.id_funcionario]);
        await conexao.commit();

        res.json({ mensagem: 'Senha alterada com sucesso.' });
    } catch (e) {
        if (conexao) await conexao.rollback().catch(() => { });
        console.error(e);
        res.status(500).json({ erro: 'Erro ao redefinir senha.' });
    } finally {
        if (conexao) conexao.release();
    }
});

export default router;
