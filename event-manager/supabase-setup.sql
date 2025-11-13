-- ==============================================
-- SETUP SUPABASE - GESTOR DE EVENTOS
-- ==============================================

-- 1. CRIAR TABELAS
-- ----------------------------------------------

-- Tabela de eventos
CREATE TABLE IF NOT EXISTS eventos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  local VARCHAR(500) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de convidados
CREATE TABLE IF NOT EXISTS convidados (
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

-- 2. CRIAR ÍNDICES
-- ----------------------------------------------

CREATE INDEX IF NOT EXISTS idx_convidados_evento_id ON convidados(evento_id);
CREATE INDEX IF NOT EXISTS idx_convidados_confirmado ON convidados(confirmado);
CREATE INDEX IF NOT EXISTS idx_convidados_checkin ON convidados(checkin);
CREATE INDEX IF NOT EXISTS idx_convidados_email ON convidados(email);

-- 3. ATIVAR RLS (Row Level Security)
-- ----------------------------------------------

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE convidados ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR POLÍTICAS DE ACESSO
-- ----------------------------------------------
-- NOTA: Estas políticas permitem acesso anónimo.
-- Para produção, considere implementar autenticação!

-- Políticas para tabela eventos
DROP POLICY IF EXISTS "Enable read access for all users" ON eventos;
CREATE POLICY "Enable read access for all users" ON eventos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON eventos;
CREATE POLICY "Enable insert for all users" ON eventos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON eventos;
CREATE POLICY "Enable update for all users" ON eventos
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for all users" ON eventos;
CREATE POLICY "Enable delete for all users" ON eventos
  FOR DELETE USING (true);

-- Políticas para tabela convidados
DROP POLICY IF EXISTS "Enable read access for all users" ON convidados;
CREATE POLICY "Enable read access for all users" ON convidados
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON convidados;
CREATE POLICY "Enable insert for all users" ON convidados
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON convidados;
CREATE POLICY "Enable update for all users" ON convidados
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for all users" ON convidados;
CREATE POLICY "Enable delete for all users" ON convidados
  FOR DELETE USING (true);

-- 5. CRIAR FUNÇÕES AUXILIARES
-- ----------------------------------------------

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_eventos_updated_at ON eventos;
CREATE TRIGGER update_eventos_updated_at 
  BEFORE UPDATE ON eventos 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_convidados_updated_at ON convidados;
CREATE TRIGGER update_convidados_updated_at 
  BEFORE UPDATE ON convidados 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 6. CONFIGURAR STORAGE
-- ----------------------------------------------
-- NOTA: Execute este SQL após criar o bucket via interface

-- Criar bucket para QR codes (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('qrcodes', 'qrcodes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Política para permitir upload de QR codes
CREATE POLICY "Allow public uploads" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'qrcodes');

-- Política para permitir leitura pública
CREATE POLICY "Allow public reads" ON storage.objects 
  FOR SELECT USING (bucket_id = 'qrcodes');

-- 7. DADOS DE EXEMPLO (OPCIONAL)
-- ----------------------------------------------

-- Inserir evento de exemplo
/*
INSERT INTO eventos (nome, data, hora, local)
VALUES (
  'Evento de Demonstração',
  CURRENT_DATE + INTERVAL '7 days',
  '19:00:00',
  'Sala de Eventos, Lisboa'
);
*/

-- ==============================================
-- FIM DO SETUP
-- ==============================================

-- NOTAS IMPORTANTES:
-- 1. Guarde a URL e a chave ANON do seu projeto Supabase
-- 2. Configure as variáveis de ambiente no .env
-- 3. Para produção, implemente autenticação adequada
-- 4. Considere adicionar backups regulares
-- 5. Monitore o uso e performance das queries
