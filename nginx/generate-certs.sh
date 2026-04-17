#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# generate-certs.sh
# Generates a self-signed TLS certificate for local development.
# In production: replace with Let's Encrypt (certbot) or a government CA cert.
# ══════════════════════════════════════════════════════════════════════════════

CERT_DIR="./nginx/certs"
DOMAIN="api.tuktrak.police.lk"

mkdir -p "$CERT_DIR"

echo "Generating self-signed TLS certificate for development..."
echo "Domain: $DOMAIN"
echo ""

openssl req -x509 \
  -newkey rsa:4096 \
  -keyout "$CERT_DIR/tuktrack.key" \
  -out    "$CERT_DIR/tuktrack.crt" \
  -days   365 \
  -nodes \
  -subj "/C=LK/ST=Western/L=Colombo/O=Sri Lanka Police/OU=ICT Division/CN=$DOMAIN" \
  -addext "subjectAltName=DNS:$DOMAIN,DNS:localhost,IP:127.0.0.1"

echo ""
echo "✅ Certificate generated:"
echo "   Certificate : $CERT_DIR/tuktrack.crt"
echo "   Private key : $CERT_DIR/tuktrack.key"
echo ""
echo "⚠️  This is a SELF-SIGNED cert for DEVELOPMENT ONLY."
echo "   For production, use Let's Encrypt or a government CA."
echo ""
echo "To verify the cert:"
echo "   openssl x509 -in $CERT_DIR/tuktrack.crt -text -noout"
