-- Dodanie kolumn związanych z dostępem do tabeli applications
-- Plik: migrations/003_applications_columns.sql

-- Dodanie kolumn do śledzenia statusu dostępu
ALTER TABLE applications ADD COLUMN IF NOT EXISTS access_provided BOOLEAN DEFAULT FALSE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS access_provided_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS access_confirmed BOOLEAN DEFAULT NULL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS access_confirmed_at TIMESTAMP WITH TIME ZONE;

-- Indeks na kolumnach do filtrowania
CREATE INDEX IF NOT EXISTS idx_applications_access_status ON applications(access_provided, access_confirmed);