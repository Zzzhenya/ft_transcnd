-- Add default admin user
-- Migration: 003_add_admin_user.sql

-- Create admin user (password: admin123)
-- Hash generated with: bcrypt.hash('admin123', 10)
INSERT INTO users (username, email, password, created_at) VALUES 
('admin', 'admin@transcendence.local', '$2b$10$rOzWz8VN1aG2YjjFO.hMEeBU0NV1YWF1XdQPm6.TpqRMqGGk6qM6K', NOW())
ON CONFLICT (username) DO NOTHING;

-- Create a test user for development
INSERT INTO users (username, email, password, created_at) VALUES 
('testuser', 'test@example.com', '$2b$10$rOzWz8VN1aG2YjjFO.hMEeBU0NV1YWF1XdQPm6.TpqRMqGGk6qM6K', NOW())
ON CONFLICT (username) DO NOTHING;

-- Log successful admin creation
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE username = 'admin') THEN
        RAISE NOTICE 'Admin user created successfully (username: admin, password: admin123)';
    END IF;
END $$;