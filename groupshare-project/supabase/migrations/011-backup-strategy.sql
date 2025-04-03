-- Strategia kopii zapasowych i odtwarzania dla GroupShare

-- 1. Tabela przechowująca informacje o wykonanych kopiach zapasowych
CREATE TABLE backup_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental', 'schema_only')),
    backup_path TEXT NOT NULL,
    backup_size_mb FLOAT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
    error_message TEXT,
    initiated_by TEXT
);

-- 2. Funkcja do rejestrowania backupu
CREATE OR REPLACE FUNCTION register_backup(
    p_backup_type TEXT,
    p_backup_path TEXT,
    p_initiated_by TEXT DEFAULT current_user
) RETURNS UUID AS $$
DECLARE
    backup_id UUID;
BEGIN
    INSERT INTO backup_history (
        backup_type,
        backup_path,
        started_at,
        status,
        initiated_by
    ) VALUES (
        p_backup_type,
        p_backup_path,
        CURRENT_TIMESTAMP,
        'in_progress',
        p_initiated_by
    ) RETURNING id INTO backup_id;
    
    RETURN backup_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Funkcja do aktualizacji statusu backupu
CREATE OR REPLACE FUNCTION update_backup_status(
    p_backup_id UUID,
    p_status TEXT,
    p_backup_size_mb FLOAT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE backup_history
    SET
        status = p_status,
        completed_at = CASE WHEN p_status IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE NULL END,
        backup_size_mb = p_backup_size_mb,
        error_message = p_error_message
    WHERE id = p_backup_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Funkcja do utworzenia tabeli przechowującej logi archiwalne
CREATE TABLE archive_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    changed_by TEXT
);

-- 5. Funkcja do archiwizacji starych danych
CREATE OR REPLACE FUNCTION archive_old_records() RETURNS VOID AS $$
DECLARE
    retention_period INTERVAL := '2 years';
    cutoff_date TIMESTAMP WITH TIME ZONE := CURRENT_TIMESTAMP - retention_period;
BEGIN
    -- Archiwizacja starych transakcji
    INSERT INTO archive_logs (table_name, record_id, operation, old_data, changed_at, changed_by)
    SELECT 
        'transactions',
        id,
        'DELETE',
        row_to_json(transactions),
        CURRENT_TIMESTAMP,
        current_user
    FROM 
        transactions
    WHERE 
        completed_at < cutoff_date
        AND status IN ('completed', 'refunded', 'failed');
    
    -- Usunięcie starych transakcji (po archiwizacji)
    DELETE FROM transactions
    WHERE 
        completed_at < cutoff_date
        AND status IN ('completed', 'refunded', 'failed');
    
    -- Archiwizacja starych logów bezpieczeństwa
    INSERT INTO archive_logs (table_name, record_id, operation, old_data, changed_at, changed_by)
    SELECT 
        'security_logs',
        id,
        'DELETE',
        row_to_json(security_logs),
        CURRENT_TIMESTAMP,
        current_user
    FROM 
        security_logs
    WHERE 
        created_at < cutoff_date;
    
    -- Usunięcie starych logów bezpieczeństwa (po archiwizacji)
    DELETE FROM security_logs
    WHERE 
        created_at < cutoff_date;
END;
$$ LANGUAGE plpgsql;

-- 6. Przykładowe skrypty backupu (dla dokumentacji)
COMMENT ON FUNCTION register_backup(TEXT, TEXT, TEXT) IS $DOC$
-- Przykładowy skrypt backupu (do uruchomienia przez cron)
-- #!/bin/bash
-- 
-- BACKUP_DIR="/path/to/backups"
-- DATE=$(date +%Y-%m-%d_%H-%M-%S)
-- BACKUP_PATH="${BACKUP_DIR}/full_backup_${DATE}.sql"
-- 
-- # Wykonaj backup
-- pg_dump -Fc -Z9 -f "${BACKUP_PATH}" groupshare_db
-- 
-- # Zarejestruj backup w systemie
-- psql -d groupshare_db -c "SELECT register_backup('full', '${BACKUP_PATH}', 'system_cron');"
-- 
-- # Sprawdź status
-- if [ $? -eq 0 ]; then
--   BACKUP_SIZE=$(du -m "${BACKUP_PATH}" | cut -f1)
--   BACKUP_ID=$(psql -t -d groupshare_db -c "SELECT id FROM backup_history WHERE backup_path = '${BACKUP_PATH}' ORDER BY started_at DESC LIMIT 1;")
--   psql -d groupshare_db -c "SELECT update_backup_status('${BACKUP_ID}', 'completed', ${BACKUP_SIZE});"
-- else
--   BACKUP_ID=$(psql -t -d groupshare_db -c "SELECT id FROM backup_history WHERE backup_path = '${BACKUP_PATH}' ORDER BY started_at DESC LIMIT 1;")
--   psql -d groupshare_db -c "SELECT update_backup_status('${BACKUP_ID}', 'failed', NULL, 'Backup command failed');"
-- fi
$DOC$;

-- 7. Przykładowy skrypt odtwarzania (dla dokumentacji)
COMMENT ON FUNCTION update_backup_status(UUID, TEXT, FLOAT, TEXT) IS $DOC$
-- Przykładowy skrypt odtwarzania (uruchamiany ręcznie)
-- #!/bin/bash
-- 
-- BACKUP_PATH="$1"
-- 
-- if [ ! -f "${BACKUP_PATH}" ]; then
--   echo "Backup file not found: ${BACKUP_PATH}"
--   exit 1
-- fi
-- 
-- # Utwórz kopię zapasową przed odtwarzaniem
-- pg_dump -Fc -Z9 -f "pre_restore_backup_$(date +%Y-%m-%d_%H-%M-%S).sql" groupshare_db
-- 
-- # Wykonaj odtwarzanie
-- pg_restore -c -d groupshare_db "${BACKUP_PATH}"
-- 
-- # Sprawdź czy odtwarzanie się powiodło
-- if [ $? -eq 0 ]; then
--   echo "Restore completed successfully"
-- else
--   echo "Restore failed"
--   exit 1
-- fi
$DOC$;