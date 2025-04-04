-- Polityki Row Level Security dla GroupShare
-- Plik: migrations/002_rls_policies.sql

-- Włączenie RLS dla wszystkich tabel związanych z bezpieczeństwem
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- Włączenie RLS dla tabel biznesowych (jeśli jeszcze nie włączone)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_subs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_platforms ENABLE ROW LEVEL SECURITY;

-- Polityki dla encryption_keys
CREATE POLICY "Admin select encryption_keys" ON encryption_keys
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE is_admin = TRUE)
  );

CREATE POLICY "Admin insert encryption_keys" ON encryption_keys
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE is_admin = TRUE)
  );

CREATE POLICY "Admin update encryption_keys" ON encryption_keys
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM users WHERE is_admin = TRUE)
  );

-- Polityki dla access_instructions
CREATE POLICY "Group owners select access_instructions" ON access_instructions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_subs gs
      JOIN groups g ON gs.group_id = g.id
      WHERE gs.id = access_instructions.group_sub_id AND g.owner_id = auth.uid()
    )
  );

CREATE POLICY "Group owners insert access_instructions" ON access_instructions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_subs gs
      JOIN groups g ON gs.group_id = g.id
      WHERE gs.id = access_instructions.group_sub_id AND g.owner_id = auth.uid()
    )
  );

CREATE POLICY "Group owners update access_instructions" ON access_instructions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_subs gs
      JOIN groups g ON gs.group_id = g.id
      WHERE gs.id = access_instructions.group_sub_id AND g.owner_id = auth.uid()
    )
  );

-- Polityki dla access_tokens
CREATE POLICY "Users select access_tokens" ON access_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = access_tokens.application_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Offer owners insert access_tokens" ON access_tokens
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN group_subs gs ON a.group_sub_id = gs.id
      JOIN groups g ON gs.group_id = g.id
      WHERE a.id = access_tokens.application_id AND g.owner_id = auth.uid()
    )
  );

-- Polityki dla security_logs
CREATE POLICY "Users select security_logs" ON security_logs
  FOR SELECT USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT id FROM users WHERE is_admin = TRUE)
  );

-- Polityki dla device_fingerprints
CREATE POLICY "Users select device_fingerprints" ON device_fingerprints
  FOR SELECT USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT id FROM users WHERE is_admin = TRUE)
  );

CREATE POLICY "Users insert device_fingerprints" ON device_fingerprints
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Polityki dla user_locations
CREATE POLICY "Users select user_locations" ON user_locations
  FOR SELECT USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT id FROM users WHERE is_admin = TRUE)
  );

CREATE POLICY "Users insert user_locations" ON user_locations
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );