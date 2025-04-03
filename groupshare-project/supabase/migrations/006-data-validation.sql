-- Dodatkowe walidacje danych dla zwiększenia integralności

-- Ograniczenia na adres email
ALTER TABLE user_profiles ADD CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$');

-- Ograniczenia na numery telefonów
ALTER TABLE user_profiles ADD CONSTRAINT valid_phone CHECK (phone_number IS NULL OR phone_number ~* '^\+[0-9]{1,3}[0-9]{6,14}$');

-- Ograniczenia na ceny - minimalną i maksymalną
ALTER TABLE group_subs ADD CONSTRAINT valid_price CHECK (price_per_slot > 0 AND price_per_slot < 10000);

-- Ograniczenia na dostępne sloty
ALTER TABLE group_subs ADD CONSTRAINT valid_slots CHECK (slots_available >= 0 AND slots_available <= slots_total);

-- Ograniczenia na okres wygaśnięcia tokenów
ALTER TABLE access_tokens ADD CONSTRAINT valid_expiry CHECK (expires_at > created_at);

-- Wyzwalacz do sprawdzania spójności danych użytkownika przy aktualizacji
CREATE OR REPLACE FUNCTION validate_user_update() RETURNS TRIGGER AS $$
BEGIN
    -- Sprawdzenie, czy profile_type i verification_level są zgodne
    IF NEW.profile_type = 'seller' AND NEW.verification_level = 'basic' THEN
        RAISE WARNING 'Zalecane jest wyższe verification_level dla sprzedawców';
    END IF;
    
    -- Walidacja długości bio
    IF length(NEW.bio) > 500 THEN
        NEW.bio := substring(NEW.bio from 1 for 500);
        RAISE NOTICE 'Bio zostało przycięte do 500 znaków';
    END IF;
    
    -- Sprawdzenie, czy avatar_url jest poprawnym URL
    IF NEW.avatar_url IS NOT NULL AND NEW.avatar_url !~* '^https?://[^\s/$.?#].[^\s]*$' THEN
        RAISE WARNING 'avatar_url powinien być poprawnym URL';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_validation
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE PROCEDURE validate_user_update();

-- Walidacja okresu rozwiązania sporu
ALTER TABLE disputes ADD CONSTRAINT valid_resolution_deadline 
  CHECK (resolution_deadline IS NULL OR resolution_deadline > created_at);

-- Walidacja kwoty zwrotu
ALTER TABLE disputes ADD CONSTRAINT valid_refund_amount 
  CHECK (refund_amount IS NULL OR refund_amount >= 0);