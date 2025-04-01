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
CREATE OR REPLACE FUNCTION update_slots_available()
RETURNS TRIGGER AS $$
BEGIN
  -- If application is accepted, decrease available slots
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status <> 'accepted') THEN
    UPDATE group_subs
    SET slots_available = slots_available - 1
    WHERE id = NEW.group_sub_id;
  
  -- If application was accepted and now it's not, increase available slots
  ELSIF OLD.status = 'accepted' AND NEW.status <> 'accepted' THEN
    UPDATE group_subs
    SET slots_available = slots_available + 1
    WHERE id = NEW.group_sub_id;
  END IF;
  
  -- Update group_sub status to 'full' if no slots available
  UPDATE group_subs
  SET status = CASE 
    WHEN slots_available <= 0 THEN 'full'
    ELSE status
  END
  WHERE id = NEW.group_sub_id;
  
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

-- Function to create access token for an application
CREATE OR REPLACE FUNCTION create_access_token(application_id UUID, expires_in_minutes INTEGER DEFAULT 30)
RETURNS UUID AS $$
DECLARE
  token_id UUID;
  token_value TEXT;
BEGIN
  -- Generate token
  token_value := generate_secure_token();
  
  -- Insert token
  INSERT INTO access_tokens (
    application_id,
    token,
    expires_at
  ) VALUES (
    application_id,
    token_value,
    CURRENT_TIMESTAMP + (expires_in_minutes || ' minutes')::INTERVAL
  ) RETURNING id INTO token_id;
  
  -- Update application
  UPDATE applications
  SET 
    access_provided = TRUE,
    access_provided_at = CURRENT_TIMESTAMP
  WHERE id = application_id;
  
  RETURN token_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate access token
CREATE OR REPLACE FUNCTION validate_access_token(token_value TEXT, ip TEXT, user_agent TEXT)
RETURNS UUID AS $$
DECLARE
  token_record access_tokens%ROWTYPE;
  app_id UUID;
BEGIN
  -- Get token record
  SELECT * INTO token_record
  FROM access_tokens
  WHERE token = token_value;
  
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
CREATE OR REPLACE FUNCTION confirm_application_access(application_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update application to confirm access
  UPDATE applications
  SET 
    access_confirmed = TRUE,
    access_confirmed_at = CURRENT_TIMESTAMP,
    status = 'completed'
  WHERE id = application_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_data(data TEXT, key_id TEXT)
RETURNS BYTEA AS $$
DECLARE
  encrypted_data BYTEA;
BEGIN
  -- In production, use a proper encryption service
  -- This is a simple example using pgcrypto
  encrypted_data := pgp_sym_encrypt(
    data,
    (SELECT current_setting('app.encryption_key', true))
  );
  
  RETURN encrypted_data;
END;
$$ LANGUAGE plpgsql;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_data(encrypted_data BYTEA)
RETURNS TEXT AS $$
DECLARE
  decrypted_data TEXT;
BEGIN
  -- In production, use a proper encryption service
  -- This is a simple example using pgcrypto
  decrypted_data := pgp_sym_decrypt(
    encrypted_data,
    (SELECT current_setting('app.encryption_key', true))
  );
  
  RETURN decrypted_data;
END;
$$ LANGUAGE plpgsql;

-- Function to store encrypted access instructions
CREATE OR REPLACE FUNCTION store_access_instructions(
  p_group_sub_id UUID,
  p_instructions TEXT,
  p_key_id TEXT DEFAULT 'main-key'
)
RETURNS UUID AS $$
DECLARE
  instruction_id UUID;
  encrypted_instructions BYTEA;
BEGIN
  -- Encrypt the instructions
  encrypted_instructions := encrypt_data(p_instructions, p_key_id);
  
  -- Check if instructions already exist for this group_sub
  SELECT id INTO instruction_id
  FROM access_instructions
  WHERE group_sub_id = p_group_sub_id;
  
  IF instruction_id IS NULL THEN
    -- Insert new instructions
    INSERT INTO access_instructions (
      group_sub_id,
      encrypted_data,
      encryption_version,
      encryption_key_id
    ) VALUES (
      p_group_sub_id,
      encrypted_instructions,
      '1.0',
      p_key_id
    ) RETURNING id INTO instruction_id;
  ELSE
    -- Update existing instructions
    UPDATE access_instructions
    SET 
      encrypted_data = encrypted_instructions,
      encryption_version = '1.0',
      encryption_key_id = p_key_id,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = instruction_id;
  END IF;
  
  -- Set instant_access flag to true for the group_sub
  UPDATE group_subs
  SET instant_access = TRUE
  WHERE id = p_group_sub_id;
  
  RETURN instruction_id;
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
BEGIN
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
    WHERE id = (SELECT application_id FROM transactions WHERE id = p_transaction_id);
    
    -- If the group_sub has instant_access, generate access token
    IF EXISTS (
      SELECT 1 
      FROM group_subs gs
      JOIN transactions t ON t.group_sub_id = gs.id
      WHERE t.id = p_transaction_id AND gs.instant_access = TRUE
    ) THEN
      PERFORM create_access_token(
        (SELECT application_id FROM transactions WHERE id = p_transaction_id)
      );
    END IF;
  END IF;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;