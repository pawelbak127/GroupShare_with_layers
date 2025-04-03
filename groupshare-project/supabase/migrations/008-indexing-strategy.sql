-- Zoptymalizowane indeksowanie dla najczęściej używanych zapytań

-- Indeksy częściowe dla statusów
CREATE INDEX idx_purchase_records_completed ON purchase_records(user_id) 
WHERE status = 'completed';

CREATE INDEX idx_transactions_pending ON transactions(buyer_id, created_at) 
WHERE status = 'pending';

-- Indeksowanie z uwzględnieniem kolejności kolumn dla najczęstszych wzorców dostępu
-- Najpierw kolumny używane w klauzuli WHERE, potem w ORDER BY
CREATE INDEX idx_notifications_user_read_date ON notifications(user_id, is_read, created_at DESC);

-- Indeks dla funkcji tekstowej
CREATE INDEX idx_user_profiles_display_name_lower ON user_profiles(LOWER(display_name));

-- Indeks dla zapytań zakresowych dla dat
CREATE INDEX idx_transactions_date_range ON transactions(created_at);

-- Dodanie INCLUDE dla unikania operacji lookup
CREATE INDEX idx_group_subs_lookup ON group_subs(id) INCLUDE (group_id, slots_available, status);

-- Usunięcie rzadko używanych indeksów
-- DROP INDEX idx_encryption_keys_related_id;
-- DROP INDEX idx_ratings_transaction_id;