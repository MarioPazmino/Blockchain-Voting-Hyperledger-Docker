#!/bin/bash
# deploy-chaincode.sh

# Asegúrate de que estés en el directorio correcto
cd "$(dirname "$0")"

echo "Empaquetando chaincode..."
docker exec cli peer lifecycle chaincode package voting.tar.gz --path /opt/gopath/src/github.com/chaincode/voting --lang node --label voting_1.0

echo "Instalando chaincode..."
docker exec cli peer lifecycle chaincode install voting.tar.gz

# Obtener el package ID
PACKAGE_ID=$(docker exec cli peer lifecycle chaincode queryinstalled | grep voting_1.0 | awk '{print $3}' | sed 's/,$//')
echo "Package ID: $PACKAGE_ID"

echo "Aprobando chaincode para la organización..."
docker exec cli peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name voting --version 1.0 --package-id $PACKAGE_ID --sequence 1

echo "Confirmando chaincode..."
docker exec cli peer lifecycle chaincode commit -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name voting --version 1.0 --sequence 1

echo "Inicializando chaincode..."
docker exec cli peer chaincode invoke -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n voting -c '{"function":"initLedger","Args":[]}'

echo "Chaincode desplegado correctamente!"