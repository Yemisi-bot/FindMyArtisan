import bcrypt from 'bcryptjs';
import pool from '../config/database';

// ─── Schema-only SQL (always runs) ─────────────────────────────────────────
const schemaSql = `
-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'provider')),
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service categories
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(50) NOT NULL,
  description TEXT
);

-- Service providers
CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES service_categories(id),
  description TEXT,
  phone VARCHAR(20) NOT NULL,
  address VARCHAR(500) NOT NULL,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  profile_image VARCHAR(500),
  is_verified BOOLEAN DEFAULT false,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spatial index for proximity queries
CREATE INDEX IF NOT EXISTS idx_providers_location ON providers USING GIST (location);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider_id, user_id)
);

-- ─── Email verification (OTP) ───────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP WITH TIME ZONE;

-- ─── Provider suspension ────────────────────────────────────────────────────
-- New visibility model: artisans are auto-visible once their email is verified
-- and they have the minimum work photos. Admins no longer approve each one;
-- instead they can SUSPEND an artisan to hide them. is_suspended defaults to
-- false so every existing/new artisan is visible by default.
ALTER TABLE providers ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- ─── Work images (artisan catalog) — min 3 required for visibility ─────────
CREATE TABLE IF NOT EXISTS work_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  caption VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_work_images_provider ON work_images (provider_id);

-- ─── Review photos (proof of work) ──────────────────────────────────────────
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- ─── Contact clicks: who revealed whose number (enables later reviews) ──────
CREATE TABLE IF NOT EXISTS contact_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider_id)
);
CREATE INDEX IF NOT EXISTS idx_contact_clicks_user ON contact_clicks (user_id);

-- ─── Search history ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category_slug VARCHAR(100),
  search_term VARCHAR(255),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history (user_id, created_at DESC);

-- Admin audit logs
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed service categories (idempotent)
INSERT INTO service_categories (name, slug, icon, description) VALUES
  ('Electrician', 'electrician', '⚡', 'Electrical wiring, repairs, installations, and maintenance services'),
  ('Plumber', 'plumber', '🔧', 'Pipe installations, leak repairs, water system maintenance'),
  ('Carpenter', 'carpenter', '🪚', 'Furniture making, woodwork, repairs, and custom carpentry'),
  ('Painter', 'painter', '🎨', 'Interior and exterior painting, wall finishing, and decoration'),
  ('Tiler', 'tiler', '📐', 'Floor and wall tiling, tile repairs, and waterproofing'),
  ('Welder', 'welder', '🔥', 'Metal fabrication, welding repairs, gates, and railings'),
  ('Generator Technician', 'generator-technician', '⚙️', 'Generator repairs, maintenance, and servicing'),
  ('General Repairs', 'general-repairs', '🛠️', 'General maintenance, handyman services, and minor repairs'),
  ('AC Technician', 'ac-technician', '❄️', 'Air conditioning installation, repairs, and maintenance'),
  ('Solar Installer', 'solar-installer', '☀️', 'Solar panel installation, inverter setup, and maintenance')
ON CONFLICT (slug) DO NOTHING;
`;

// ─── Sample data SQL (only when SEED_SAMPLE_DATA=true) ──────────────────────
const sampleDataSql = `
-- Seed sample provider users (password for all: artisan123)
INSERT INTO users (email, password_hash, full_name, role, phone)
SELECT s.email,
       '$2a$12$5vbvSYH37UO8yMxn8JwPges3YrbyAssLFEuMezhTAcPahzFQKmimK',
       s.full_name, 'provider', s.phone
FROM (VALUES
  ('brightspark@findmyartisan.com',  'Emeka Okafor',     '08030000001'),
  ('aquafix@findmyartisan.com',      'Tunde Bello',      '08030000002'),
  ('woodcraft@findmyartisan.com',    'Samuel Adeyemi',   '08030000003'),
  ('colorpro@findmyartisan.com',     'Grace Olawale',    '08030000004'),
  ('tileperfect@findmyartisan.com',  'Ibrahim Yusuf',    '08030000005'),
  ('ironworks@findmyartisan.com',    'Daniel Eze',       '08030000006'),
  ('powergen@findmyartisan.com',     'Femi Adebayo',     '08030000007'),
  ('coolair@findmyartisan.com',      'Chidi Nwosu',      '08030000008'),
  ('sunpower@findmyartisan.com',     'Aisha Mohammed',   '08030000009'),
  ('fixit@findmyartisan.com',        'Peter Johnson',    '08030000010')
) AS s(email, full_name, phone)
ON CONFLICT (email) DO NOTHING;

-- Seed sample providers around Federal Polytechnic Ilaro (~6.8886, 3.0145)
INSERT INTO providers
  (user_id, business_name, category_id, description, phone, address, location, is_verified, average_rating, review_count)
SELECT u.id, s.business_name, sc.id, s.description, s.phone, s.address,
       ST_SetSRID(ST_MakePoint(s.lng, s.lat), 4326)::geography,
       true, s.rating, s.reviews
FROM (VALUES
  ('brightspark@findmyartisan.com', 'Bright Spark Electricals', 'electrician',          'Licensed electrician for wiring, repairs and installations.',        '08030000001', '12 Oja-Odan Road, Ilaro',        3.0160::float8, 6.8895::float8, 4.8::numeric, 24),
  ('aquafix@findmyartisan.com',     'AquaFix Plumbing',          'plumber',              'Leak repairs, pipe fitting and water system maintenance.',           '08030000002', '5 Sango Street, Ilaro',          3.0120,         6.8870,         4.6,          18),
  ('woodcraft@findmyartisan.com',   'WoodCraft Carpentry',       'carpenter',            'Custom furniture, doors and quality woodwork.',                      '08030000003', '8 Poly Road, Ilaro',             3.0185,         6.8910,         4.9,          31),
  ('colorpro@findmyartisan.com',    'ColorPro Painters',         'painter',              'Interior and exterior painting and wall finishing.',                 '08030000004', '20 Idogo Road, Ilaro',           3.0200,         6.8860,         4.5,          12),
  ('tileperfect@findmyartisan.com', 'TilePerfect Tiling',        'tiler',                'Floor and wall tiling with clean waterproofing.',                    '08030000005', '3 Market Square, Ilaro',         3.0130,         6.8925,         4.7,          9),
  ('ironworks@findmyartisan.com',   'IronWorks Welding',         'welder',               'Gates, railings and metal fabrication.',                             '08030000006', '15 Owode Road, Ilaro',           3.0150,         6.8845,         4.4,          15),
  ('powergen@findmyartisan.com',    'PowerGen Technicians',      'generator-technician', 'Generator servicing, repairs and maintenance.',                      '08030000007', '7 Oke-Ola Street, Ilaro',        3.0095,         6.8905,         4.8,          27),
  ('coolair@findmyartisan.com',     'CoolAir AC Services',       'ac-technician',        'AC installation, gas refill and repairs.',                           '08030000008', '22 Pansheke Road, Ilaro',        3.0210,         6.8880,         4.6,          20),
  ('sunpower@findmyartisan.com',    'SunPower Solar',            'solar-installer',      'Solar panels, inverters and battery setups.',                        '08030000009', '9 Federal Layout, Ilaro',        3.0170,         6.8935,         4.9,          14),
  ('fixit@findmyartisan.com',       'FixIt Handyman',            'general-repairs',      'General home repairs and handyman services.',                        '08030000010', '4 Bishop Street, Ilaro',         3.0105,         6.8855,         4.3,          8)
) AS s(email, business_name, slug, description, phone, address, lng, lat, rating, reviews)
JOIN service_categories sc ON sc.slug = s.slug
JOIN users u ON u.email = s.email
WHERE NOT EXISTS (SELECT 1 FROM providers);

-- Mark all seed accounts as pre-verified (they skipped the OTP flow)
UPDATE users SET email_verified = true
WHERE email LIKE '%@findmyartisan.com' AND email_verified = false;

-- Seed 3 sample work images per seed provider so they meet the visibility rule
INSERT INTO work_images (provider_id, image_url, caption)
SELECT p.id,
       'https://picsum.photos/seed/' || substr(p.id::text, 1, 8) || '-' || n || '/640/480',
       'Sample of completed work #' || n
FROM providers p
CROSS JOIN generate_series(1, 3) AS n
JOIN users u ON p.user_id = u.id
WHERE u.email LIKE '%@findmyartisan.com'
  AND NOT EXISTS (SELECT 1 FROM work_images w WHERE w.provider_id = p.id);
`;

export async function runMigrations(): Promise<void> {
  const client = await pool().connect();
  try {
    // 1. Run schema + categories (always)
    console.log('[DB] Running schema migrations...');
    await client.query(schemaSql);
    console.log('[DB] Schema migrations completed');

    // 2. Create / update admin user from env vars
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@findmyartisan.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'System Administrator';

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, email_verified)
       VALUES ($1, $2, $3, 'admin', true)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             full_name    = EXCLUDED.full_name,
             email_verified = true`,
      [adminEmail, passwordHash, adminName]
    );
    console.log(`[DB] Admin user ensured: ${adminEmail}`);

    // 3. Seed sample data (only if SEED_SAMPLE_DATA=true)
    if (process.env.SEED_SAMPLE_DATA === 'true') {
      console.log('[DB] Seeding sample data...');
      await client.query(sampleDataSql);
      console.log('[DB] Sample data seeded');
    } else {
      console.log('[DB] Skipping sample data (set SEED_SAMPLE_DATA=true to enable)');
    }

    console.log('[DB] Migrations completed successfully');
  } catch (error: any) {
    // Ignore "already exists" errors during migration
    if (error.code === '42P07' || error.code === '42710') {
      console.log('[DB] Objects already exist, continuing...');
      return;
    }
    console.error('[DB] Migration error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run directly if called as script
if (require.main === module) {
  require('dotenv').config();
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
