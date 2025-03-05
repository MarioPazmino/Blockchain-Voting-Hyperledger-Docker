#!/bin/bash
# enroll-admin.sh

# Asegúrate de que estés en el directorio correcto
cd "$(dirname "$0")"

# Crea el directorio para la wallet si no existe
mkdir -p ../../backend/wallet

# Inscribe al usuario admin
echo "Inscribiendo al usuario admin..."

# Eliminar identidad existente si existe
rm -rf ../../backend/wallet/admin

# Establece variables de entorno para fabric-ca-client
export FABRIC_CA_CLIENT_HOME=../../backend/wallet/admin
export FABRIC_CA_CLIENT_TLS_CERTFILES=../organizations/fabric-ca/org1/ca-cert.pem

# Inscribe al admin
fabric-ca-client enroll -u https://admin:adminpw@localhost:7054 --caname ca.org1.example.com --tls.certfiles ../organizations/fabric-ca/org1/ca-cert.pem

# Crear el archivo connection-org1.json en el directorio de configuración del backend
echo "Copiando el archivo de conexión al directorio del backend..."
cp ../connection-profile.json ../../backend/config/connection-org1.json

echo "Administrador inscrito correctamente!"