#!/bin/bash

# SSL Setup für Transcendence
echo "🔒 Setting up SSL certificates for Transcendence..."

# Erstelle nginx Verzeichnisse
mkdir -p nginx/ssl
mkdir -p nginx/html

# Erstelle SSL-Zertifikat (selbstsigniert für Development)
echo "📜 Creating self-signed SSL certificate..."

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/transcendence.key \
    -out nginx/ssl/transcendence.crt \
    -config <(
cat <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=DE
ST=North Rhine-Westphalia
L=Essen
O=42 School
OU=Transcendence Project
CN=ft_transcendence

[v3_req]
basicConstraints = CA:FALSE
keyUsage = keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = ft_transcendence
DNS.2 = *.ft_transcendence
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF
    )

# Setze richtige Permissions
chmod 600 nginx/ssl/transcendence.key
chmod 644 nginx/ssl/transcendence.crt

echo "✅ SSL certificates created!"
echo "🔑 Key: nginx/ssl/transcendence.key"
echo "📜 Certificate: nginx/ssl/transcendence.crt"

# Erstelle eine einfache HTML-Seite für Nginx
cat > nginx/html/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Transcendence - Loading...</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .loading { color: #007bff; }
    </style>
</head>
<body>
    <h1 class="loading">🚀 Transcendence is starting...</h1>
    <p>Please wait while the application loads.</p>
</body>
</html>
EOF

echo "📄 Created nginx/html/index.html"

# Hosts-Datei Eintrag Hinweis
echo ""
echo "🌐 IMPORTANT: Add this to your /etc/hosts file:"
echo "127.0.0.1    ft_transcendence"
echo ""
echo "Run this command:"
echo "echo '127.0.0.1    ft_transcendence' | sudo tee -a /etc/hosts"
echo ""
echo "🔧 Setup complete! Now run:"
echo "make up"
echo ""
echo "🌍 Then visit: https://ft_transcendence"
echo "🔧 Adminer: https://ft_transcendence/admin"
echo ""
echo "⚠️  Your browser will show a security warning for the self-signed certificate."
echo "   Click 'Advanced' → 'Accept Risk and Continue' to proceed."