#!/bin/bash

# SSL Certificate Generation Script for ft_transcendence
# Creates self-signed certificates for local development

SSL_DIR="./nginx/ssl"
CERT_FILE="$SSL_DIR/certificate.crt"
KEY_FILE="$SSL_DIR/private.key"
DAYS=365

echo "🔐 Generating SSL certificates for ft_transcendence..."

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

# Generate private key
echo "📝 Generating private key..."
openssl genrsa -out "$KEY_FILE" 2048

# Generate certificate
echo "📜 Generating certificate..."
openssl req -new -x509 -key "$KEY_FILE" -out "$CERT_FILE" -days $DAYS \
    -subj "/C=DE/ST=Berlin/L=Berlin/O=42School/OU=ft_transcendence/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"

# Set proper permissions
chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

echo "✅ SSL certificates generated successfully!"
echo "📁 Certificate: $CERT_FILE"
echo "🔑 Private key: $KEY_FILE"
echo "⏰ Valid for: $DAYS days"
echo ""
echo "🚀 You can now run: make dev-ssl or docker-compose up"