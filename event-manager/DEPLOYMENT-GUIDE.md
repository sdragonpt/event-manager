# 📚 GUIA DE DEPLOYMENT - EVENT MANAGER

## 🎯 Passo a Passo Completo

### PARTE 1: CONFIGURAR SUPABASE

#### 1.1 Criar conta e projeto
1. Aceder a https://supabase.com
2. Criar conta gratuita (se ainda não tiver)
3. Clicar em "New Project"
4. Preencher:
   - Project name: `event-manager`
   - Database Password: (guarde esta password!)
   - Region: Europe (Frankfurt) ou mais próximo
5. Clicar em "Create new project" e aguardar

#### 1.2 Configurar base de dados
1. No menu lateral, clicar em "SQL Editor"
2. Clicar em "New query"
3. Copiar todo o conteúdo do ficheiro `supabase-setup.sql`
4. Colar no editor SQL
5. Clicar em "Run" (ou Ctrl+Enter)
6. Verificar se aparece "Success" em verde

#### 1.3 Obter credenciais
1. No menu lateral, clicar em "Settings" → "API"
2. Copiar e guardar:
   - **Project URL**: https://xxxxx.supabase.co
   - **Anon public key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

### PARTE 2: CONFIGURAR PROJETO LOCAL

#### 2.1 Preparar ficheiros
1. Extrair o arquivo `event-manager.tar.gz`
2. Abrir a pasta no terminal/VS Code
3. Criar ficheiro `.env` na raiz do projeto
4. Adicionar as credenciais:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 2.2 Instalar e testar
```bash
# Instalar dependências
npm install

# Testar localmente
npm run dev

# Abrir http://localhost:5173
```

### PARTE 3: DEPLOY NO NETLIFY

#### Opção A: Deploy via GitHub (Recomendado)

##### A.1 Upload para GitHub
1. Criar repositório no GitHub
2. No terminal do projeto:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/seu-usuario/event-manager.git
git push -u origin main
```

##### A.2 Conectar Netlify
1. Aceder a https://netlify.com
2. Login/Criar conta
3. Clicar em "Add new site" → "Import an existing project"
4. Escolher "GitHub"
5. Autorizar e selecionar o repositório
6. Configurações de build:
   - Build command: `npm run build`
   - Publish directory: `dist`
7. Clicar em "Show advanced" → "New variable"
8. Adicionar variáveis:
   - Key: `VITE_SUPABASE_URL` | Value: (sua URL)
   - Key: `VITE_SUPABASE_ANON_KEY` | Value: (sua key)
9. Clicar em "Deploy site"

#### Opção B: Deploy Manual (Mais Rápido)

##### B.1 Build local
```bash
# No terminal do projeto
npm run build
```

##### B.2 Upload para Netlify
1. Aceder a https://app.netlify.com/drop
2. Arrastar a pasta `dist` para a área indicada
3. Aguardar upload
4. Site online! (mas sem variáveis de ambiente)

##### B.3 Configurar variáveis
1. Clicar em "Site settings"
2. "Environment variables" → "Add a variable"
3. Adicionar:
   - `VITE_SUPABASE_URL` = sua URL
   - `VITE_SUPABASE_ANON_KEY` = sua key
4. "Deploys" → "Trigger deploy" → "Deploy site"

### PARTE 4: CONFIGURAÇÃO PÓS-DEPLOY

#### 4.1 Testar aplicação
1. Abrir o URL fornecido pelo Netlify
2. Criar um evento teste
3. Upload do ficheiro `exemplo-convidados.csv`
4. Testar link de confirmação
5. Testar check-in com QR code

#### 4.2 Domínio personalizado (opcional)
1. Em "Site settings" → "Domain management"
2. "Add custom domain"
3. Seguir instruções para configurar DNS

### 📋 CHECKLIST FINAL

- [ ] Supabase configurado com tabelas
- [ ] Credenciais copiadas corretamente
- [ ] Projeto testado localmente
- [ ] Deploy bem-sucedido no Netlify
- [ ] Variáveis de ambiente configuradas
- [ ] Teste de criação de evento funcional
- [ ] Upload de CSV funcional
- [ ] Confirmação de presença funcional
- [ ] QR code gerado corretamente
- [ ] Check-in funcional

### 🚨 RESOLUÇÃO DE PROBLEMAS

#### Erro: "Missing Supabase environment variables"
**Solução**: Verificar se as variáveis estão no .env (local) ou configuradas no Netlify

#### Erro: "relation eventos does not exist"
**Solução**: Executar o SQL de setup no Supabase

#### Scanner QR não funciona
**Solução**: 
- Verificar permissões da câmara no browser
- Testar em HTTPS (obrigatório para câmara)
- No Netlify, já está em HTTPS automaticamente

#### Erro de CORS
**Solução**: 
- Verificar URL do Supabase (sem / no final)
- Verificar se a key está completa

### 📞 SUPORTE

Problemas? Verifique:
1. Console do browser (F12) para erros
2. Logs do Netlify em "Functions"
3. Logs do Supabase em "Logs"

### 🎉 PARABÉNS!

A sua aplicação de gestão de eventos está pronta!

URLs importantes:
- App: https://seu-site.netlify.app
- Supabase: https://app.supabase.com/project/xxxxx
- Netlify: https://app.netlify.com/sites/seu-site

### 📈 PRÓXIMOS PASSOS

1. **Segurança**: Implementar autenticação admin
2. **Email**: Integrar serviço de email (SendGrid/Resend)
3. **Analytics**: Adicionar Google Analytics
4. **Backup**: Configurar backups automáticos no Supabase
5. **Personalização**: Adaptar cores e logo
