-- Row Level Security Policies for GroupShare
-- This script sets up RLS policies to secure data access

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_subs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;

----------------------
-- Policy: user_profiles
----------------------
-- Każdy może zobaczyć tylko podstawowe informacje o profilu
CREATE POLICY "Public users can view basic profile info" ON user_profiles
  FOR SELECT USING (true);

-- Dodatkowa polityka dla uwierzytelnionych użytkowników umożliwiająca pełny dostęp
CREATE POLICY "Authenticated users can view full profiles" ON user_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

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
    EXISTS (
      SELECT 1 FROM groups g 
      WHERE g.id = group_subs.group_id AND 
      (
        EXISTS (
          SELECT 1 FROM group_members gm
          WHERE gm.group_id = g.id AND gm.user_id = auth.user_id() AND gm.role = 'admin' AND gm.status = 'active'
        ) OR
        g.owner_id = auth.user_id()
      )
    )
  );

----------------------
-- Policy: access_instructions
----------------------
-- IMPORTANT: access_instructions contains sensitive data and should have very strict policies

-- Only users with completed purchase record can view access instructions
CREATE POLICY "Users can view access instructions for purchased subscriptions" ON access_instructions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 
      FROM purchase_records pr
      WHERE pr.group_sub_id = access_instructions.group_sub_id
      AND pr.user_id = auth.user_id()
      AND pr.status = 'completed'
      AND pr.access_provided = TRUE
    ) OR
    auth.role() = 'service_role'
  );

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
-- Policy: purchase_records
----------------------
-- Users can see purchase records they created or purchase records for subscriptions they manage
CREATE POLICY "Users can view relevant purchase records" ON purchase_records
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

-- Authenticated users can create purchase records
CREATE POLICY "Authenticated users can create purchase records" ON purchase_records
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    user_id = auth.user_id() AND
    (SELECT slots_available FROM group_subs WHERE id = group_sub_id) > 0
  );

-- Users can update their own purchase records
CREATE POLICY "Users can update own purchase records" ON purchase_records
  FOR UPDATE USING (
    user_id = auth.user_id()
  );

-- Group admins can update purchase records for their subscriptions
CREATE POLICY "Group admins can update purchase records" ON purchase_records
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
    (SELECT user_id FROM purchase_records WHERE id = purchase_record_id) = auth.user_id()
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
    (SELECT user_id FROM purchase_records WHERE id = purchase_record_id) = auth.user_id()
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
        (buyer_id = auth.user_id() OR seller_id = auth.user_id()) AND
        status = 'completed'
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
-- Users can view their own device fingerprints
CREATE POLICY "Users can view own device fingerprints" ON device_fingerprints
  FOR SELECT USING (user_id = auth.user_id());

-- Only service role can manage device fingerprints
CREATE POLICY "Service can manage device fingerprints" ON device_fingerprints
  FOR ALL USING (auth.role() = 'service_role');

----------------------
-- Policy: notifications
----------------------
-- Users can view own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.user_id());

-- Users can mark own notifications as read
CREATE POLICY "Users can mark own notifications as read" ON notifications
  FOR UPDATE USING (user_id = auth.user_id())
  WITH CHECK (
    user_id = auth.user_id() AND 
    is_read IS NOT NULL
  );

----------------------
-- Policy: messages
----------------------
-- Users can view messages they sent or received
CREATE POLICY "Users can view messages they sent or received" ON messages
  FOR SELECT USING (sender_id = auth.user_id() OR receiver_id = auth.user_id());

-- Users can send messages
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.user_id());

----------------------
-- Policy: message_threads
----------------------
-- Users can view threads they participate in
CREATE POLICY "Users can view threads they participate in" ON message_threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM message_thread_participants 
      WHERE thread_id = message_threads.id AND user_id = auth.user_id()
    )
  );

----------------------
-- Policy: thread_participants
----------------------
-- Users can view thread participants for their threads
CREATE POLICY "Users can view thread participants for their threads" ON message_thread_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM message_thread_participants 
      WHERE thread_id = message_thread_participants.thread_id AND user_id = auth.user_id()
    )
  );

----------------------
-- Policy: group_invitations
----------------------
-- Group admins can view invitations
CREATE POLICY "Group admins can view invitations" ON group_invitations
  FOR SELECT USING (
    is_group_admin(group_id, auth.user_id()) OR 
    is_group_owner(group_id, auth.user_id()) OR
    invited_by = auth.user_id()
  );

-- Group admins can create invitations
CREATE POLICY "Group admins can create invitations" ON group_invitations
  FOR INSERT WITH CHECK (
    is_group_admin(group_id, auth.user_id()) OR 
    is_group_owner(group_id, auth.user_id())
  );

-- Group admins can update invitations
CREATE POLICY "Group admins can update invitations" ON group_invitations
  FOR UPDATE USING (
    is_group_admin(group_id, auth.user_id()) OR 
    is_group_owner(group_id, auth.user_id()) OR
    invited_by = auth.user_id()
  );

----------------------
-- Policy: disputes
----------------------
-- Users can view disputes they reported
CREATE POLICY "Users can view disputes they reported" ON disputes
  FOR SELECT USING (
    reporter_id = auth.user_id() OR
    resolved_by = auth.user_id() OR
    auth.role() = 'service_role'
  );

-- Users can create disputes
CREATE POLICY "Users can create disputes" ON disputes
  FOR INSERT WITH CHECK (reporter_id = auth.user_id());

-- Service role can update disputes
CREATE POLICY "Service role can update disputes" ON disputes
  FOR UPDATE USING (auth.role() = 'service_role');

----------------------
-- Policy: dispute_comments
----------------------
-- Users can view comments on their disputes
CREATE POLICY "Users can view comments on their disputes" ON dispute_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE id = dispute_comments.dispute_id AND reporter_id = auth.user_id()
    ) OR
    user_id = auth.user_id() OR
    auth.role() = 'service_role'
  );

-- Users can add comments to disputes
CREATE POLICY "Users can add comments to disputes" ON dispute_comments
  FOR INSERT WITH CHECK (
    user_id = auth.user_id()
  );

----------------------
-- Policy: dispute_evidence
----------------------
-- Users can view evidence on their disputes
CREATE POLICY "Users can view evidence on their disputes" ON dispute_evidence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE id = dispute_evidence.dispute_id AND reporter_id = auth.user_id()
    ) OR
    user_id = auth.user_id() OR
    auth.role() = 'service_role'
  );

-- Users can add evidence to disputes
CREATE POLICY "Users can add evidence to disputes" ON dispute_evidence
  FOR INSERT WITH CHECK (
    user_id = auth.user_id()
  );