-- Migration script to move from dual-model to instant-access-only model
-- This script should be run before deploying the new schema

BEGIN;

-- 1. First ensure all completed purchases have access provided
UPDATE purchase_records
SET 
    access_provided = TRUE,
    access_provided_at = CASE 
        WHEN access_provided_at IS NULL THEN CURRENT_TIMESTAMP 
        ELSE access_provided_at 
    END
WHERE 
    status = 'completed' 
    AND access_provided = FALSE;

-- 2. Add initial access instructions for all subscriptions that don't have them
-- First, identify group_subs that don't have access_instructions
CREATE TEMPORARY TABLE missing_instructions AS
SELECT 
    gs.id AS group_sub_id, 
    g.owner_id
FROM 
    group_subs gs
LEFT JOIN 
    access_instructions ai ON gs.id = ai.group_sub_id
JOIN
    groups g ON gs.group_id = g.id
WHERE 
    ai.id IS NULL;

-- 3. Create a prompt or notification to administrators about missing instructions
INSERT INTO notifications (
    user_id,
    type,
    title,
    content,
    related_entity_type,
    related_entity_id,
    is_read
)
SELECT 
    owner_id,
    'admin',
    'Action Required: Missing Access Instructions',
    'Your subscription offers have been migrated to immediate access model. Please add access instructions for all your subscription offers.',
    'group_sub',
    group_sub_id,
    FALSE
FROM 
    missing_instructions;

-- 4. Drop instant_access column if it exists
DO $$
BEGIN
    IF EXISTS(
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'group_subs' AND column_name = 'instant_access'
    ) THEN
        ALTER TABLE group_subs DROP COLUMN instant_access;
    END IF;
END $$;

-- 5. Update any references to instant_access in views or functions
-- This is a placeholder - you should identify specific views/functions that reference this column
-- and update them accordingly

-- For example, if there's a view that depends on instant_access:
-- CREATE OR REPLACE VIEW subscription_stats AS
-- SELECT ... (without instant_access column)

-- 6. Clean up any temporary data
DROP TABLE IF EXISTS missing_instructions;

-- Log the migration
INSERT INTO security_logs (
    action_type,
    resource_type,
    resource_id,
    status,
    details
) VALUES (
    'schema_migration',
    'database',
    'instant_access_removal',
    'success',
    jsonb_build_object(
        'description', 'Migrated from dual-model to instant-access-only model',
        'timestamp', CURRENT_TIMESTAMP
    )
);

COMMIT;