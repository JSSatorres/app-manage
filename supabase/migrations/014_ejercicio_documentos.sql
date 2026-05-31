CREATE TABLE ejercicio_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ejercicio_id UUID NOT NULL REFERENCES ejercicios(id) ON DELETE CASCADE,
    documento_id UUID NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(ejercicio_id, documento_id)
);

CREATE INDEX idx_ejercicio_documentos_ejercicio ON ejercicio_documentos(ejercicio_id);
CREATE INDEX idx_ejercicio_documentos_documento ON ejercicio_documentos(documento_id);

ALTER TABLE ejercicio_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_ejercicio_documentos" ON ejercicio_documentos FOR ALL USING (true) WITH CHECK (true);
