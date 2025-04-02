-- Extended features for GroupShare MVP
-- This script adds critical functionality: notifications, invitations, and dispute resolution

--------------------------------
-- 1. Notification System
--------------------------------

-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'payment', 'invitation', 'access', 'application', 'dispute'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    related_entity_type TEXT, -- 'group', 'application', 'transaction', 'dispute'
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table for direct communication
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES user_profiles(id),
    receiver_id UUID NOT NULL REFERENCES user_profiles(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create conversation threads table to group messages
CREATE TABLE message_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    related_entity_type TEXT, -- 'group', 'subscription', 'application'
    related_entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create thread participants table
CREATE TABLE message_thread_participants (
    thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (thread_id, user_id)
);

-- Add thread_id to messages
ALTER TABLE messages ADD COLUMN thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE;

--------------------------------
-- 2. Group Invitation System
--------------------------------

-- Create group invitations table
CREATE TABLE group_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES user_profiles(id),
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    invitation_token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--------------------------------
-- 3. Dispute Resolution System
--------------------------------

-- Create disputes table
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES user_profiles(id),
    reported_entity_type TEXT NOT NULL, -- 'user', 'group', 'subscription', 'transaction'
    reported_entity_id UUID NOT NULL,
    transaction_id UUID REFERENCES transactions(id),
    dispute_type TEXT NOT NULL, -- 'payment', 'access', 'quality', 'behavior'
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'investigating', 'resolved', 'rejected')),
    resolution_note TEXT,
    resolved_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create dispute comments table
CREATE TABLE dispute_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create dispute evidence table
CREATE TABLE dispute_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    evidence_type TEXT NOT NULL, -- 'text', 'screenshot', 'document'
    content TEXT NOT NULL, -- URL or text content
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--------------------------------
-- Create indexes for performance
--------------------------------

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id);

-- Message indexes
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Thread indexes
CREATE INDEX idx_message_threads_related_entity ON message_threads(related_entity_type, related_entity_id);
CREATE INDEX idx_message_thread_participants_user_id ON message_thread_participants(user_id);

-- Invitation indexes
CREATE INDEX idx_group_invitations_group_id ON group_invitations(group_id);
CREATE INDEX idx_group_invitations_email ON group_invitations(email);
CREATE INDEX idx_group_invitations_token ON group_invitations(invitation_token);
CREATE INDEX idx_group_invitations_status ON group_invitations(status);

-- Dispute indexes
CREATE INDEX idx_disputes_reporter_id ON disputes(reporter_id);
CREATE INDEX idx_disputes_reported_entity ON disputes(reported_entity_type, reported_entity_id);
CREATE INDEX idx_disputes_transaction_id ON disputes(transaction_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_dispute_comments_dispute_id ON dispute_comments(dispute_id);
CREATE INDEX idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);

--------------------------------
-- Add triggers for updated_at
--------------------------------

-- Update trigger for message_threads
CREATE TRIGGER update_message_threads_updated_at
BEFORE UPDATE ON message_threads
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Update trigger for group_invitations
CREATE TRIGGER update_group_invitations_updated_at
BEFORE UPDATE ON group_invitations
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Update trigger for disputes
CREATE TRIGGER update_disputes_updated_at
BEFORE UPDATE ON disputes
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

--------------------------------
-- Functions for new features
--------------------------------

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_content TEXT,
    p_related_entity_type TEXT DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id,
        type,
        title,
        content,
        related_entity_type,
        related_entity_id
    ) VALUES (
        p_user_id,
        p_type,
        p_title,
        p_content,
        p_related_entity_type,
        p_related_entity_id
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create a message thread
CREATE OR REPLACE FUNCTION create_message_thread(
    p_title TEXT,
    p_participants UUID[],
    p_related_entity_type TEXT DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    thread_id UUID;
    participant UUID;
BEGIN
    -- Create thread
    INSERT INTO message_threads (
        title,
        related_entity_type,
        related_entity_id
    ) VALUES (
        p_title,
        p_related_entity_type,
        p_related_entity_id
    ) RETURNING id INTO thread_id;
    
    -- Add participants
    FOREACH participant IN ARRAY p_participants
    LOOP
        INSERT INTO message_thread_participants (
            thread_id,
            user_id
        ) VALUES (
            thread_id,
            participant
        );
    END LOOP;
    
    RETURN thread_id;
END;
$$ LANGUAGE plpgsql;

-- Function to send a message
CREATE OR REPLACE FUNCTION send_message(
    p_sender_id UUID,
    p_receiver_id UUID,
    p_content TEXT,
    p_thread_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    message_id UUID;
    thread_id_local UUID := p_thread_id;
BEGIN
    -- If no thread_id is provided, check if a direct thread exists between sender and receiver
    IF thread_id_local IS NULL THEN
        SELECT mt.id INTO thread_id_local
        FROM message_threads mt
        INNER JOIN message_thread_participants mtp1 ON mt.id = mtp1.thread_id
        INNER JOIN message_thread_participants mtp2 ON mt.id = mtp2.thread_id
        WHERE mtp1.user_id = p_sender_id
          AND mtp2.user_id = p_receiver_id
          AND mt.related_entity_type IS NULL
          AND (SELECT COUNT(*) FROM message_thread_participants WHERE thread_id = mt.id) = 2
        LIMIT 1;
        
        -- If no thread exists, create a new one
        IF thread_id_local IS NULL THEN
            thread_id_local := create_message_thread(
                'Direct message',
                ARRAY[p_sender_id, p_receiver_id]::UUID[]
            );
        END IF;
    END IF;
    
    -- Insert message
    INSERT INTO messages (
        sender_id,
        receiver_id,
        content,
        thread_id
    ) VALUES (
        p_sender_id,
        p_receiver_id,
        p_content,
        thread_id_local
    ) RETURNING id INTO message_id;
    
    -- Update thread's updated_at
    UPDATE message_threads
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = thread_id_local;
    
    -- Create notification for receiver
    PERFORM create_notification(
        p_receiver_id,
        'message',
        'New message',
        substring(p_content from 1 for 100) || CASE WHEN length(p_content) > 100 THEN '...' ELSE '' END,
        'message',
        message_id
    );
    
    RETURN message_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create group invitation
CREATE OR REPLACE FUNCTION create_group_invitation(
    p_group_id UUID,
    p_email TEXT,
    p_invited_by UUID,
    p_role TEXT DEFAULT 'member',
    p_expires_in_days INTEGER DEFAULT 7
) RETURNS UUID AS $$
DECLARE
    invitation_id UUID;
    invitation_token TEXT;
    user_id UUID;
BEGIN
    -- Generate unique token
    invitation_token := generate_secure_token();
    
    -- Create invitation
    INSERT INTO group_invitations (
        group_id,
        email,
        invited_by,
        role,
        invitation_token,
        status,
        expires_at
    ) VALUES (
        p_group_id,
        p_email,
        p_invited_by,
        p_role,
        invitation_token,
        'pending',
        CURRENT_TIMESTAMP + (p_expires_in_days || ' days')::INTERVAL
    ) RETURNING id INTO invitation_id;
    
    -- Check if user with this email exists
    SELECT id INTO user_id
    FROM user_profiles
    WHERE email = p_email;
    
    -- If user exists, create notification
    IF user_id IS NOT NULL THEN
        PERFORM create_notification(
            user_id,
            'invitation',
            'Group invitation',
            'You have been invited to join a group: ' || (SELECT name FROM groups WHERE id = p_group_id),
            'group',
            p_group_id
        );
    END IF;
    
    RETURN invitation_id;
END;
$$ LANGUAGE plpgsql;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION accept_group_invitation(
    p_invitation_token TEXT,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    invitation_record group_invitations%ROWTYPE;
BEGIN
    -- Get invitation
    SELECT * INTO invitation_record
    FROM group_invitations
    WHERE invitation_token = p_invitation_token;
    
    -- Check if invitation exists
    IF invitation_record IS NULL THEN
        RAISE EXCEPTION 'Invalid invitation token';
    END IF;
    
    -- Check if invitation is expired
    IF invitation_record.expires_at < CURRENT_TIMESTAMP THEN
        UPDATE group_invitations
        SET status = 'expired'
        WHERE id = invitation_record.id;
        
        RAISE EXCEPTION 'Invitation has expired';
    END IF;
    
    -- Check if invitation is still pending
    IF invitation_record.status <> 'pending' THEN
        RAISE EXCEPTION 'Invitation has already been % ', invitation_record.status;
    END IF;
    
    -- Update invitation status
    UPDATE group_invitations
    SET 
        status = 'accepted',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = invitation_record.id;
    
    -- Add user to group
    INSERT INTO group_members (
        group_id,
        user_id,
        role,
        status,
        invited_by,
        joined_at
    ) VALUES (
        invitation_record.group_id,
        p_user_id,
        invitation_record.role,
        'active',
        invitation_record.invited_by,
        CURRENT_TIMESTAMP
    );
    
    -- Notify the inviter
    PERFORM create_notification(
        invitation_record.invited_by,
        'invitation_accepted',
        'Invitation accepted',
        (SELECT display_name FROM user_profiles WHERE id = p_user_id) || ' has accepted your invitation to join ' || 
        (SELECT name FROM groups WHERE id = invitation_record.group_id),
        'group',
        invitation_record.group_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to create a dispute
CREATE OR REPLACE FUNCTION create_dispute(
    p_reporter_id UUID,
    p_reported_entity_type TEXT,
    p_reported_entity_id UUID,
    p_dispute_type TEXT,
    p_description TEXT,
    p_transaction_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    dispute_id UUID;
    admin_ids UUID[];
BEGIN
    -- Create dispute
    INSERT INTO disputes (
        reporter_id,
        reported_entity_type,
        reported_entity_id,
        transaction_id,
        dispute_type,
        description,
        status
    ) VALUES (
        p_reporter_id,
        p_reported_entity_type,
        p_reported_entity_id,
        p_transaction_id,
        p_dispute_type,
        p_description,
        'open'
    ) RETURNING id INTO dispute_id;
    
    -- Notify admins (in real implementation, you'd notify system admins)
    -- For MVP, we'll notify group admins if dispute is about a group or subscription
    IF p_reported_entity_type = 'group' THEN
        SELECT array_agg(user_id) INTO admin_ids
        FROM group_members
        WHERE group_id = p_reported_entity_id AND role = 'admin';
    ELSIF p_reported_entity_type = 'subscription' THEN
        SELECT array_agg(gm.user_id) INTO admin_ids
        FROM group_members gm
        JOIN group_subs gs ON gm.group_id = gs.group_id
        WHERE gs.id = p_reported_entity_id AND gm.role = 'admin';
    END IF;
    
    -- If we have admins to notify
    IF admin_ids IS NOT NULL THEN
        FOR i IN 1..array_length(admin_ids, 1)
        LOOP
            PERFORM create_notification(
                admin_ids[i],
                'dispute',
                'New dispute reported',
                'A new dispute has been reported: ' || p_dispute_type,
                'dispute',
                dispute_id
            );
        END LOOP;
    END IF;
    
    RETURN dispute_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add comment to dispute
CREATE OR REPLACE FUNCTION add_dispute_comment(
    p_dispute_id UUID,
    p_user_id UUID,
    p_comment TEXT,
    p_is_internal BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
    comment_id UUID;
    dispute_record disputes%ROWTYPE;
BEGIN
    -- Get dispute
    SELECT * INTO dispute_record
    FROM disputes
    WHERE id = p_dispute_id;
    
    -- Check if dispute exists
    IF dispute_record IS NULL THEN
        RAISE EXCEPTION 'Dispute not found';
    END IF;
    
    -- Add comment
    INSERT INTO dispute_comments (
        dispute_id,
        user_id,
        comment,
        is_internal
    ) VALUES (
        p_dispute_id,
        p_user_id,
        p_comment,
        p_is_internal
    ) RETURNING id INTO comment_id;
    
    -- Notify reporter if comment is from someone else
    IF p_user_id <> dispute_record.reporter_id AND NOT p_is_internal THEN
        PERFORM create_notification(
            dispute_record.reporter_id,
            'dispute_comment',
            'New comment on your dispute',
            'Someone has commented on your dispute',
            'dispute',
            p_dispute_id
        );
    END IF;
    
    RETURN comment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to resolve dispute
CREATE OR REPLACE FUNCTION resolve_dispute(
    p_dispute_id UUID,
    p_resolver_id UUID,
    p_status TEXT,
    p_resolution_note TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    dispute_record disputes%ROWTYPE;
BEGIN
    -- Get dispute
    SELECT * INTO dispute_record
    FROM disputes
    WHERE id = p_dispute_id;
    
    -- Check if dispute exists
    IF dispute_record IS NULL THEN
        RAISE EXCEPTION 'Dispute not found';
    END IF;
    
    -- Update dispute
    UPDATE disputes
    SET 
        status = p_status,
        resolution_note = p_resolution_note,
        resolved_by = p_resolver_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_dispute_id;
    
    -- Notify reporter
    PERFORM create_notification(
        dispute_record.reporter_id,
        'dispute_resolved',
        'Your dispute has been resolved',
        'Your dispute has been marked as ' || p_status,
        'dispute',
        p_dispute_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

--------------------------------
-- Set up RLS policies
--------------------------------

-- Enable RLS on new tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.user_id());

-- Messages policies
CREATE POLICY "Users can view messages they sent or received" ON messages
  FOR SELECT USING (sender_id = auth.user_id() OR receiver_id = auth.user_id());

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.user_id());

-- Message threads policies
CREATE POLICY "Users can view threads they participate in" ON message_threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM message_thread_participants 
      WHERE thread_id = message_threads.id AND user_id = auth.user_id()
    )
  );

-- Thread participants policies
CREATE POLICY "Users can view thread participants for their threads" ON message_thread_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM message_thread_participants 
      WHERE thread_id = message_thread_participants.thread_id AND user_id = auth.user_id()
    )
  );

-- Group invitations policies
CREATE POLICY "Group admins can view invitations" ON group_invitations
  FOR SELECT USING (
    is_group_admin(group_id, auth.user_id()) OR 
    is_group_owner(group_id, auth.user_id()) OR
    invited_by = auth.user_id()
  );

CREATE POLICY "Group admins can create invitations" ON group_invitations
  FOR INSERT WITH CHECK (
    is_group_admin(group_id, auth.user_id()) OR 
    is_group_owner(group_id, auth.user_id())
  );

CREATE POLICY "Group admins can update invitations" ON group_invitations
  FOR UPDATE USING (
    is_group_admin(group_id, auth.user_id()) OR 
    is_group_owner(group_id, auth.user_id()) OR
    invited_by = auth.user_id()
  );

-- Disputes policies
CREATE POLICY "Users can view disputes they reported" ON disputes
  FOR SELECT USING (
    reporter_id = auth.user_id() OR
    resolved_by = auth.user_id() OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Users can create disputes" ON disputes
  FOR INSERT WITH CHECK (reporter_id = auth.user_id());

CREATE POLICY "Service role can update disputes" ON disputes
  FOR UPDATE USING (auth.role() = 'service_role');

-- Dispute comments policies
CREATE POLICY "Users can view comments on their disputes" ON dispute_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE id = dispute_comments.dispute_id AND reporter_id = auth.user_id()
    ) OR
    user_id = auth.user_id() OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Users can add comments to disputes" ON dispute_comments
  FOR INSERT WITH CHECK (
    user_id = auth.user_id()
  );

-- Create triggers for notifications on application status changes
CREATE OR REPLACE FUNCTION notify_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    -- Notify owner when status changes to 'accepted'
    IF NEW.status = 'accepted' THEN
      PERFORM create_notification(
        NEW.user_id,
        'application',
        'Application accepted',
        'Your application for subscription has been accepted',
        'application',
        NEW.id
      );
    
    -- Notify owner when status changes to 'rejected'
    ELSIF NEW.status = 'rejected' THEN
      PERFORM create_notification(
        NEW.user_id,
        'application',
        'Application rejected',
        'Your application for subscription has been rejected',
        'application',
        NEW.id
      );
    END IF;
    
    -- Notify subscription owner about new applications
    IF OLD.status IS NULL OR OLD.status <> 'pending' AND NEW.status = 'pending' THEN
      PERFORM create_notification(
        (SELECT owner_id FROM groups WHERE id = (SELECT group_id FROM group_subs WHERE id = NEW.group_sub_id)),
        'application',
        'New subscription application',
        'Someone has applied to join your subscription',
        'application',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_on_application_status_change
AFTER UPDATE OF status ON applications
FOR EACH ROW
EXECUTE FUNCTION notify_application_status_change();

-- Create trigger for notifying when payment is completed
CREATE OR REPLACE FUNCTION notify_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    -- Notify buyer when payment is completed
    IF NEW.status = 'completed' THEN
      PERFORM create_notification(
        NEW.buyer_id,
        'payment',
        'Payment completed',
        'Your payment has been processed successfully',
        'transaction',
        NEW.id
      );
      
      -- Notify seller
      PERFORM create_notification(
        NEW.seller_id,
        'payment',
        'Payment received',
        'You have received a payment',
        'transaction',
        NEW.id
      );
    
    -- Notify buyer when payment fails
    ELSIF NEW.status = 'failed' THEN
      PERFORM create_notification(
        NEW.buyer_id,
        'payment',
        'Payment failed',
        'Your payment could not be processed',
        'transaction',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_on_payment_status_change
AFTER UPDATE OF status ON transactions
FOR EACH ROW
EXECUTE FUNCTION notify_payment_status_change();