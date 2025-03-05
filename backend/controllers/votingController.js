const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const connection = require('../config/db');

// Crear una nueva votación
exports.createVoting = async (req, res) => {
    const { title, options } = req.body;
    
    try {
        // Primero guardar en MySQL
        const query = 'INSERT INTO votings (title, options) VALUES (?, ?)';
        connection.query(query, [title, JSON.stringify(options)], async (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Error al crear la votación en la base de datos', error: err.message });
            }
            
            const votingId = results.insertId;
            
            try {
                // Luego guardar en la blockchain
                const ccpPath = path.resolve(__dirname, '..', 'config', 'connection-org1.json');
                const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
                
                const gateway = new Gateway();
                await gateway.connect(ccp, {
                    wallet: await Wallets.newFileSystemWallet(path.join(__dirname, '..', 'wallet')),
                    identity: 'admin',
                    discovery: { enabled: true, asLocalhost: true },
                });
                
                const network = await gateway.getNetwork('mychannel');
                const contract = network.getContract('voting');
                
                // Crear la votación en la blockchain
                await contract.submitTransaction(
                    'createVoting', 
                    votingId.toString(), 
                    title, 
                    JSON.stringify(options)
                );
                
                await gateway.disconnect();
                
                res.status(201).json({ 
                    id: votingId,
                    title,
                    options,
                    message: 'Votación creada exitosamente en la base de datos y blockchain' 
                });
            } catch (blockchainError) {
                // Si hay error en la blockchain, eliminar el registro de MySQL
                connection.query('DELETE FROM votings WHERE id = ?', [votingId]);
                res.status(500).json({ message: 'Error al crear la votación en la blockchain', error: blockchainError.message });
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// Emitir un voto
exports.vote = async (req, res) => {
    const { votingId, voterId, option } = req.body;
    
    try {
        // Primero verificar que la votación existe en MySQL
        connection.query('SELECT * FROM votings WHERE id = ?', [votingId], async (err, results) => {
            if (err || results.length === 0) {
                return res.status(404).json({ message: 'Votación no encontrada' });
            }
            
            // Verificar que no haya votado antes en MySQL
            connection.query('SELECT * FROM votes WHERE voting_id = ? AND voter_id = ?', [votingId, voterId], async (err, votes) => {
                if (err) {
                    return res.status(500).json({ message: 'Error al verificar el voto', error: err.message });
                }
                
                if (votes.length > 0) {
                    return res.status(400).json({ message: 'Ya has votado en esta elección' });
                }
                
                try {
                    // Enviar el voto a la blockchain
                    const ccpPath = path.resolve(__dirname, '..', 'config', 'connection-org1.json');
                    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
                    
                    const gateway = new Gateway();
                    await gateway.connect(ccp, {
                        wallet: await Wallets.newFileSystemWallet(path.join(__dirname, '..', 'wallet')),
                        identity: 'admin',
                        discovery: { enabled: true, asLocalhost: true },
                    });
                    
                    const network = await gateway.getNetwork('mychannel');
                    const contract = network.getContract('voting');
                    
                    // Registrar el voto en la blockchain
                    await contract.submitTransaction('vote', votingId.toString(), voterId, option);
                    
                    // Crear un hash del voto para almacenarlo en MySQL (sin revelar la opción)
                    const crypto = require('crypto');
                    const voteHash = crypto.createHash('sha256').update(`${votingId}-${voterId}-${option}-${Date.now()}`).digest('hex');
                    
                    // Registrar en MySQL que el usuario ha votado
                    connection.query('INSERT INTO votes (voting_id, voter_id, vote_hash) VALUES (?, ?, ?)', 
                        [votingId, voterId, voteHash], async (err) => {
                        if (err) {
                            return res.status(500).json({ message: 'Error al registrar el voto en la base de datos', error: err.message });
                        }
                        
                        await gateway.disconnect();
                        res.status(200).json({ message: 'Voto registrado con éxito' });
                    });
                } catch (blockchainError) {
                    res.status(500).json({ message: 'Error al registrar el voto en la blockchain', error: blockchainError.message });
                }
            });
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// Obtener resultados de una votación
exports.getResults = async (req, res) => {
    const { id } = req.params;
    
    try {
        // Obtener información de la votación desde MySQL
        connection.query('SELECT * FROM votings WHERE id = ?', [id], async (err, results) => {
            if (err || results.length === 0) {
                return res.status(404).json({ message: 'Votación no encontrada' });
            }
            
            try {
                // Consultar resultados desde la blockchain
                const ccpPath = path.resolve(__dirname, '..', 'config', 'connection-org1.json');
                const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
                
                const gateway = new Gateway();
                await gateway.connect(ccp, {
                    wallet: await Wallets.newFileSystemWallet(path.join(__dirname, '..', 'wallet')),
                    identity: 'admin',
                    discovery: { enabled: true, asLocalhost: true },
                });
                
                const network = await gateway.getNetwork('mychannel');
                const contract = network.getContract('voting');
                
                // Obtener resultados de la blockchain
                const resultBuffer = await contract.evaluateTransaction('getVotingResults', id.toString());
                const votingResults = JSON.parse(resultBuffer.toString());
                
                // Obtener el recuento total de votos desde MySQL para verificación
                connection.query('SELECT COUNT(*) as totalVotes FROM votes WHERE voting_id = ?', [id], async (err, voteCount) => {
                    if (err) {
                        return res.status(500).json({ message: 'Error al obtener el recuento de votos', error: err.message });
                    }
                    
                    await gateway.disconnect();
                    
                    // Combinar información
                    const response = {
                        id: parseInt(id),
                        title: results[0].title,
                        options: JSON.parse(results[0].options),
                        results: votingResults.votes,
                        totalVotes: votingResults.totalVotes,
                        mysqlVoteCount: voteCount[0].totalVotes,
                        isActive: votingResults.isActive
                    };
                    
                    res.status(200).json(response);
                });
            } catch (blockchainError) {
                res.status(500).json({ message: 'Error al obtener resultados de la blockchain', error: blockchainError.message });
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};