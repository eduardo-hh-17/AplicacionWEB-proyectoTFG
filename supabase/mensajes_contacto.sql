-- Tabla para guardar los mensajes del formulario de contacto
-- Ejecutar en: Supabase > SQL Editor

CREATE TABLE IF NOT EXISTS mensajes_contacto (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre      text        NOT NULL,
  email       text        NOT NULL,
  asunto      text,
  mensaje     text        NOT NULL,
  leido       boolean     DEFAULT false,
  creado_en   timestamptz DEFAULT now()
);

-- Índices útiles para ordenar y filtrar por lectura
CREATE INDEX IF NOT EXISTS idx_mensajes_contacto_leido      ON mensajes_contacto(leido);
CREATE INDEX IF NOT EXISTS idx_mensajes_contacto_creado_en  ON mensajes_contacto(creado_en DESC);

-- RLS: solo el admin puede leer todos; cualquiera puede insertar
ALTER TABLE mensajes_contacto ENABLE ROW LEVEL SECURITY;

-- Política de inserción pública (el formulario de contacto no requiere auth)
CREATE POLICY "insert_publico" ON mensajes_contacto
  FOR INSERT WITH CHECK (true);

-- Política de lectura solo para usuarios autenticados (admin)
CREATE POLICY "select_autenticado" ON mensajes_contacto
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política de actualización (marcar como leído) solo autenticados
CREATE POLICY "update_autenticado" ON mensajes_contacto
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Política de eliminación solo autenticados
CREATE POLICY "delete_autenticado" ON mensajes_contacto
  FOR DELETE USING (auth.role() = 'authenticated');
