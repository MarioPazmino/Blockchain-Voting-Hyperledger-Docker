#!/bin/bash
# create-channel.sh
# Asegúrate de que estés en el directorio correcto
cd "$(dirname "$0")"

# Crear directorio si no existe
mkdir -p ../channel-artifacts

# Set environment variables
export FABRIC_CFG_PATH=../

# Crear canal
echo "Creando canal mychannel..."
configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ../channel-artifacts/mychannel.tx -channelID mychannel -configPath ../

# Verificar si el archivo de transacción del canal se creó correctamente
if [ ! -f ../channel-artifacts/mychannel.tx ]; then
  echo "Error: No se pudo crear el archivo de transacción del canal."
  exit 1
fi

# Crear el canal usando el CLI container
echo "Creando el canal mychannel usando el CLI container..."
docker exec -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp \
-e CORE_PEER_ADDRESS=peer0.org1.example.com:7051 \
-e CORE_PEER_LOCALMSPID="Org1MSP" \
-e CORE_PEER_TLS_ENABLED=true \
-e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
cli peer channel create -o orderer.example.com:7050 -c mychannel -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/mychannel.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# Verificar si el archivo de bloque del canal se creó correctamente en el CLI container
if ! docker exec cli test -f /opt/gopath/src/github.com/hyperledger/fabric/peer/mychannel.block; then
  echo "Error: No se pudo crear el archivo de bloque del canal."
  exit 1
fi

# Unir al canal
echo "Uniendo peer0.org1 al canal..."
docker exec -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp \
-e CORE_PEER_ADDRESS=peer0.org1.example.com:7051 \
-e CORE_PEER_LOCALMSPID="Org1MSP" \
-e CORE_PEER_TLS_ENABLED=true \
-e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
cli peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/mychannel.block

echo "Canal creado y peer unido correctamente!"