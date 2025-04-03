-- Narzędzia do monitorowania wydajności bazy danych

-- 1. Tabela do przechowywania statystyk zapytań
CREATE TABLE query_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_text TEXT NOT NULL,
    query_hash TEXT NOT NULL,
    execution_time_ms FLOAT NOT NULL,
    rows_returned INTEGER,
    cpu_usage FLOAT,
    memory_usage FLOAT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT,
    client_info TEXT
);

-- 2. Indeksy dla tabeli statystyk
CREATE INDEX idx_query_stats_hash ON query_stats(query_hash);
CREATE INDEX idx_query_stats_time ON query_stats(executed_at);
CREATE INDEX idx_query_stats_performance ON query_stats(execution_time_ms DESC);

-- 3. Funkcja do rejestrowania statystyk zapytania
CREATE OR REPLACE FUNCTION log_query_stats(
    p_query_text TEXT,
    p_execution_time_ms FLOAT,
    p_rows_returned INTEGER,
    p_cpu_usage FLOAT DEFAULT NULL,
    p_memory_usage FLOAT DEFAULT NULL,
    p_user_id TEXT DEFAULT current_user,
    p_client_info TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    query_id UUID;
    query_hash TEXT;
BEGIN
    -- Generowanie prostego hasha zapytania (w produkcji użyj lepszej funkcji haszującej)
    query_hash := md5(regexp_replace(p_query_text, '\s+', ' ', 'g'));
    
    -- Rejestrowanie statystyki
    INSERT INTO query_stats (
        query_text,
        query_hash,
        execution_time_ms,
        rows_returned,
        cpu_usage,
        memory_usage,
        user_id,
        client_info
    ) VALUES (
        p_query_text,
        query_hash,
        p_execution_time_ms,
        p_rows_returned,
        p_cpu_usage,
        p_memory_usage,
        p_user_id,
        p_client_info
    ) RETURNING id INTO query_id;
    
    RETURN query_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Widok do analizy wolnych zapytań
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query_hash,
    substring(query_text for 100) as query_preview,
    count(*) as execution_count,
    avg(execution_time_ms) as avg_time_ms,
    max(execution_time_ms) as max_time_ms,
    sum(execution_time_ms) as total_time_ms,
    avg(rows_returned) as avg_rows,
    max(memory_usage) as max_memory_usage
FROM 
    query_stats
WHERE 
    executed_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY 
    query_hash, query_preview
ORDER BY 
    avg_time_ms DESC
LIMIT 20;

-- 5. Funkcja do znajdowania najczęstszych wzorców zapytań
CREATE OR REPLACE FUNCTION analyze_query_patterns(
    p_days INTEGER DEFAULT 7
) RETURNS TABLE (
    pattern TEXT,
    count BIGINT,
    avg_time FLOAT,
    total_time FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH query_patterns AS (
        SELECT 
            regexp_replace(
                regexp_replace(
                    query_text, 
                    E'\'[^\']*\'', 
                    '''?''', 
                    'g'
                ),
                E'\\d+',
                '?',
                'g'
            ) AS pattern,
            execution_time_ms
        FROM 
            query_stats
        WHERE 
            executed_at > CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL
    )
    SELECT 
        pattern,
        count(*),
        avg(execution_time_ms),
        sum(execution_time_ms)
    FROM 
        query_patterns
    GROUP BY 
        pattern
    ORDER BY 
        count(*) DESC, 
        sum(execution_time_ms) DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- 6. Funkcja do analizy obciążenia tabel
CREATE OR REPLACE FUNCTION analyze_table_usage() 
RETURNS TABLE (
    table_name TEXT,
    estimated_row_count BIGINT,
    last_vacuum TIMESTAMP WITH TIME ZONE,
    last_analyze TIMESTAMP WITH TIME ZONE,
    sequential_scans BIGINT,
    index_scans BIGINT,
    tuples_inserted BIGINT,
    tuples_updated BIGINT,
    tuples_deleted BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        relname::TEXT as table_name,
        reltuples::BIGINT as estimated_row_count,
        last_vacuum,
        last_analyze,
        seq_scan as sequential_scans,
        idx_scan as index_scans,
        n_tup_ins as tuples_inserted,
        n_tup_upd as tuples_updated,
        n_tup_del as tuples_deleted
    FROM
        pg_stat_user_tables
    ORDER BY
        seq_scan + idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. Przykład wyzwalacza do rejestrowania długich zapytań
-- Uwaga: Używanie tego w produkcji może mieć wpływ na wydajność
CREATE OR REPLACE FUNCTION track_long_running_queries() RETURNS TRIGGER AS $$
BEGIN
    -- Rejestruj tylko długie zapytania (ponad 500ms)
    IF TG_ARGV[0]::FLOAT < NEW.execution_time_ms THEN
        -- Optymalizacja: przechowujemy tylko pierwsze 2000 znaków zapytania
        INSERT INTO long_running_queries
        SELECT 
            NEW.id, 
            substring(NEW.query_text for 2000),
            NEW.execution_time_ms,
            NEW.executed_at,
            NEW.user_id;
            
        -- Możesz dodać powiadomienie dla administratorów o ekstremalnie długich zapytaniach
        IF NEW.execution_time_ms > 5000 THEN -- 5 sekund
            PERFORM log_security_event(
                NULL,
                'performance_alert',
                'database',
                'query',
                'warning',
                NULL,
                NULL,
                jsonb_build_object(
                    'query_id', NEW.id,
                    'execution_time_ms', NEW.execution_time_ms,
                    'user_id', NEW.user_id
                )
            );
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. Funkcja do czyszczenia starych statystyk
CREATE OR REPLACE FUNCTION cleanup_query_stats(
    p_retention_days INTEGER DEFAULT 30
) RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM query_stats
    WHERE executed_at < CURRENT_TIMESTAMP - (p_retention_days || ' days')::INTERVAL
    RETURNING COUNT(*) INTO deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;