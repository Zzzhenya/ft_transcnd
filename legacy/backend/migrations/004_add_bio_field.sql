-- Migration 004: Add bio field to users table
-- File: backend/migrations/004_add_bio_field.sql

-- Add bio field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add index for better performance on bio searches (optional)
-- CREATE INDEX IF NOT EXISTS idx_users_bio ON users USING gin(to_tsvector('english', bio));

-- Update the updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure the trigger exists on users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();