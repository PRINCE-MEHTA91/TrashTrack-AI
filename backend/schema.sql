CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'citizen',
  profile_image TEXT,
  phone_number VARCHAR(20),
  address TEXT,
  is_email_verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(email, role)
);
