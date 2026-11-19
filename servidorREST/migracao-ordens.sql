-- =========================================================
-- MIGRAÇÃO DA TABELA ordem_servico (rodar em bancos JÁ EXISTENTES)
--
-- Em um banco novo NÃO é preciso: o schema.sql já cria tudo.
-- Pode ser executada mais de uma vez: cada alteração só acontece se ainda
-- não foi feita.
--
-- O que ela garante:
--   1) id_cliente aceita NULL (a API de clientes ainda não existe)
--   2) colunas cliente_nome, cliente_cpf, cliente_telefone, cliente_email
--   3) coluna de TEXTO "servicos" com os serviços da ordem, escritos como as opções
--      da tela (ex.: "Troca de óleo, Alinhamento"). Se ela já existir como JSON, os
--      nomes são convertidos para texto (o preço de cada serviço não é mantido; o
--      orçamento total continua guardado em "orcamento")
--   4) Funcionario.senha de VARCHAR(50) para VARCHAR(255), para caber o hash da senha
--   5) tabela recuperacao_senha (código de recuperação de senha, README 5.3)
--   6) coluna Cliente.data_nascimento (cadastro de clientes pela API)
--
-- Depois de rodar este script, converta as senhas que ainda estão em texto puro:
--     cd servidorREST && node scripts/migrar-senhas.js
--
-- Requer MySQL 8 (a conversão do JSON antigo usa JSON_TABLE, só durante esta migração).
-- =========================================================
USE oficina_mecanica;

DROP PROCEDURE IF EXISTS mimetic_migracao_ordens;

DELIMITER $$

CREATE PROCEDURE mimetic_migracao_ordens()
BEGIN
    -- 1) id_cliente passa a aceitar NULL (repetir não causa problema)
    ALTER TABLE ordem_servico MODIFY id_cliente INT NULL;

    -- 2) dados do cliente gravados na própria ordem
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ordem_servico' AND COLUMN_NAME = 'cliente_nome') THEN
        ALTER TABLE ordem_servico ADD COLUMN cliente_nome VARCHAR(100) NULL AFTER id_funcionario;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ordem_servico' AND COLUMN_NAME = 'cliente_cpf') THEN
        ALTER TABLE ordem_servico ADD COLUMN cliente_cpf VARCHAR(14) NULL AFTER cliente_nome;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ordem_servico' AND COLUMN_NAME = 'cliente_telefone') THEN
        ALTER TABLE ordem_servico ADD COLUMN cliente_telefone VARCHAR(20) NULL AFTER cliente_cpf;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ordem_servico' AND COLUMN_NAME = 'cliente_email') THEN
        ALTER TABLE ordem_servico ADD COLUMN cliente_email VARCHAR(100) NULL AFTER cliente_telefone;
    END IF;

    -- 3) serviços da ordem em TEXTO ("Troca de óleo, Alinhamento")
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ordem_servico' AND COLUMN_NAME = 'servicos') THEN
        ALTER TABLE ordem_servico ADD COLUMN servicos TEXT NULL AFTER orcamento;
    ELSEIF EXISTS (SELECT 1 FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ordem_servico' AND COLUMN_NAME = 'servicos'
                      AND DATA_TYPE = 'json') THEN
        -- era JSON [{"nome":"...","preco":...}]: junta os nomes, na ordem, separados por ", "
        ALTER TABLE ordem_servico ADD COLUMN servicos_texto TEXT NULL AFTER orcamento;
        UPDATE ordem_servico o
          JOIN (SELECT o2.id_ordem,
                       GROUP_CONCAT(j.nome ORDER BY j.pos SEPARATOR ', ') AS texto
                  FROM ordem_servico o2,
                       JSON_TABLE(o2.servicos, '$[*]'
                           COLUMNS (pos FOR ORDINALITY, nome VARCHAR(100) PATH '$.nome')) AS j
                 WHERE j.nome IS NOT NULL AND j.nome <> ''
                 GROUP BY o2.id_ordem) t ON t.id_ordem = o.id_ordem
           SET o.servicos_texto = t.texto;
        ALTER TABLE ordem_servico DROP COLUMN servicos;
        ALTER TABLE ordem_servico CHANGE COLUMN servicos_texto servicos TEXT NULL;
    END IF;

    -- 4) coluna da senha do funcionário mais larga (repetir não causa problema)
    ALTER TABLE Funcionario MODIFY senha VARCHAR(255) NOT NULL;

    -- 6) data de nascimento do cliente (cadastro de clientes pela API)
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Cliente' AND COLUMN_NAME = 'data_nascimento') THEN
        ALTER TABLE Cliente ADD COLUMN data_nascimento DATE NULL;
    END IF;
END$$

DELIMITER ;

CALL mimetic_migracao_ordens();
DROP PROCEDURE mimetic_migracao_ordens;

-- 5) códigos de recuperação de senha (só cria se ainda não existir)
CREATE TABLE IF NOT EXISTS recuperacao_senha (
    id_recuperacao INT AUTO_INCREMENT PRIMARY KEY,
    id_funcionario INT NOT NULL,
    codigo_hash CHAR(64) NOT NULL,
    expira_em DATETIME NOT NULL,
    tentativas TINYINT NOT NULL DEFAULT 0,
    criada_em DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_recuperacao_funcionario
        FOREIGN KEY (id_funcionario)
        REFERENCES Funcionario(id_funcionario)
        ON DELETE CASCADE
);
