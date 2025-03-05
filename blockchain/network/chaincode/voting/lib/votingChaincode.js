'use strict';

const { Contract } = require('fabric-contract-api');

class VotingContract extends Contract {
    
    // Inicializar el chaincode
    async initLedger(ctx) {
        console.log('Chaincode para Sistema de Votaciones inicializado');
        await ctx.stub.putState('initKey', Buffer.from('Initialized'));
        return true;
    }
    
    // Crear una nueva votación
    async createVoting(ctx, votingId, title, optionsJSON) {
        console.log(`Creando votación con ID: ${votingId}`);
        
        // Verificar si la votación ya existe
        const exists = await ctx.stub.getState(votingId);
        if (exists && exists.length > 0) {
            throw new Error(`La votación con ID ${votingId} ya existe`);
        }
        
        // Crear el objeto de votación
        const options = JSON.parse(optionsJSON);
        const voting = {
            id: votingId,
            title: title,
            options: options,
            votes: {},
            totalVotes: 0,
            isActive: true,
            timestamp: new Date().toISOString()
        };
        
        // Por cada opción, inicializar el contador a 0
        for (const option of options) {
            voting.votes[option] = 0;
        }
        
        // Guardar la votación en el ledger
        await ctx.stub.putState(votingId, Buffer.from(JSON.stringify(voting)));
        return JSON.stringify(voting);
    }
    
    // Registrar un voto
    async vote(ctx, votingId, voterId, option) {
        console.log(`Registrando voto para votación ${votingId} del votante ${voterId} para opción ${option}`);
        
        // Obtener la votación
        const votingBytes = await ctx.stub.getState(votingId);
        if (!votingBytes || votingBytes.length === 0) {
            throw new Error(`La votación con ID ${votingId} no existe`);
        }
        
        const voting = JSON.parse(votingBytes.toString());
        
        // Verificar si la votación está activa
        if (!voting.isActive) {
            throw new Error('Esta votación no está activa');
        }
        
        // Verificar si la opción es válida
        if (!voting.options.includes(option)) {
            throw new Error(`La opción ${option} no es válida para esta votación`);
        }
        
        // Crear el ID de historial de voto para verificar duplicados
        const voteHistoryId = `vote_${votingId}_${voterId}`;
        
        // Verificar si el votante ya ha votado
        const voteHistoryBytes = await ctx.stub.getState(voteHistoryId);
        if (voteHistoryBytes && voteHistoryBytes.length > 0) {
            throw new Error(`El votante ${voterId} ya ha emitido un voto en esta votación`);
        }
        
        // Registrar el voto
        voting.votes[option] += 1;
        voting.totalVotes += 1;
        
        // Guardar el voto en el historial
        const voteHistory = {
            votingId: votingId,
            voterId: voterId,
            option: option,
            timestamp: new Date().toISOString()
        };
        
        // Actualizar el estado
        await ctx.stub.putState(votingId, Buffer.from(JSON.stringify(voting)));
        await ctx.stub.putState(voteHistoryId, Buffer.from(JSON.stringify(voteHistory)));
        
        return JSON.stringify(voting);
    }
    
    // Obtener los resultados de una votación
    async getVotingResults(ctx, votingId) {
        console.log(`Obteniendo resultados para votación ${votingId}`);
        
        // Obtener la votación
        const votingBytes = await ctx.stub.getState(votingId);
        if (!votingBytes || votingBytes.length === 0) {
            throw new Error(`La votación con ID ${votingId} no existe`);
        }
        
        const voting = JSON.parse(votingBytes.toString());
        
        // Crear objeto de resultados
        const results = {
            id: voting.id,
            title: voting.title,
            totalVotes: voting.totalVotes,
            options: voting.options,
            votes: voting.votes,
            isActive: voting.isActive
        };
        
        return JSON.stringify(results);
    }
    
    // Cerrar una votación
    async closeVoting(ctx, votingId) {
        console.log(`Cerrando votación ${votingId}`);
        
        // Obtener la votación
        const votingBytes = await ctx.stub.getState(votingId);
        if (!votingBytes || votingBytes.length === 0) {
            throw new Error(`La votación con ID ${votingId} no existe`);
        }
        
        const voting = JSON.parse(votingBytes.toString());
        
        // Verificar que la votación esté activa
        if (!voting.isActive) {
            throw new Error('Esta votación ya está cerrada');
        }
        
        // Cerrar la votación
        voting.isActive = false;
        voting.closedAt = new Date().toISOString();
        
        // Actualizar el estado
        await ctx.stub.putState(votingId, Buffer.from(JSON.stringify(voting)));
        
        return JSON.stringify(voting);
    }
    
    // Verificar si un votante ya ha emitido su voto
    async hasVoted(ctx, votingId, voterId) {
        console.log(`Verificando si el votante ${voterId} ya ha votado en la votación ${votingId}`);
        
        // Crear el ID de historial de voto
        const voteHistoryId = `vote_${votingId}_${voterId}`;
        
        // Verificar si existe el registro
        const voteHistoryBytes = await ctx.stub.getState(voteHistoryId);
        return voteHistoryBytes && voteHistoryBytes.length > 0;
    }
}

module.exports = VotingContract;