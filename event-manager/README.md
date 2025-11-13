# Event Manager - Sistema de Gestão de Eventos com QR Code

Aplicação web responsiva para gestão de eventos, confirmação de presença e check-in via QR code.

## 🎯 Funcionalidades

- ✅ Criar eventos
- 📤 Upload de convidados via CSV
- 🔗 Links únicos de confirmação
- 📱 QR Code para cada convidado
- 📷 Check-in via scanner QR
- 📊 Dashboard com estatísticas
- 💾 Backend com Supabase

## 🛠️ Tecnologias

- React + Vite
- TailwindCSS
- Supabase (Base de dados + Storage)
- React Router DOM
- html5-qrcode (Scanner)
- qrcode.react (Gerador QR)

## 📋 Pré-requisitos

- Node.js 18+
- Conta no Supabase
- Conta no Netlify (para deploy)

## 🚀 Configuração

### 1. Clonar o projeto

```bash
git clone <url-do-repositorio>
cd event-manager
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar Supabase

#### 3.1 Criar projeto no Supabase

1. Aceder a [supabase.com](https://supabase.com)
2. Criar novo projeto
3. Guardar a URL e a chave anon

#### 3.2 Criar tabelas no Supabase

Executar o seguinte SQL no editor SQL do Supabase:

```sql
-- Tabela de eventos
CREATE TABLE eventos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  local VARCHAR(500) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de convidados
CREATE TABLE convidados (
  id UUID PRIMARY KEY,
  evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  mesa VARCHAR(50) NOT NULL,
  confirmado BOOLEAN DEFAULT false,
  checkin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX idx_convidados_evento_id ON convidados(evento_id);
CREATE INDEX idx_convidados_confirmado ON convidados(confirmado);
CREATE INDEX idx_convidados_checkin ON convidados(checkin);

-- RLS (Row Level Security) - Importante para produção
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE convidados ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (permite acesso anónimo para esta demo)
CREATE POLICY "Enable read access for all users" ON eventos
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON eventos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON eventos
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON convidados
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON convidados
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON convidados
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON convidados
  FOR DELETE USING (true);
```

#### 3.3 Criar Storage Bucket

1. No painel do Supabase, ir para Storage
2. Criar novo bucket chamado `qrcodes`
3. Tornar o bucket público (para simplificar)

```sql
-- Tornar bucket público (executar no SQL Editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('qrcodes', 'qrcodes', true)
ON CONFLICT (id) DO UPDATE SET public = true;
```

### 4. Configurar variáveis de ambiente

1. Copiar `.env.example` para `.env`
2. Adicionar as credenciais do Supabase:

```bash
cp .env.example .env
```

Editar `.env`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Executar em desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

## 📦 Build para produção

```bash
npm run build
```

Os ficheiros compilados estarão na pasta `dist/`

## 🌐 Deploy no Netlify

### Opção 1: Deploy via Git

1. Fazer push do código para GitHub/GitLab/Bitbucket
2. No Netlify:
   - New site from Git
   - Conectar repositório
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Adicionar variáveis de ambiente

### Opção 2: Deploy manual

1. Build local:
```bash
npm run build
```

2. Arrastar pasta `dist` para o Netlify

### Configurar variáveis de ambiente no Netlify

1. Site settings → Environment variables
2. Adicionar:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 📱 Uso da Aplicação

### 1. Criar Evento
- Aceder a `/`
- Preencher informações do evento
- Clicar em "Criar Evento"

### 2. Upload de Convidados
- Aceder a `/upload`
- Fazer upload de ficheiro CSV com colunas: nome, email, mesa
- Sistema gera links únicos automaticamente

### 3. Confirmação (Convidado)
- Convidado recebe link único
- Ao abrir, confirma presença
- Recebe QR Code para check-in

### 4. Check-in (Admin)
- Aceder a `/checkin`
- Usar scanner QR ou check-in manual
- Ver estatísticas em tempo real

### 5. Dashboard
- Aceder a `/dashboard`
- Ver todos os convidados
- Exportar para CSV
- Gerir confirmações e check-ins

## 📄 Formato CSV

Exemplo de ficheiro CSV para upload:

```csv
nome,email,mesa
João Silva,joao@email.com,1
Maria Santos,maria@email.com,2
Pedro Costa,pedro@email.com,1
Ana Ferreira,ana@email.com,3
```

## 🔒 Segurança

Para produção, considere:

1. **Autenticação Admin**: Implementar login para áreas administrativas
2. **RLS Supabase**: Configurar políticas mais restritivas
3. **Rate Limiting**: Adicionar limites de requisições
4. **Validação**: Validar todos os inputs no backend

## 🐛 Resolução de Problemas

### Erro de CORS
- Verificar se a URL do Supabase está correta
- Verificar configurações de CORS no Supabase

### Scanner QR não funciona
- Verificar permissões da câmara
- Testar em HTTPS (requerido para câmara)

### Storage não funciona
- Verificar se o bucket `qrcodes` existe
- Verificar se está público

## 📝 Licença

MIT

## 🤝 Suporte

Para questões ou problemas, abrir uma issue no repositório.
