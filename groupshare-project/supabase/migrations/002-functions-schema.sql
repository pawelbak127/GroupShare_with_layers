-- Functions for GroupShare
-- This script creates utility functions for the application

-- Create a function to get the current authenticated user ID
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM user_profiles WHERE external_auth_id = auth.uid()::text);
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a user is a member of a group
CREATE OR REPLACE FUNCTION is_group_member(group_id UUID, user_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  IF group_id IS NULL OR user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = $1 AND user_id = $2 AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a user is a group admin
CREATE OR REPLACE FUNCTION is_group_admin(group_id UUID, user_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  IF group_id IS NULL OR user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = $1 AND user_id = $2 AND role = 'admin' AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a user is a group owner
CREATE OR REPLACE FUNCTION is_group_owner(group_id UUID, user_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  IF group_id IS NULL OR user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM groups 
    WHERE id = $1 AND owner_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate a secure token
CREATE OR REPLACE FUNCTION generate_secure_token() RETURNS TEXT AS $$
DECLARE
  token TEXT;
BEGIN
  token := encode(gen_random_bytes(32), 'hex');
  RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to calculate ratings for a user
CREATE OR REPLACE FUNCTION calculate_user_ratings(user_id UUID) RETURNS VOID AS $$
DECLARE
  avg_rating FLOAT;
  rating_count INTEGER;
BEGIN
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be NULL';
  END IF;

  SELECT 
    AVG((access_quality + communication + reliability) / 3.0),
    COUNT(*)
  INTO
    avg_rating,
    rating_count
  FROM ratings
  WHERE rated_id = user_id;
  
  UPDATE user_profiles
  SET 
    rating_avg = COALESCE(avg_rating, 0),
    rating_count = COALESCE(rating_count, 0)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- IMPORTANT: Drop existing transaction functions first to avoid parameter conflicts
DROP FUNCTION IF EXISTS create_transaction(UUID, UUID, UUID, UUID, FLOAT, FLOAT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS complete_transaction(UUID, TEXT);

-- Create a function to create a transaction
CREATE OR REPLACE FUNCTION create_transaction(
    p_buyer_id UUID,
    p_seller_id UUID,
    p_group_sub_id UUID,
    p_purchase_record_id UUID,
    p_amount FLOAT,
    p_platform_fee_percent FLOAT,
    p_payment_method TEXT,
    p_payment_provider TEXT,
    p_payment_id TEXT
) RETURNS UUID AS $$
DECLARE
    transaction_id UUID;
    platform_fee FLOAT;
    seller_amount FLOAT;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_buyer_id IS NULL OR p_seller_id IS NULL OR p_group_sub_id IS NULL OR p_purchase_record_id IS NULL THEN
        RAISE EXCEPTION 'Required IDs cannot be NULL';
    END IF;
    
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than zero';
    END IF;
    
    IF p_platform_fee_percent < 0 OR p_platform_fee_percent > 1 THEN
        RAISE EXCEPTION 'Platform fee percentage must be between 0 and 1';
    END IF;
    
    -- Rozpoczęcie transakcji
    BEGIN
        -- Sprawdzenie czy rekord zakupu istnieje
        IF NOT EXISTS (SELECT 1 FROM purchase_records WHERE id = p_purchase_record_id) THEN
            RAISE EXCEPTION 'Purchase record does not exist';
        END IF;
        
        -- Obliczenie opłat
        platform_fee := p_amount * p_platform_fee_percent;
        seller_amount := p_amount - platform_fee;
        
        -- Utworzenie transakcji
        INSERT INTO transactions (
            buyer_id,
            seller_id,
            group_sub_id,
            purchase_record_id,
            amount,
            platform_fee,
            seller_amount,
            payment_method,
            payment_provider,
            payment_id,
            status
        ) VALUES (
            p_buyer_id,
            p_seller_id,
            p_group_sub_id,
            p_purchase_record_id,
            p_amount,
            platform_fee,
            seller_amount,
            p_payment_method,
            p_payment_provider,
            p_payment_id,
            'pending'
        ) RETURNING id INTO transaction_id;
        
        RETURN transaction_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Logowanie błędu
            PERFORM log_security_event(
                p_buyer_id,
                'transaction_creation',
                'purchase_record',
                p_purchase_record_id::TEXT,
                'error',
                NULL,
                NULL,
                jsonb_build_object('error', SQLERRM)
            );
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to complete a transaction
CREATE OR REPLACE FUNCTION complete_transaction(
    p_transaction_id UUID,
    p_status TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_purchase_record_id UUID;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_transaction_id IS NULL THEN
        RAISE EXCEPTION 'Transaction ID cannot be NULL';
    END IF;
    
    IF p_status IS NULL OR p_status NOT IN ('completed', 'failed', 'refunded') THEN
        RAISE EXCEPTION 'Invalid status. Must be one of: completed, failed, refunded';
    END IF;
    
    -- Rozpoczęcie transakcji
    BEGIN
        -- Get purchase record ID
        SELECT purchase_record_id INTO v_purchase_record_id
        FROM transactions
        WHERE id = p_transaction_id;
        
        IF v_purchase_record_id IS NULL THEN
            RAISE EXCEPTION 'Transaction not found or purchase record reference is missing';
        END IF;
        
        -- Update transaction
        UPDATE transactions
        SET 
            status = p_status,
            completed_at = CASE WHEN p_status = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_transaction_id;
        
        -- If completed, update purchase record
        IF p_status = 'completed' THEN
            UPDATE purchase_records
            SET 
                status = 'completed',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_purchase_record_id;
        ELSIF p_status = 'failed' THEN
            UPDATE purchase_records
            SET 
                status = 'failed',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_purchase_record_id;
        ELSIF p_status = 'refunded' THEN
            UPDATE purchase_records
            SET 
                status = 'refunded',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_purchase_record_id;
        END IF;
        
        RETURN TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            -- Logowanie błędu
            PERFORM log_security_event(
                NULL, -- Nie znamy user_id w tym kontekście
                'transaction_completion',
                'transaction',
                p_transaction_id::TEXT,
                'error',
                NULL,
                NULL,
                jsonb_build_object('error', SQLERRM)
            );
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if slots are available in a group subscription
CREATE OR REPLACE FUNCTION check_slots_available(
    p_group_sub_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    available_slots INTEGER;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_group_sub_id IS NULL THEN
        RAISE EXCEPTION 'Group subscription ID cannot be NULL';
    END IF;
    
    -- Pobranie liczby dostępnych slotów z blokadą wiersza
    SELECT slots_available INTO available_slots
    FROM group_subs
    WHERE id = p_group_sub_id
    FOR SHARE; -- Używamy FOR SHARE, aby inne transakcje mogły czytać, ale nie aktualizować
    
    IF available_slots IS NULL THEN
        RAISE EXCEPTION 'Group subscription not found';
    END IF;
    
    RETURN available_slots > 0;
EXCEPTION
    WHEN OTHERS THEN
        -- Logowanie błędu
        PERFORM log_security_event(
            NULL,
            'check_slots_available',
            'group_sub',
            p_group_sub_id::TEXT,
            'error',
            NULL,
            NULL,
            jsonb_build_object('error', SQLERRM)
        );
        RETURN FALSE; -- Bezpieczny fallback
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to update available slots when a purchase is completed
CREATE OR REPLACE FUNCTION update_group_sub_slots() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
        -- Zmniejszenie dostępnych slotów z blokadą wiersza
        UPDATE group_subs
        SET 
            slots_available = slots_available - 1,
            status = CASE 
                WHEN slots_available - 1 <= 0 THEN 'full'
                ELSE status
            END
        WHERE id = NEW.group_sub_id
        FOR UPDATE; -- Dodanie FOR UPDATE zapewnia wyłączną blokadę wiersza
        
        -- Dodatkowe sprawdzenie, czy nie przekroczono limitu slotów
        IF (SELECT slots_available FROM group_subs WHERE id = NEW.group_sub_id) < 0 THEN
            RAISE EXCEPTION 'No available slots left in this subscription';
        END IF;
    ELSIF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
        -- Zwiększenie dostępnych slotów jeśli zakup jest anulowany/zwrócony
        UPDATE group_subs
        SET 
            slots_available = slots_available + 1,
            status = CASE 
                WHEN status = 'full' AND slots_available + 1 > 0 THEN 'active'
                ELSE status
            END
        WHERE id = NEW.group_sub_id
        FOR UPDATE;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Logowanie błędu
        PERFORM log_security_event(
            NULL,
            'update_group_sub_slots',
            'purchase_record',
            NEW.id::TEXT,
            'error',
            NULL,
            NULL,
            jsonb_build_object('error', SQLERRM)
        );
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update available slots
CREATE TRIGGER update_slots_on_purchase_status_change
AFTER UPDATE OF status ON purchase_records
FOR EACH ROW
EXECUTE FUNCTION update_group_sub_slots();

-- Create a function to check if a user can access a subscription
CREATE OR REPLACE FUNCTION can_access_subscription(
    p_user_id UUID,
    p_group_sub_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Sprawdzenie parametrów wejściowych
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be NULL';
    END IF;
    
    IF p_group_sub_id IS NULL THEN
        RAISE EXCEPTION 'Group subscription ID cannot be NULL';
    END IF;
    
    -- Sprawdzenie czy użytkownik ma dostęp do subskrypcji
    RETURN EXISTS (
        SELECT 1 
        FROM purchase_records 
        WHERE user_id = p_user_id 
        AND group_sub_id = p_group_sub_id 
        AND status = 'completed'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Logowanie błędu
        PERFORM log_security_event(
            p_user_id,
            'subscription_access_check',
            'group_sub',
            p_group_sub_id::TEXT,
            'error',
            NULL,
            NULL,
            jsonb_build_object('error', SQLERRM)
        );
        RETURN FALSE; -- Bezpieczny fallback
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_user_id UUID,
    p_action_type TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT,
    p_status TEXT,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_action_type IS NULL OR p_resource_type IS NULL OR p_resource_id IS NULL OR p_status IS NULL THEN
        RAISE EXCEPTION 'Required parameters cannot be NULL';
    END IF;
    
    INSERT INTO security_logs (
        user_id,
        action_type,
        resource_type,
        resource_id,
        status,
        ip_address,
        user_agent,
        details
    ) VALUES (
        p_user_id,
        p_action_type,
        p_resource_type,
        p_resource_id,
        p_status,
        p_ip_address,
        p_user_agent,
        p_details
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
EXCEPTION
    WHEN OTHERS THEN
        -- W przypadku błędu nie logujemy do security_logs, bo to mogłoby prowadzić do rekurencji
        RAISE NOTICE 'Error in log_security_event: %', SQLERRM;
        RETURN NULL; -- Zwracamy NULL zamiast rzucać wyjątek, aby nie przerywać głównej operacji
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to track device fingerprints
CREATE OR REPLACE FUNCTION track_device_fingerprint(
    p_user_id UUID,
    p_fingerprint TEXT
) RETURNS UUID AS $$
DECLARE
    device_id UUID;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_user_id IS NULL OR p_fingerprint IS NULL OR LENGTH(p_fingerprint) = 0 THEN
        RAISE EXCEPTION 'User ID and fingerprint are required and cannot be empty';
    END IF;
    
    -- Rozpoczęcie transakcji
    BEGIN
        -- Check if fingerprint already exists for this user
        SELECT id INTO device_id
        FROM device_fingerprints
        WHERE user_id = p_user_id AND fingerprint = p_fingerprint
        FOR UPDATE; -- Blokowanie wiersza w przypadku równoległego dostępu
        
        IF device_id IS NULL THEN
            -- Insert new fingerprint
            INSERT INTO device_fingerprints (
                user_id,
                fingerprint,
                first_seen_at,
                last_seen_at
            ) VALUES (
                p_user_id,
                p_fingerprint,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            ) RETURNING id INTO device_id;
        ELSE
            -- Update existing fingerprint
            UPDATE device_fingerprints
            SET 
                last_seen_at = CURRENT_TIMESTAMP,
                counter = counter + 1
            WHERE id = device_id;
        END IF;
        
        RETURN device_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Logowanie błędu
            PERFORM log_security_event(
                p_user_id,
                'device_fingerprint_tracking',
                'device',
                p_fingerprint,
                'error',
                NULL,
                NULL,
                jsonb_build_object('error', SQLERRM)
            );
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create additional function to reserve subscription slot with proper transaction handling
CREATE OR REPLACE FUNCTION reserve_subscription_slot(
    p_group_sub_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    slots_available INTEGER;
    purchase_record_id UUID;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_group_sub_id IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION 'Group subscription ID and user ID cannot be NULL';
    END IF;
    
    -- Rozpoczęcie transakcji
    BEGIN
        -- Blokowanie wiersza subskrypcji podczas całej operacji
        SELECT slots_available INTO slots_available
        FROM group_subs
        WHERE id = p_group_sub_id
        FOR UPDATE;
        
        IF slots_available IS NULL THEN
            RAISE EXCEPTION 'Group subscription not found';
        END IF;
        
        IF slots_available <= 0 THEN
            RETURN FALSE;
        END IF;
        
        -- Sprawdzenie czy użytkownik już ma aktywną subskrypcję
        IF EXISTS (
            SELECT 1 
            FROM purchase_records 
            WHERE user_id = p_user_id 
            AND group_sub_id = p_group_sub_id 
            AND status IN ('pending_payment', 'payment_processing', 'completed')
        ) THEN
            RAISE EXCEPTION 'User already has an active or pending subscription';
        END IF;
        
        -- Utworzenie rekordu zakupu
        INSERT INTO purchase_records (
            user_id,
            group_sub_id,
            status
        ) VALUES (
            p_user_id,
            p_group_sub_id,
            'pending_payment'
        ) RETURNING id INTO purchase_record_id;
        
        -- Tymczasowe zmniejszenie dostępnych slotów
        UPDATE group_subs
        SET 
            slots_available = slots_available - 1,
            status = CASE 
                WHEN slots_available - 1 <= 0 THEN 'full'
                ELSE status
            END
        WHERE id = p_group_sub_id;
        
        -- Dodanie wpisu w logu bezpieczeństwa
        PERFORM log_security_event(
            p_user_id,
            'slot_reservation',
            'group_sub',
            p_group_sub_id::TEXT,
            'success',
            NULL,
            NULL,
            jsonb_build_object('purchase_record_id', purchase_record_id)
        );
        
        RETURN TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            -- Logowanie błędu
            PERFORM log_security_event(
                p_user_id,
                'slot_reservation',
                'group_sub',
                p_group_sub_id::TEXT,
                'error',
                NULL,
                NULL,
                jsonb_build_object('error', SQLERRM)
            );
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;