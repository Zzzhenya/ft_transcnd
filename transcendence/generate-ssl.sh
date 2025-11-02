#!/bin/bash

# SSL Certificate Generation Script for ft_transcendence
# Creates self-signed certificates for local development
# Compatible with OpenSSL 1.0.x, 1.1.x, and 3.x

SSL_DIR="./nginx/ssl"
CERT_FILE="$SSL_DIR/certificate.crt"
KEY_FILE="$SSL_DIR/private.key"
CSR_FILE="$SSL_DIR/certificate.csr"
EXT_FILE="$SSL_DIR/v3.ext"
DAYS=365

echo "🔐 Generating SSL certificates for ft_transcendence..."
echo "ℹ️  OpenSSL version: $(openssl version)"

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

# Generate private key
echo "📝 Generating private key..."
openssl genrsa -out "$KEY_FILE" 2048

# Check if OpenSSL supports -addext (version 1.1.1+)
if openssl req -help 2>&1 | grep -q -- '-addext'; then
    echo "✨ Using modern OpenSSL with -addext flag..."
    # Modern method (OpenSSL 1.1.1+)
    openssl req -new -x509 -key "$KEY_FILE" -out "$CERT_FILE" -days $DAYS \
        -subj "/C=DE/ST=Berlin/L=Berlin/O=42School/OU=ft_transcendence/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"
else
    echo "🔧 Using legacy OpenSSL with extension file method..."
    # Legacy method (OpenSSL 1.0.x and 1.1.0)
    
    # Create v3 extension file for Subject Alternative Name (SAN)
    cat > "$EXT_FILE" << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
EOF

    # Generate Certificate Signing Request (CSR)
    openssl req -new -key "$KEY_FILE" -out "$CSR_FILE" \
        -subj "/C=DE/ST=Berlin/L=Berlin/O=42School/OU=ft_transcendence/CN=localhost"

    # Generate self-signed certificate using the CSR and extension file
    openssl x509 -req -in "$CSR_FILE" -signkey "$KEY_FILE" -out "$CERT_FILE" \
        -days $DAYS -extfile "$EXT_FILE"

    # Clean up temporary files
    rm -f "$CSR_FILE" "$EXT_FILE"
fi

# Set proper permissions
chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

echo "✅ SSL certificates generated successfully!"
echo "📁 Certificate: $CERT_FILE"
echo "🔑 Private key: $KEY_FILE"
echo "⏰ Valid for: $DAYS days"
echo ""
echo "🚀 You can now run: make dev-ssl or docker-compose up"