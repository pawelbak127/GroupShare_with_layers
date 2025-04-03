-- Widoki zmaterializowane dla często używanych skomplikowanych zapytań

-- Widok statystyk użytkowników
CREATE MATERIALIZED VIEW user_stats AS
SELECT 
    up.id,
    up.display_name,
    up.profile_type,
    up.verification_level,
    up.rating_avg,
    up.rating_count,
    count(distinct gs.id) as subscriptions_offered,
    sum(case when gs.status = 'active' then gs.slots_available else 0 end) as slots_available,
    count(distinct pr.id) as purchases_made,
    count(distinct case when pr.status = 'completed' then pr.id else null end) as active_subscriptions
FROM 
    user_profiles up
LEFT JOIN 
    groups g ON up.id = g.owner_id
LEFT JOIN 
    group_subs gs ON g.id = gs.group_id
LEFT JOIN 
    purchase_records pr ON up.id = pr.user_id
GROUP BY 
    up.id, up.display_name, up.profile_type, up.verification_level, up.rating_avg, up.rating_count;

-- Indeks na widoku zmaterializowanym
CREATE UNIQUE INDEX idx_user_stats_id ON user_stats(id);

-- Widok popularnych platform subskrypcyjnych
CREATE MATERIALIZED VIEW platform_stats AS
SELECT 
    sp.id,
    sp.name,
    sp.max_members,
    count(distinct gs.id) as active_groups,
    sum(gs.slots_total) as total_slots,
    sum(gs.slots_total - gs.slots_available) as used_slots,
    avg(gs.price_per_slot) as avg_price_per_slot
FROM 
    subscription_platforms sp
LEFT JOIN 
    group_subs gs ON sp.id = gs.platform_id AND gs.status IN ('active', 'full')
GROUP BY 
    sp.id, sp.name, sp.max_members;

-- Indeks na widoku zmaterializowanym
CREATE UNIQUE INDEX idx_platform_stats_id ON platform_stats(id);

-- Funkcja do okresowego odświeżania widoków
CREATE OR REPLACE FUNCTION refresh_materialized_stats() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY platform_stats;
END;
$$ LANGUAGE plpgsql;

-- Utworzenie wyzwalacza do automatycznego odświeżania (w produkcji lepiej używać cron)
-- CREATE OR REPLACE FUNCTION trigger_refresh_stats() RETURNS TRIGGER AS $$
-- BEGIN
--     PERFORM refresh_materialized_stats();
--     RETURN NULL;
-- END;
-- $$ LANGUAGE plpgsql;
-- 
-- CREATE TRIGGER refresh_stats_after_changes
-- AFTER INSERT OR UPDATE OR DELETE ON purchase_records
-- FOR EACH STATEMENT EXECUTE PROCEDURE trigger_refresh_stats();