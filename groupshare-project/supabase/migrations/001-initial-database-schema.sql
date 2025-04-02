-- GroupShare Initial Schema
-- This script creates the basic database structure for the GroupShare application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable CRYPTO extension for encryption functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean up if needed (for development only, remove in production)
-- DROP TABLE IF EXISTS ratings;
-- DROP TABLE IF EXISTS access_tokens;
-- DROP TABLE IF EXISTS transactions;
-- DROP TABLE IF EXISTS applications;
-- DROP TABLE IF EXISTS access_instructions;
-- DROP TABLE IF EXISTS encryption_keys;
-- DROP TABLE IF EXISTS group_subs;
-- DROP TABLE IF EXISTS group_members;
-- DROP TABLE IF EXISTS groups;
-- DROP TABLE IF EXISTS user_profiles;
-- DROP TABLE IF EXISTS subscription_platforms;
-- DROP TABLE IF EXISTS security_logs;
-- DROP TABLE IF EXISTS device_fingerprints;

-- Create security_logs table for audit trail
CREATE TABLE security_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
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
    invited_by UUID REFERENCES user_profiles(id),
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
    platform_id UUID NOT NULL REFERENCES subscription_platforms(id),
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'full')),
    slots_total INTEGER NOT NULL,
    slots_available INTEGER NOT NULL,
    price_per_slot FLOAT NOT NULL,
    currency TEXT DEFAULT 'PLN',
    instant_access BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create access instructions table (for encrypted instructions)
CREATE TABLE access_instructions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_sub_id UUID NOT NULL REFERENCES group_subs(id) ON DELETE CASCADE,
    encrypted_data TEXT NOT NULL,
    data_key_enc TEXT NOT NULL,
    encryption_key_id UUID NOT NULL REFERENCES encryption_keys(id),
    iv TEXT NOT NULL,
    encryption_version TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create applications table
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    group_sub_id UUID NOT NULL REFERENCES group_subs(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'problem', 'cancelled')),
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
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
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
    buyer_id UUID NOT NULL REFERENCES user_profiles(id),
    seller_id UUID NOT NULL REFERENCES user_profiles(id),
    group_sub_id UUID NOT NULL REFERENCES group_subs(id),
    application_id UUID NOT NULL REFERENCES applications(id),
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
    rater_id UUID NOT NULL REFERENCES user_profiles(id),
    rated_id UUID NOT NULL REFERENCES user_profiles(id),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    access_quality INTEGER CHECK (access_quality BETWEEN 1 AND 5),
    communication INTEGER CHECK (communication BETWEEN 1 AND 5),
    reliability INTEGER CHECK (reliability BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (rater_id, transaction_id)
);

-- Add indexes for better performance
CREATE INDEX idx_user_profiles_external_auth_id ON user_profiles(external_auth_id);
CREATE INDEX idx_user_profiles_profile_type ON user_profiles(profile_type);
CREATE INDEX idx_groups_owner_id ON groups(owner_id);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_subs_group_id ON group_subs(group_id);
CREATE INDEX idx_group_subs_platform_id ON group_subs(platform_id);
CREATE INDEX idx_group_subs_status ON group_subs(status);
CREATE INDEX idx_access_instructions_group_sub_id ON access_instructions(group_sub_id);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_group_sub_id ON applications(group_sub_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_access_tokens_application_id ON access_tokens(application_id);
CREATE INDEX idx_access_tokens_token_hash ON access_tokens(token_hash);
CREATE INDEX idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller_id ON transactions(seller_id);
CREATE INDEX idx_transactions_application_id ON transactions(application_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_ratings_rater_id ON ratings(rater_id);
CREATE INDEX idx_ratings_rated_id ON ratings(rated_id);
CREATE INDEX idx_ratings_transaction_id ON ratings(transaction_id);
CREATE INDEX idx_encryption_keys_active ON encryption_keys(active);
CREATE INDEX idx_encryption_keys_related_id ON encryption_keys(related_id);
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX idx_security_logs_action_type ON security_logs(action_type);
CREATE INDEX idx_security_logs_resource_type_id ON security_logs(resource_type, resource_id);
CREATE INDEX idx_device_fingerprints_user_id ON device_fingerprints(user_id);
CREATE INDEX idx_device_fingerprints_fingerprint ON device_fingerprints(fingerprint);

-- Compound indexes for common query patterns
CREATE INDEX idx_group_members_group_user ON group_members(group_id, user_id);
CREATE INDEX idx_applications_user_status ON applications(user_id, status);
CREATE INDEX idx_applications_group_sub_status ON applications(group_sub_id, status);
CREATE INDEX idx_transactions_buyer_status ON transactions(buyer_id, status);
CREATE INDEX idx_transactions_seller_status ON transactions(seller_id, status);
CREATE INDEX idx_security_logs_user_action ON security_logs(user_id, action_type);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

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

CREATE TRIGGER update_applications_updated_at
BEFORE UPDATE ON applications
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_subscription_platforms_updated_at
BEFORE UPDATE ON subscription_platforms
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();