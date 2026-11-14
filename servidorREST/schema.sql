CREATE DATABASE IF NOT EXISTS oficina_mecanica;
USE oficina_mecanica;

CREATE TABLE Cliente (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    telefone VARCHAR(20),
    data_cadastro DATE NOT NULL DEFAULT (CURRENT_DATE),
    cpf VARCHAR(14) UNIQUE,
    data_nascimento DATE NULL               -- NOVO: pedida no cadastro de cliente
);

CREATE TABLE Veiculo (
    placa VARCHAR(10) PRIMARY KEY,
    modelo VARCHAR(50) NOT NULL,
    marca VARCHAR(50) NOT NULL,
    ano INT,
    cor VARCHAR(30),
    id_cliente INT NOT NULL,

    CONSTRAINT fk_veiculo_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES Cliente(id_cliente)
        ON DELETE CASCADE
);

CREATE TABLE Funcionario (
    id_funcionario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    senha VARCHAR(255) NOT NULL,            -- 255: cabe o hash da senha (ver README, secao 5.3)
    email VARCHAR(255) NOT NULL UNIQUE,
    telefone VARCHAR(20),
    cargo VARCHAR(50),
    salario DECIMAL(10,2),
    agencia VARCHAR(20),
    conta VARCHAR(20),
    especialidade VARCHAR(100)
);

CREATE TABLE Agendamento (
    id_agendamento INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    placa VARCHAR(10) NOT NULL,
    data_hora DATETIME NOT NULL,
    descricao_agendamento VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'Pendente',

    CONSTRAINT fk_agendamento_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES Cliente(id_cliente),

    CONSTRAINT fk_agendamento_veiculo
        FOREIGN KEY (placa)
        REFERENCES Veiculo(placa)
);

CREATE TABLE ordem_servico (
  id_ordem INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT NULL,                    -- ALTERADO: aceita NULL enquanto a API de clientes nao existe
  id_funcionario INT NOT NULL,            -- funcionário que abriu a OS
  cliente_nome VARCHAR(100) NULL,         -- NOVO: dados do cliente gravados na propria OS
  cliente_cpf VARCHAR(14) NULL,           -- NOVO  (quando a API de clientes existir, preencher id_cliente)
  cliente_telefone VARCHAR(20) NULL,      -- NOVO
  cliente_email VARCHAR(100) NULL,        -- NOVO
  placa VARCHAR(8) NOT NULL,
  veiculo VARCHAR(100),
  ano_carro VARCHAR(10),
  solicitacao VARCHAR(150),
  previsao_conclusao DATE,
  orcamento DECIMAL(10,2) NOT NULL DEFAULT 0,
  servicos JSON NULL,                     -- NOVO: servicos da OS, [{"nome":"...","preco":150.5}, ...]
  status VARCHAR(40) NOT NULL DEFAULT 'Aguardando pagamento',
  etapa TINYINT NOT NULL DEFAULT 1,
  forma_pagamento VARCHAR(20),
  criada_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_cliente) REFERENCES Cliente(id_cliente),
  FOREIGN KEY (id_funcionario) REFERENCES Funcionario(id_funcionario)
);
