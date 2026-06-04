-- Ejecutar en Supabase → SQL Editor (una sola vez)
-- Crea los buckets que usa la app para fotos de empleados y platos

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('empleados', 'empleados', true),
  ('platos', 'platos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas (se pueden volver a ejecutar sin error)
DROP POLICY IF EXISTS "Lectura pública empleados" ON storage.objects;
DROP POLICY IF EXISTS "Lectura pública platos" ON storage.objects;
DROP POLICY IF EXISTS "Subida autenticada empleados" ON storage.objects;
DROP POLICY IF EXISTS "Subida autenticada platos" ON storage.objects;
DROP POLICY IF EXISTS "Actualizar autenticada empleados" ON storage.objects;
DROP POLICY IF EXISTS "Actualizar autenticada platos" ON storage.objects;
DROP POLICY IF EXISTS "Borrar autenticada empleados" ON storage.objects;
DROP POLICY IF EXISTS "Borrar autenticada platos" ON storage.objects;

CREATE POLICY "Lectura pública empleados"
ON storage.objects FOR SELECT
USING (bucket_id = 'empleados');

CREATE POLICY "Lectura pública platos"
ON storage.objects FOR SELECT
USING (bucket_id = 'platos');

CREATE POLICY "Subida autenticada empleados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'empleados');

CREATE POLICY "Subida autenticada platos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'platos');

CREATE POLICY "Actualizar autenticada empleados"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'empleados');

CREATE POLICY "Actualizar autenticada platos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'platos');

CREATE POLICY "Borrar autenticada empleados"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'empleados');

CREATE POLICY "Borrar autenticada platos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'platos');
