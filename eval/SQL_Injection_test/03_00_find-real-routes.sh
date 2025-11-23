# #!/bin/bash
# echo "=== FINDING REAL API ROUTES ==="

# # Methode 1: Schau in den Gateway-Code --> Theoretische Analyse (Code Blue Team)
# echo "\n📋 Routes defined in gateway:"
# grep -r "fastify\.(get\|post\|put\|delete)" \
#   ~/Project/ft_transcnd/transcendence/services/gateway/src/ \
#   | grep -v node_modules \
#   | sed 's/.*fastify\.\(.*\)(.*/  \1/' \
#   | sort -u


# # Methode 2: Prüfe die Frontend-Requests --> List API Rountes 
# echo "\n\n🌐 API calls from frontend:"
# grep -rh "fetch.*api" ~/Project/ft_transcnd/transcendence/frontend/src/ \
#   | grep -oP '/(api/)?[a-z/]+' \
#   | sort -u \
#   | head -20


# Methode 3: Teste bekannte Patterns (Erkundung -> Expetion) Wo und wer Antwortete mir 
echo "\n\n🔍 Testing common patterns:"
for path in \
  /auth/login \
  /auth/register \
  /auth/logout \
  /user \
  /users/me \
  /game/create \
  /pong \
  /tournament
do
  code=$(curl -k -s -o /dev/null -w "%{http_code}" https://localhost:8443$path)
  if [ "$code" != "404" ]; then
    echo "  ✓ $path → $code"
  fi
done

