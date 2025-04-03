-- Rozszerzone funkcje bezpieczeństwa

-- Funkcja sprawdzająca uprawnienia dla ogólnych operacji
CREATE OR REPLACE FUNCTION can_perform_action(
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    is_permitted BOOLEAN := FALSE;
BEGIN
    -- Walidacja danych wejściowych
    IF p_user_id IS NULL OR p_action IS NULL OR p_resource_type IS NULL OR p_resource_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Sprawdzanie uprawnień na podstawie zasobu i akcji
    IF p_resource_type = 'group' THEN
        IF p_action = 'view' THEN
            is_permitted := TRUE; -- Publiczne grupy
        ELSIF p_action IN ('update', 'delete') THEN
            is_permitted := is_group_owner(p_resource_id, p_user_id);
        ELSIF p_action = 'manage_members' THEN
            is_permitted := is_group_admin(p_resource_id, p_user_id) OR is_group_owner(p_resource_id, p_user_id);
        END IF;
    ELSIF p_resource_type = 'group_sub' THEN
        IF p_action = 'view' THEN
            is_permitted := TRUE; -- Publiczne oferty
        ELSIF p_action IN ('create', 'update', 'delete') THEN
            is_permitted := is_group_admin(
                (SELECT group_id FROM group_subs WHERE id = p_resource_id), 
                p_user_id
            ) OR is_group_owner(
                (SELECT group_id FROM group_subs WHERE id = p_resource_id), 
                p_user_id
            );
        END IF;
    ELSIF p_resource_type = 'user_profile' THEN
        IF p_action = 'view' THEN
            is_permitted := TRUE; -- Podstawowe dane profilowe są publiczne
        ELSIF p_action IN ('update', 'delete') THEN
            is_permitted := (p_resource_id = p_user_id);
        END IF;
    ELSIF p_resource_type = 'purchase_record' THEN
        IF p_action = 'view' THEN
            is_permitted := (
                (SELECT user_id FROM purchase_records WHERE id = p_resource_id) = p_user_id OR
                is_group_admin(
                  (SELECT group_id FROM group_subs WHERE id = (SELECT group_sub_id FROM purchase_records WHERE id = p_resource_id)), 
                  p_user_id
                ) OR
                is_group_owner(
                  (SELECT group_id FROM group_subs WHERE id = (SELECT group_sub_id FROM purchase_records WHERE id = p_resource_id)), 
                  p_user_id
                )
            );
        ELSIF p_action = 'create' THEN
            is_permitted := TRUE; -- Uwierzytelnieni użytkownicy mogą tworzyć
        ELSIF p_action = 'update' THEN
            is_permitted := (
                (SELECT user_id FROM purchase_records WHERE id = p_resource_id) = p_user_id OR
                is_group_admin(
                  (SELECT group_id FROM group_subs WHERE id = (SELECT group_sub_id FROM purchase_records WHERE id = p_resource_id)), 
                  p_user_id
                ) OR
                is_group_owner(
                  (SELECT group_id FROM group_subs WHERE id = (SELECT group_sub_id FROM purchase_records WHERE id = p_resource_id)), 
                  p_user_id
                )
            );
        END IF;
    END IF;
    
    -- Logowanie próby dostępu
    PERFORM log_security_event(
        p_user_id,
        'permission_check',
        p_resource_type,
        p_resource_id::text,
        CASE WHEN is_permitted THEN 'allowed' ELSE 'denied' END,
        NULL,
        NULL,
        jsonb_build_object('action', p_action)
    );
    
    RETURN is_permitted;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in can_perform_action: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja sprawdzania dziwnych wzorców zachowań
CREATE OR REPLACE FUNCTION check_suspicious_activity(
    p_user_id UUID,
    p_action TEXT,
    p_ip_address TEXT,
    p_user_agent TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    suspicious BOOLEAN := FALSE;
    recent_activities INTEGER;
    different_ips INTEGER;
    usual_ip TEXT;
BEGIN
    -- Walidacja danych wejściowych
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Sprawdzenie liczby aktywności w ostatniej godzinie
    SELECT COUNT(*) INTO recent_activities
    FROM security_logs
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '1 hour';
      
    IF recent_activities > 100 THEN -- Próg do dostosowania
        suspicious := TRUE;
    END IF;
    
    -- Sprawdzenie różnych adresów IP w krótkim czasie
    SELECT COUNT(DISTINCT ip_address) INTO different_ips
    FROM security_logs
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '24 hours';
      
    -- Pobranie najczęściej używanego IP
    SELECT ip_address INTO usual_ip
    FROM security_logs
    WHERE user_id = p_user_id
      AND ip_address IS NOT NULL
    GROUP BY ip_address
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    -- Jeśli jest wiele różnych IP i obecne IP nie jest zwykle używanym
    IF different_ips > 5 AND p_ip_address <> usual_ip THEN
        suspicious := TRUE;
    END IF;
    
    -- Jeśli aktywność jest podejrzana, zapisz zdarzenie
    IF suspicious THEN
        PERFORM log_security_event(
            p_user_id,
            'suspicious_activity',
            'user',
            p_user_id::text,
            'warning',
            p_ip_address,
            p_user_agent,
            jsonb_build_object(
                'action', p_action,
                'recent_activities', recent_activities,
                'different_ips', different_ips
            )
        );
    END IF;
    
    RETURN suspicious;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in check_suspicious_activity: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;