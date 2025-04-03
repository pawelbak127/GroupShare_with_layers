-- GroupShare Initial Schema
-- This script creates the basic database structure for the GroupShare application

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create security_logs table for audit trail
CREATE TABLE security_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Może być NULL, gdy log nie jest powiązany z użytkownikiem
    action_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    status TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create device_fingerprints table for device tracking
CREATE TABLE device_fingerprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    fingerprint TEXT NOT NULL,
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    counter INTEGER DEFAULT 1,
    UNIQUE(user_id, fingerprint)
);

-- Create users profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_auth_id TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone_number TEXT,
    profile_type TEXT NOT NULL CHECK (profile_type IN ('seller', 'buyer', 'both')),
    verification_level TEXT DEFAULT 'basic' CHECK (verification_level IN ('basic', 'verified', 'trusted')),
    bio TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}'::jsonb,
    rating_avg FLOAT DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    is_premium BOOLEAN DEFAULT FALSE,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create group members table
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    status TEXT NOT NULL CHECK (status IN ('invited', 'active', 'suspended')),
    invited_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, user_id)
);

-- Create encryption_keys table for key management
CREATE TABLE encryption_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_type TEXT NOT NULL,
    public_key TEXT NOT NULL,
    private_key_enc TEXT NOT NULL,
    related_id TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    rotated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create subscription platforms table
CREATE TABLE subscription_platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    max_members INTEGER NOT NULL,
    requirements_text TEXT,
    requirements_icon TEXT,
    pricing JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create group subscriptions table
CREATE TABLE group_subs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    platform_id UUID NOT NULL REFERENCES subscription_platforms(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'full')),
    slots_total INTEGER NOT NULL,
    slots_available INTEGER NOT NULL,
    price_per_slot FLOAT NOT NULL,
    currency TEXT DEFAULT 'PLN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create access instructions table (for encrypted instructions)
CREATE TABLE access_instructions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_sub_id UUID NOT NULL REFERENCES group_subs(id) ON DELETE CASCADE,
    encrypted_data TEXT NOT NULL,
    data_key_enc TEXT NOT NULL,
    encryption_key_id UUID NOT NULL REFERENCES encryption_keys(id) ON DELETE RESTRICT,
    iv TEXT NOT NULL,
    encryption_version TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create purchase_records table
CREATE TABLE purchase_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    group_sub_id UUID NOT NULL REFERENCES group_subs(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending_payment', 'payment_processing', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    access_provided BOOLEAN DEFAULT FALSE,
    access_provided_at TIMESTAMP WITH TIME ZONE,
    access_confirmed BOOLEAN DEFAULT FALSE,
    access_confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Create access tokens table
CREATE TABLE access_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_record_id UUID NOT NULL REFERENCES purchase_records(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    seller_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    group_sub_id UUID NOT NULL REFERENCES group_subs(id) ON DELETE RESTRICT,
    purchase_record_id UUID NOT NULL REFERENCES purchase_records(id) ON DELETE CASCADE,
    amount FLOAT NOT NULL,
    platform_fee FLOAT NOT NULL,
    seller_amount FLOAT NOT NULL,
    currency TEXT DEFAULT 'PLN',
    payment_method TEXT,
    payment_provider TEXT,
    payment_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create ratings table
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rater_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    rated_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    access_quality INTEGER CHECK (access_quality BETWEEN 1 AND 5),
    communication INTEGER CHECK (communication BETWEEN 1 AND 5),
    reliability INTEGER CHECK (reliability BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (rater_id, transaction_id)
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'payment', 'invitation', 'access', 'purchase', 'dispute'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    related_entity_type TEXT, -- 'group', 'purchase_record', 'transaction', 'dispute'
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Messages table for direct communication
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    thread_id UUID, -- Dodane później, więc może być NULL dla starszych wiadomości
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Message threads table to group messages
CREATE TABLE message_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    related_entity_type TEXT, -- 'group', 'subscription', 'purchase_record'
    related_entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Thread participants table
CREATE TABLE message_thread_participants (
    thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (thread_id, user_id)
);

-- Add messages.thread_id foreign key
ALTER TABLE messages 
ADD CONSTRAINT fk_messages_thread_id 
FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE CASCADE;

-- Group invitations table
CREATE TABLE group_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    invitation_token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Disputes table
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    reported_entity_type TEXT NOT NULL, -- 'user', 'group', 'subscription', 'transaction'
    reported_entity_id UUID NOT NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    dispute_type TEXT NOT NULL, -- 'payment', 'access', 'quality', 'behavior'
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'investigating', 'resolved', 'rejected')),
    resolution_note TEXT,
    resolved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    evidence_required BOOLEAN DEFAULT FALSE,
    resolution_deadline TIMESTAMP WITH TIME ZONE,
    refund_amount FLOAT,
    refund_status TEXT CHECK (refund_status IN ('pending', 'processing', 'completed', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dispute comments table
CREATE TABLE dispute_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dispute evidence table
CREATE TABLE dispute_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    evidence_type TEXT NOT NULL, -- 'text', 'screenshot', 'document'
    content TEXT NOT NULL, -- URL or text content
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add missing foreign keys
ALTER TABLE security_logs 
ADD CONSTRAINT fk_security_logs_user_profiles 
FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;

ALTER TABLE device_fingerprints 
ADD CONSTRAINT fk_device_fingerprints_user_profiles 
FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- Data validation constraints
ALTER TABLE user_profiles ADD CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$');
ALTER TABLE user_profiles ADD CONSTRAINT valid_phone CHECK (phone_number IS NULL OR phone_number ~* '^\+[0-9]{1,3}[0-9]{6,14}$');
ALTER TABLE group_subs ADD CONSTRAINT valid_price CHECK (price_per_slot > 0 AND price_per_slot < 10000);
ALTER TABLE group_subs ADD CONSTRAINT valid_slots CHECK (slots_available >= 0 AND slots_available <= slots_total);
ALTER TABLE access_tokens ADD CONSTRAINT valid_expiry CHECK (expires_at > created_at);
ALTER TABLE disputes ADD CONSTRAINT valid_resolution_deadline CHECK (resolution_deadline IS NULL OR resolution_deadline > created_at);
ALTER TABLE disputes ADD CONSTRAINT valid_refund_amount CHECK (refund_amount IS NULL OR refund_amount >= 0);

-- Create function and trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables with this column
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON groups
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_group_subs_updated_at
BEFORE UPDATE ON group_subs
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_access_instructions_updated_at
BEFORE UPDATE ON access_instructions
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_purchase_records_updated_at
BEFORE UPDATE ON purchase_records
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_subscription_platforms_updated_at
BEFORE UPDATE ON subscription_platforms
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_message_threads_updated_at
BEFORE UPDATE ON message_threads
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_group_invitations_updated_at
BEFORE UPDATE ON group_invitations
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at
BEFORE UPDATE ON disputes
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();