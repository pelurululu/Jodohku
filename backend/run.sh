#!/bin/bash
# ════════════════════════════════════════════════════════════
#  JODOHKU — run.sh
#  Script permulaan pelayan
# ════════════════════════════════════════════════════════════

set -e

echo "════════════════════════════════════"
echo "  JODOHKU — The Magnum Opus Engine"
echo "════════════════════════════════════"

# Semak .env wujud
if [ ! -f ".env" ]; then
    echo "⚠️  Fail .env tidak ditemui. Menyalin dari .env.example..."
    cp .env.example .env
    echo "✅ .env dicipta. Sila edit dan isi API keys sebelum deploy ke production."
fi

# Semak static/index.html
if [ ! -f "static/index.html" ]; then
    echo "⚠️  static/index.html tidak ditemui."
    echo "   Sila salin fail Jodohku frontend ke static/index.html"
    mkdir -p static
fi

# Install dependencies
echo "📦 Memasang dependencies..."
pip install -r requirements.txt -q

# Jalankan pelayan
echo "🚀 Melancarkan pelayan di http://localhost:8000"
echo "📖 API Docs: http://localhost:8000/docs"
echo ""
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
