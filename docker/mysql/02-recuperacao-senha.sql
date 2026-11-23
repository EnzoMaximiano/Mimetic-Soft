-- Tabela usada pela recuperação de senha (código de 6 dígitos).
-- Não está no schema.sql; é criada aqui para o ambiente Docker funcionar completo.
USE oficina_mecanica;

CREATE TABLE IF NOT EXISTS recuperacao_senha (
    id_recuperacao INT AUTO_INCREMENT PRIMARY KEY,
    id_funcionario INT NOT NULL,
    codigo_hash VARCHAR(64) NOT NULL,
    expira_em DATETIME NOT NULL,
    tentativas INT NOT NULL DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_funcionario) REFERENCES Funcionario(id_funcionario) ON DELETE CASCADE
);
