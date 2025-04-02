-- Functions and Triggers for GroupShare
-- This script creates database functions and triggers

-- Function to calculate average rating for a user
CREATE OR REPLACE FUNCTION calculate_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate average ratings
  UPDATE user_profiles
  SET 
    rating_avg = (
      SELECT 
        ROUND(
          AVG(
            (COALESCE(access_quality, 0) + 
             COALESCE(communication, 0) + 
             COALESCE(reliability, 0)) / 
            (CASE 
              WHEN access_quality IS NOT NULL THEN 1 ELSE 0 END + 
              CASE WHEN communication IS NOT NULL THEN 1 ELSE 0 END + 
              CASE WHEN reliability IS NOT NULL THEN 1 ELSE 0 END)
          )::numeric, 
          1
        )
      FROM ratings
      WHERE rated_id = NEW.rated_id
      AND (access_quality IS NOT NULL OR communication IS NOT NULL OR reliability IS NOT NULL)
    ),
    rating_count = (
      SELECT COUNT(*) 
      FROM ratings 
      WHERE rated_id = NEW.rated_id
    )
  WHERE id = NEW.rated_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_rating
AFTER INSERT OR UPDATE ON ratings
FOR EACH ROW
EXECUTE FUNCTION calculate_user_rating();

-- Function to update slots_available when application status changes
-- Fixed to avoid recursion issues
CREATE OR REPLACE FUNCTION update_slots_available()
RETURNS TRIGGER AS $$
DECLARE
  current_slots INTEGER;
BEGIN
  -- Skip if we're in a recursive call or if status didn't change
  IF TG_LEVEL = 'STATEMENT' OR (OLD.status = NEW.status) THEN
    RETURN NEW;
  END IF;

  -- Get current slots available
  SELECT slots_available INTO current_slots
  FROM group_subs
  WHERE id = NEW.group_sub_id;

  -- If application is accepted, decrease available slots
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status <> 'accepted') THEN
    UPDATE group_subs
    SET 
      slots_available = GREATEST(0, current_slots - 1),
      -- Update status in the same query to avoid triggering again
      status = CASE 
        WHEN GREATEST(0, current_slots - 1) <= 0 THEN 'full'
        ELSE status
      END
    WHERE id = NEW.group_sub_id;
  
  -- If application was accepted and now it's not, increase available slots
  ELSIF OLD.status = 'accepted' AND NEW.status <> 'accepted' THEN
    UPDATE group_subs
    SET 
      slots_available = current_slots + 1,
      -- Update status in the same query
      status = CASE 
        WHEN current_slots <= 0 AND (current_slots + 1) > 0 THEN 'active'
        ELSE status
      END
    WHERE id = NEW.group_sub_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_group_sub_slots
AFTER INSERT OR UPDATE OF status ON applications
FOR EACH ROW
EXECUTE FUNCTION update_slots_available();

-- Function to ensure group owner is always an admin member
CREATE OR REPLACE FUNCTION ensure_owner_is_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if owner is already a member
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = NEW.id AND user_id = NEW.owner_id
  ) THEN
    -- Add owner as an admin member
    INSERT INTO group_members (
      group_id, 
      user_id, 
      role, 
      status, 
      invited_by,
      joined_at
    ) VALUES (
      NEW.id,
      NEW.owner_id,
      'admin',
      'active',
      NEW.owner_id,
      CURRENT_TIMESTAMP
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER add_owner_as_member
AFTER INSERT ON groups
FOR EACH ROW
EXECUTE FUNCTION ensure_owner_is_member();

-- Function to generate secure access token
CREATE OR REPLACE FUNCTION generate_secure_token() 
RETURNS TEXT AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate a secure random token using pgcrypto
  SELECT encode(gen_random_bytes(32), 'base64') INTO token;
  -- Replace characters that might cause URL issues
  token := replace(token, '/', '_');
  token := replace(token, '+', '-');
  token := replace(token, '=', '');
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to hash a token
CREATE OR REPLACE FUNCTION hash_token(token TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(token, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to create access token for an application
CREATE OR REPLACE FUNCTION create_access_token(application_id UUID, expires_in_minutes INTEGER DEFAULT 30)
RETURNS RECORD AS $$
DECLARE
  token_id UUID;
  token_value TEXT;
  token_hash TEXT;
  result RECORD;
BEGIN
  -- Generate token
  token_value := generate_secure_token();
  
  -- Hash token for storage
  token_hash := hash_token(token_value);
  
  -- Insert token hash (not the actual token)
  INSERT INTO access_tokens (
    application_id,
    token_hash,
    expires_at
  ) VALUES (
    application_id,
    token_hash,
    CURRENT_TIMESTAMP + (expires_in_minutes || ' minutes')::INTERVAL
  ) RETURNING id INTO token_id;
  
  -- Update application
  UPDATE applications
  SET 
    access_provided = TRUE,
    access_provided_at = CURRENT_TIMESTAMP
  WHERE id = application_id;
  
  -- Return both the token ID and the actual token (which is never stored)
  SELECT token_id AS id, token_value AS token INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to validate access token
CREATE OR REPLACE FUNCTION validate_access_token(token_value TEXT, ip TEXT, user_agent TEXT)
RETURNS UUID AS $$
DECLARE
  token_record access_tokens%ROWTYPE;
  app_id UUID;
  token_hash TEXT;
BEGIN
  -- Hash the provided token to compare with stored hash
  token_hash := hash_token(token_value);

  -- Get token record
  SELECT * INTO token_record
  FROM access_tokens
  WHERE token_hash = token_hash;
  
  -- Check if token exists
  IF token_record IS NULL THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;
  
  -- Check if token is already used
  IF token_record.used THEN
    RAISE EXCEPTION 'Token already used';
  END IF;
  
  -- Check if token is expired
  IF token_record.expires_at < CURRENT_TIMESTAMP THEN
    RAISE EXCEPTION 'Token expired';
  END IF;
  
  -- Mark token as used
  UPDATE access_tokens
  SET 
    used = TRUE,
    used_at = CURRENT_TIMESTAMP,
    ip_address = ip,
    user_agent = user_agent
  WHERE id = token_record.id;
  
  RETURN token_record.application_id;
END;
$$ LANGUAGE plpgsql;

-- Function to confirm access for an application
CREATE OR REPLACE FUNCTION confirm_application_access(application_id UUID, is_working BOOLEAN DEFAULT TRUE)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update application to confirm access
  UPDATE applications
  SET 
    access_confirmed = TRUE,
    access_confirmed_at = CURRENT_TIMESTAMP,
    status = CASE 
      WHEN is_working THEN 'completed'
      ELSE 'problem'
    END
  WHERE id = application_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to increment or decrement safely
CREATE OR REPLACE FUNCTION increment(val integer, amount integer DEFAULT 1)
RETURNS integer AS $$
BEGIN
  RETURN val + amount;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement(val integer, amount integer DEFAULT 1)
RETURNS integer AS $$
BEGIN
  RETURN GREATEST(0, val - amount);
END;
$$ LANGUAGE plpgsql;

-- Function to record a transaction
CREATE OR REPLACE FUNCTION create_transaction(
  p_buyer_id UUID,
  p_seller_id UUID,
  p_group_sub_id UUID,
  p_application_id UUID,
  p_amount FLOAT,
  p_platform_fee_percentage FLOAT DEFAULT 0.05,
  p_payment_method TEXT DEFAULT NULL,
  p_payment_provider TEXT DEFAULT NULL,
  p_payment_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  transaction_id UUID;
  platform_fee FLOAT;
  seller_amount FLOAT;
BEGIN
  -- Calculate fees
  platform_fee := p_amount * p_platform_fee_percentage;
  seller_amount := p_amount - platform_fee;
  
  -- Insert transaction record
  INSERT INTO transactions (
    buyer_id,
    seller_id,
    group_sub_id,
    application_id,
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
    p_application_id,
    p_amount,
    platform_fee,
    seller_amount,
    p_payment_method,
    p_payment_provider,
    p_payment_id,
    'pending'
  ) RETURNING id INTO transaction_id;
  
  RETURN transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete a transaction
CREATE OR REPLACE FUNCTION complete_transaction(
  p_transaction_id UUID,
  p_status TEXT DEFAULT 'completed'
)
RETURNS BOOLEAN AS $$
DECLARE
  app_id UUID;
  group_sub_id UUID;
  has_instant_access BOOLEAN;
BEGIN
  -- Get application ID and check for instant access
  SELECT 
    t.application_id, 
    t.group_sub_id,
    gs.instant_access INTO app_id, group_sub_id, has_instant_access
  FROM transactions t
  JOIN group_subs gs ON t.group_sub_id = gs.id
  WHERE t.id = p_transaction_id;

  -- Update transaction status
  UPDATE transactions
  SET 
    status = p_status,
    completed_at = CASE WHEN p_status = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_transaction_id;
  
  -- If transaction is completed, update application status
  IF p_status = 'completed' THEN
    UPDATE applications
    SET status = 'accepted'
    WHERE id = app_id;
    
    -- If the group_sub has instant_access, generate access token
    IF has_instant_access THEN
      -- Use the function but don't save the token (handled by the API)
      PERFORM create_access_token(app_id);
    END IF;
  END IF;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id UUID,
  p_action_type TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_status TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
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
    COALESCE(p_details, '{}'::jsonb)
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;