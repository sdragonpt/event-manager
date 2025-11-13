#!/bin/bash
# QUICK START - Event Manager
# Execute este script para configurar rapidamente o projeto

echo "🚀 Event Manager - Quick Start"
echo "=============================="
echo ""

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado!"
    echo "Por favor, instale o Node.js 18+ de: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js instalado: $(node -v)"
echo ""

# Verificar se existe o ficheiro .env
if [ ! -f .env ]; then
    echo "📝 Criando ficheiro .env..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANTE: Edite o ficheiro .env com as suas credenciais do Supabase!"
    echo "   VITE_SUPABASE_URL=sua_url_aqui"
    echo "   VITE_SUPABASE_ANON_KEY=sua_chave_aqui"
    echo ""
    read -p "Pressione ENTER após configurar o .env..."
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

echo ""
echo "✨ Instalação concluída!"
echo ""
echo "🎯 Próximos passos:"
echo "1. Configure o Supabase (veja DEPLOYMENT-GUIDE.md)"
echo "2. Execute: npm run dev"
echo "3. Abra: http://localhost:5173"
echo ""
echo "📚 Documentação:"
echo "- README.md - Visão geral do projeto"
echo "- DEPLOYMENT-GUIDE.md - Guia completo de deployment"
echo "- supabase-setup.sql - Script SQL para configurar BD"
echo "- exemplo-convidados.csv - Ficheiro CSV de teste"
echo ""
echo "Boa sorte! 🎉"
