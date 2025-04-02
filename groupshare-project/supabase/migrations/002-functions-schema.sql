-- Row Level Security Policies for GroupShare
-- This script sets up RLS policies to secure data access

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_subs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;

-- Create a function to get the current authenticated user ID
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS UUID AS $$
  SELECT id FROM user_profiles WHERE external_auth_id = auth.uid()::text
$$ LANGUAGE SQL SECURITY DEFINER;

-- Create a function to check if a user is a member of a group
CREATE OR REPLACE FUNCTION is_group_member(group_id UUID, user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = $1 AND user_id = $2 AND status = 'active'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Create a function to check if a user is a group admin
CREATE OR REPLACE FUNCTION is_group_admin(group_id UUID, user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = $1 AND user_id = $2 AND role = 'admin' AND status = 'active'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Create a function to check if a user is a group owner
CREATE OR REPLACE FUNCTION is_group_owner(group_id UUID, user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM groups 
    WHERE id = $1 AND owner_id = $2
  );
$$ LANGUAGE SQL SECURITY DEFINER;

----------------------
-- Policy: user_profiles
----------------------
-- Anyone can see basic user profile information
CREATE POLICY "Public users can view profiles" ON user_profiles
  FOR SELECT USING (true);

-- Users can update only their own profiles
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (id = auth.user_id());

-- Only backend service can insert new profiles (handled by auth hook)
CREATE POLICY "Service can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

----------------------
-- Policy: groups
----------------------
-- Anyone can see groups
CREATE POLICY "Public users can view groups" ON groups
  FOR SELECT USING (true);

-- Only authenticated users can create groups
CREATE POLICY "Authenticated users can create groups" ON groups
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only group owners can update groups
CREATE POLICY "Group owners can update groups" ON groups
  FOR UPDATE USING (owner_id = auth.user_id());

-- Only group owners can delete groups
CREATE POLICY "Group owners can delete groups" ON groups
  FOR DELETE USING (owner_id = auth.user_id());

----------------------
-- Policy: group_members
----------------------
-- Users can see members of groups they belong to
CREATE POLICY "Users can view members of their groups" ON group_members
  FOR SELECT USING (
    is_group_member(group_id, auth.user_id()) OR 
    is_group_owner(group_id, auth.user_id())
  );

-- Group owners and admins can add members
CREATE POLICY "Group admins can add members" ON group_members
  FOR INSERT WITH CHECK (
    is_group_admin(group_id, auth.user_id()) OR 
    is_group_owner(group_id, auth.user_id())
  );

-- Group owners and admins can update members
CREATE POLICY "Group admins can update members" ON group_members
  FOR UPDATE USING (
    is_group_admin(group_id, auth.user_id()) OR 
    is_group_owner(group_id, auth.user_id())
  );

-- Group owners and admins can delete members
CREATE POLICY "Group admins can delete members" ON group_members
  FOR DELETE USING (
    is_group_admin(group_id, auth.user_id()) OR 
    is_group_owner(group_id, auth.user_id())
  );

----------------------
-- Policy: subscription_platforms
----------------------
-- Anyone can see platform information
CREATE POLICY "Public users can view platforms" ON subscription_platforms
  FOR SELECT USING (active = true);

-- Only service role can modify platforms
CREATE POLICY "Service can modify platforms" ON subscription_platforms
  FOR ALL USING (auth.role() = 'service_role');

----------------------
-- Policy: group_subs
----------------------
-- Anyone can see active subscription offers
CREATE POLICY "Public users can view active subscription offers" ON group_subs
  FOR SELECT USING (status = 'active');

-- Group owners and admins can manage subscription offers
CREATE POLICY "Group admins can manage subscription offers" ON group_subs
  FOR ALL USING (
    is_group_admin((SELECT group_id FROM group_subs WHERE id = group_subs.id), auth.user_id()) OR
    is_group_owner((SELECT group_id FROM group_subs WHERE id = group_subs.id), auth.user_id())
  );

----------------------
-- Policy: access_instructions
----------------------
-- IMPORTANT: access_instructions contains sensitive data and should have very strict policies

-- NO SELECT policy for access_instructions - data should only be accessed via API with proper encryption handling
-- Only service role can read access instructions directly
CREATE POLICY "Service can read access instructions" ON access_instructions
  FOR SELECT USING (auth.role() = 'service_role');

-- Only group owners and admins can insert access instructions
CREATE POLICY "Group admins can insert access instructions" ON access_instructions
  FOR INSERT WITH CHECK (
    is_group_admin(
      (SELECT group_id FROM group_subs WHERE id = group_sub_id), 
      auth.user_id()
    ) OR
    is_group_owner(
      (SELECT group_id FROM group_subs WHERE id = group_sub_id), 
      auth.user_id()
    )
  );

-- Only group owners and admins can update access instructions
CREATE POLICY "Group admins can update access instructions" ON access_instructions
  FOR UPDATE USING (
    is_group_admin(
      (SELECT group_id FROM group_subs WHERE id = group_sub_id), 
      auth.user_id()
    ) OR
    is_group_owner(
      (SELECT group_id FROM group_subs WHERE id = group_sub_id), 
      auth.user_id()
    )
  );

----------------------
-- Policy: applications
----------------------
-- Users can see applications they created or applications for subscriptions they manage
CREATE POLICY "Users can view relevant applications" ON applications
  FOR SELECT USING (
    user_id = auth.user_id() OR
    is_group_admin(
      (SELECT group_id FROM group_subs WHERE id = group_sub_id), 
      auth.user_id()
    ) OR
    is_group_owner(
      (SELECT group_id FROM group_subs WHERE id = group_sub_id), 
      auth.user_id()
    )
  );

-- Authenticated users can create applications
CREATE POLICY "Authenticated users can create applications" ON applications
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    user_id = auth.user_id()
  );

-- Users can update their own applications
CREATE POLICY "Users can update own applications" ON applications
  FOR UPDATE USING (
    user_id = auth.user_id()
  );

-- Group admins can update applications for their subscriptions
CREATE POLICY "Group admins can update applications" ON applications
  FOR UPDATE USING (
    is_group_admin(
      (SELECT group_id FROM group_subs WHERE id = group_sub_id), 
      auth.user_id()
    ) OR
    is_group_owner(
      (SELECT group_id FROM group_subs WHERE id = group_sub_id), 
      auth.user_id()
    )
  );

----------------------
-- Policy: access_tokens
----------------------
-- Only token owners can view their tokens
CREATE POLICY "Users can view own tokens" ON access_tokens
  FOR SELECT USING (
    (SELECT user_id FROM applications WHERE id = application_id) = auth.user_id()
  );

-- Only service role can create tokens
CREATE POLICY "Service can create tokens" ON access_tokens
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
  );

-- Service role and token owners can update tokens
CREATE POLICY "Service and users can update tokens" ON access_tokens
  FOR UPDATE USING (
    auth.role() = 'service_role' OR
    (SELECT user_id FROM applications WHERE id = application_id) = auth.user_id()
  );

----------------------
-- Policy: transactions
----------------------
-- Users can see transactions they're involved in
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (
    buyer_id = auth.user_id() OR
    seller_id = auth.user_id()
  );

-- Only service role can create transactions
CREATE POLICY "Service can create transactions" ON transactions
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
  );

-- Only service role can update transactions
CREATE POLICY "Service can update transactions" ON transactions
  FOR UPDATE USING (
    auth.role() = 'service_role'
  );

----------------------
-- Policy: ratings
----------------------
-- Anyone can see ratings
CREATE POLICY "Public users can view ratings" ON ratings
  FOR SELECT USING (true);

-- Users can create ratings for transactions they're involved in
CREATE POLICY "Users can create ratings for own transactions" ON ratings
  FOR INSERT WITH CHECK (
    rater_id = auth.user_id() AND
    (
      EXISTS (
        SELECT 1 FROM transactions 
        WHERE id = transaction_id AND 
        (buyer_id = auth.user_id() OR seller_id = auth.user_id())
      )
    )
  );

-- Users can update their own ratings
CREATE POLICY "Users can update own ratings" ON ratings
  FOR UPDATE USING (
    rater_id = auth.user_id()
  );

-- Users can delete their own ratings
CREATE POLICY "Users can delete own ratings" ON ratings
  FOR DELETE USING (
    rater_id = auth.user_id()
  );

----------------------
-- Policy: encryption_keys
----------------------
-- Only service role can access encryption keys
CREATE POLICY "Service can manage encryption keys" ON encryption_keys
  FOR ALL USING (auth.role() = 'service_role');

----------------------
-- Policy: security_logs
----------------------
-- Users can see their own security logs
CREATE POLICY "Users can view own security logs" ON security_logs
  FOR SELECT USING (user_id = auth.user_id());

-- Only service role can insert security logs
CREATE POLICY "Service can insert security logs" ON security_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- No one can update or delete security logs (immutable audit trail)
-- These policies are intentionally omitted

----------------------
-- Policy: device_fingerprints
----------------------
-- Only service role can access device fingerprints
CREATE POLICY "Service can manage device fingerprints" ON device_fingerprints
  FOR ALL USING (auth.role() = 'service_role');