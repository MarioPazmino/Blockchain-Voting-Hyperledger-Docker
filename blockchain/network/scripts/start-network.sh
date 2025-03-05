#!/bin/bash
# start-network.sh

# Asegúrate de que estés en el directorio correcto
cd "$(dirname "$0")"

# Eliminar contenedores antiguos y artefactos
echo "Limpiando ambiente..."
docker-compose -f ../docker-compose.yaml down
docker rm -f $(docker ps -aq) 2>/dev/null || true
docker volume prune -f
docker network prune -f

# Crear directorios para organizaciones
mkdir -p ../organizations/ordererOrganizations
mkdir -p ../organizations/peerOrganizations
mkdir -p ../organizations/fabric-ca
mkdir -p ../system-genesis-block

# Generar certificados usando cryptogen
echo "Generando certificados..."
rm -rf ../organizations
cryptogen generate --config=../crypto-config.yaml --output="../organizations"

# Crear bloque génesis y canal
echo "Creando bloque génesis..."
mkdir -p ../system-genesis-block
rm -f ../system-genesis-block/genesis.block
configtxgen -profile TwoOrgsOrdererGenesis -channelID system-channel -outputBlock ../system-genesis-block/genesis.block -configPath ../

# Iniciar la red
echo "Iniciando la red..."
docker-compose -f ../docker-compose.yaml up -d

echo "Esperando a que los nodos estén listos..."
sleep 10

echo "Red iniciada correctamente!"