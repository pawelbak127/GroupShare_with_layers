-- Seed data for GroupShare
-- This script inserts initial data for development and testing

-- Generate encryption keys for development (in production, this would be handled securely)
-- DO NOT hardcode encryption keys in production
DO $$
DECLARE
    master_key_id UUID;
BEGIN
    -- Insert a master encryption key
    INSERT INTO encryption_keys (
        key_type,
        public_key,
        private_key_enc,
        active
    ) VALUES (
        'master',
        'dummy_public_key_for_development', -- In production, these would be proper RSA/ECC keys
        'dummy_encrypted_private_key_for_development',
        true
    ) RETURNING id INTO master_key_id;
END $$;

-- Insert subscription platforms
INSERT INTO subscription_platforms (id, name, description, icon, max_members, requirements_text, requirements_icon, pricing, active) VALUES
(
  '11111111-1111-1111-1111-111111111111', 
  'Microsoft 365 Family', 
  'Microsoft 365 subscriptions for up to 6 people with premium Office apps, 1TB of cloud storage per person, and advanced security features.',
  'microsoft-365.svg',
  6,
  'Elastyczne zasady - brak wymogu wspólnego adresu',
  '✨',
  '{
    "monthly": 29.99,
    "yearly": 299.99,
    "currency": "PLN",
    "perUser": false
  }'::jsonb,
  true
),
(
  '22222222-2222-2222-2222-222222222222', 
  'Nintendo Switch Online Family', 
  'Nintendo Switch Online membership with access to online play, classic games, and other features for up to 8 accounts.',
  'nintendo-switch.svg',
  8,
  'Elastyczne zasady - brak wymogu wspólnego adresu',
  '✨',
  '{
    "monthly": null,
    "yearly": 149.00,
    "currency": "PLN",
    "perUser": false
  }'::jsonb,
  true
),
(
  '33333333-3333-3333-3333-333333333333', 
  'YouTube Premium Family', 
  'Ad-free YouTube experience with background play, downloads, and YouTube Music Premium for up to 5 family members living in the same household.',
  'youtube-premium.svg',
  6,
  'Standardowe zasady - wymagany wspólny adres',
  '🏠',
  '{
    "monthly": 29.99,
    "yearly": null,
    "currency": "PLN",
    "perUser": false
  }'::jsonb,
  true
),
(
  '44444444-4444-4444-4444-444444444444', 
  'Spotify Family', 
  'Premium accounts for up to 6 family members living at the same address with ad-free music, group playlists, and parental controls.',
  'spotify.svg',
  6,
  'Wymagające zasady - aktywna weryfikacja adresu',
  '🏠',
  '{
    "monthly": 29.99,
    "yearly": null,
    "currency": "PLN",
    "perUser": false
  }'::jsonb,
  true
),
(
  '55555555-5555-5555-5555-555555555555', 
  'Netflix Standard', 
  'Watch in Full HD on two devices at once with option to add members who don\'t live with you for an additional fee.',
  'netflix.svg',
  2,
  'Wymagające zasady - aktywna weryfikacja adresu',
  '🏠',
  '{
    "monthly": 49.99,
    "yearly": null,
    "currency": "PLN",
    "perUser": false
  }'::jsonb,
  true
),
(
  '66666666-6666-6666-6666-666666666666', 
  'Apple One Family', 
  'Bundle of Apple services including Apple Music, Apple TV+, Apple Arcade, and iCloud+ for up to 6 family members.',
  'apple-one.svg',
  6,
  'Standardowe zasady - wymagane Family Sharing',
  '✓',
  '{
    "monthly": 54.99,
    "yearly": null,
    "currency": "PLN",
    "perUser": false
  }'::jsonb,
  true
),
(
  '77777777-7777-7777-7777-777777777777', 
  'NordVPN', 
  'Secure VPN service with malware protection and ad-blocking for multiple devices.',
  'nordvpn.svg',
  6,
  'Elastyczne zasady - brak weryfikacji',
  '✨',
  '{
    "monthly": 46.00,
    "yearly": 299.00,
    "currency": "PLN",
    "perUser": false
  }'::jsonb,
  true
);

-- Create test users (in a real app, users would be created through auth system)
-- For testing, we're creating some sample users
INSERT INTO user_profiles (id, external_auth_id, display_name, email, phone_number, profile_type, verification_level, bio, avatar_url, rating_avg, rating_count, is_premium) VALUES
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'mock_auth_id_1',
  'Michał Kowalski',
  'michal.k@example.com',
  '+48123456789',
  'both',
  'verified',
  'Programista i entuzjasta nowych technologii. Dzielę się subskrypcjami od lat.',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Michał',
  4.8,
  24,
  true
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'mock_auth_id_2',
  'Anna Nowak',
  'anna.n@example.com',
  '+48987654321',
  'buyer',
  'basic',
  'Studentka szukająca oszczędności na subskrypcjach cyfrowych.',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Anna',
  4.5,
  8,
  false
),
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'mock_auth_id_3',
  'Piotr Wiśniewski',
  'piotr.w@example.com',
  '+48555666777',
  'seller',
  'trusted',
  'Manager IT. Zawsze mam wolne miejsca w subskrypcjach rodzinnych.',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Piotr',
  4.9,
  56,
  true
),
(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'mock_auth_id_4',
  'Magda Lewandowska',
  'magda.l@example.com',
  '+48777888999',
  'both',
  'verified',
  'Projektantka UX/UI. Zarządzam subskrypcjami dla mojej rodziny.',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Magda',
  4.7,
  32,
  true
),
(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'mock_auth_id_5',
  'Tomasz Jankowski',
  'tomasz.j@example.com',
  '+48111222333',
  'buyer',
  'basic',
  'Szukam dobrej oferty na Microsoft 365 i Spotify.',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Tomasz',
  4.2,
  5,
  false
);

-- Create sample groups
INSERT INTO groups (id, name, description, owner_id) VALUES
(
  '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Współlokatorzy Wrocław',
  'Grupa dla współlokatorów z mieszkania we Wrocławiu - dzielimy się subskrypcjami.',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
),
(
  '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Rodzina Wiśniewskich',
  'Grupa rodzinna do zarządzania naszymi wspólnymi subskrypcjami.',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
),
(
  '33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Zespół projektowy ACME',
  'Grupa dla zespołu projektowego - współdzielone subskrypcje biznesowe.',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
);

-- Add members to groups (owners are added automatically by trigger)
INSERT INTO group_members (group_id, user_id, role, status, invited_by, joined_at) VALUES
(
  '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'member',
  'active',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  NOW() - INTERVAL '10 days'
),
(
  '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'member',
  'active',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  NOW() - INTERVAL '5 days'
),
(
  '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'member',
  'active',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  NOW() - INTERVAL '15 days'
),
(
  '33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'admin',
  'active',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  NOW() - INTERVAL '20 days'
);

-- Create encryption keys for group subscriptions
DO $$
DECLARE
    key_id1 UUID;
    key_id2 UUID;
    key_id3 UUID;
BEGIN
    -- Generate encryption keys for each group subscription that needs it
    -- In production, these would be secure RSA or ECC keys
    
    -- Key for Microsoft 365 subscription
    INSERT INTO encryption_keys (
        key_type,
        public_key,
        private_key_enc,
        related_id,
        active
    ) VALUES (
        'group',
        'dummy_public_key_1', -- In production, this would be a real public key
        'dummy_encrypted_private_key_1', -- In production, this would be encrypted with a master key
        'sub11111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        true
    ) RETURNING id INTO key_id1;
    
    -- Key for Apple One subscription
    INSERT INTO encryption_keys (
        key_type,
        public_key,
        private_key_enc,
        related_id,
        active
    ) VALUES (
        'group',
        'dummy_public_key_2',
        'dummy_encrypted_private_key_2',
        'sub33333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        true
    ) RETURNING id INTO key_id2;
    
    -- Key for NordVPN subscription
    INSERT INTO encryption_keys (
        key_type,
        public_key,
        private_key_enc,
        related_id,
        active
    ) VALUES (
        'group',
        'dummy_public_key_3',
        'dummy_encrypted_private_key_3',
        'sub55555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        true
    ) RETURNING id INTO key_id3;
END $$;

-- Create subscription offers
INSERT INTO group_subs (id, group_id, platform_id, status, slots_total, slots_available, price_per_slot, currency, instant_access) VALUES
(
  'sub11111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111', -- Microsoft 365
  'active',
  6,
  3,
  25.00,
  'PLN',
  true
),
(
  'sub22222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '33333333-3333-3333-3333-333333333333', -- YouTube Premium
  'active',
  6,
  4,
  20.00,
  'PLN',
  false
),
(
  'sub33333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '66666666-6666-6666-6666-666666666666', -- Apple One
  'active',
  6,
  2,
  30.00,
  'PLN',
  true
),
(
  'sub44444-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '44444444-4444-4444-4444-444444444444', -- Spotify
  'active',
  6,
  2,
  25.00,
  'PLN',
  false
),
(
  'sub55555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '77777777-7777-7777-7777-777777777777', -- NordVPN
  'active',
  6,
  4,
  20.00,
  'PLN',
  true
);

-- Add access instructions for offers with instant_access
INSERT INTO access_instructions (
    group_sub_id, 
    encrypted_data, 
    data_key_enc, 
    encryption_key_id, 
    iv, 
    encryption_version
) VALUES 
(
    'sub11111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'dummy_encrypted_data_for_microsoft365', -- In production, this would be real encrypted data
    'dummy_encrypted_key', 
    (SELECT id FROM encryption_keys WHERE related_id = 'sub11111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    'dummy_iv',
    '1.0'
),
(
    'sub33333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'dummy_encrypted_data_for_appleone',
    'dummy_encrypted_key',
    (SELECT id FROM encryption_keys WHERE related_id = 'sub33333-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    'dummy_iv',
    '1.0'
),
(
    'sub55555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'dummy_encrypted_data_for_nordvpn',
    'dummy_encrypted_key',
    (SELECT id FROM encryption_keys WHERE related_id = 'sub55555-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    'dummy_iv',
    '1.0'
);

-- Create some sample applications
INSERT INTO applications (id, user_id, group_sub_id, message, status) VALUES
(
  'app11111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'sub11111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Chciałbym dołączyć do subskrypcji Microsoft 365. Będę korzystać głównie z Worda i Excela.',
  'accepted'
),
(
  'app22222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'sub33333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Jestem zainteresowana dołączeniem do Apple One, mam iPhone\'a i iPada.',
  'pending'
),
(
  'app33333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'sub44444-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Chętnie dołączę do Spotify Family, dużo słucham muzyki.',
  'completed'
);

-- Create some sample transactions
SELECT create_transaction(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', -- buyer
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- seller
  'sub11111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- group_sub
  'app11111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- application
  300.00, -- amount (annual)
  0.05, -- platform fee percentage
  'card', -- payment method
  'stripe', -- payment provider
  'mock_payment_id_1' -- payment id
);

SELECT create_transaction(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', -- buyer
  'cccccccc-cccc-cccc-cccc-cccccccccccc', -- seller
  'sub44444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- group_sub
  'app33333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- application
  25.00, -- amount (monthly)
  0.05, -- platform fee percentage
  'blik', -- payment method
  'payu', -- payment provider
  'mock_payment_id_2' -- payment id
);

-- Complete one transaction
SELECT complete_transaction(
  (SELECT id FROM transactions WHERE application_id = 'app33333-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'completed'
);

-- Add some ratings
INSERT INTO ratings (rater_id, rated_id, transaction_id, access_quality, communication, reliability, comment) VALUES
(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', -- rater
  'cccccccc-cccc-cccc-cccc-cccccccccccc', -- rated
  (SELECT id FROM transactions WHERE application_id = 'app33333-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- transaction
  5, -- access quality
  4, -- communication
  5, -- reliability
  'Szybko i sprawnie, dostęp działa bez problemów.'
);

INSERT INTO ratings (rater_id, rated_id, transaction_id, access_quality, communication, reliability, comment) VALUES
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc', -- rater
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', -- rated
  (SELECT id FROM transactions WHERE application_id = 'app33333-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- transaction
  5, -- access quality
  5, -- communication
  5, -- reliability
  'Wzorowy członek grupy, płatność na czas.'
);