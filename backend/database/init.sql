CREATE DATABASE IF NOT EXISTS voting_system;
USE voting_system;

CREATE TABLE votings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    options JSON NOT NULL
);

CREATE TABLE votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voting_id INT NOT NULL,
    voter_id VARCHAR(255) NOT NULL,
    vote_hash VARCHAR(64) NOT NULL, -- Hash del voto (SHA-256)
    FOREIGN KEY (voting_id) REFERENCES votings(id),
    UNIQUE (voting_id, voter_id) -- Evita votos duplicados
);