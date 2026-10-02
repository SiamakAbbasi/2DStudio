CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'OWNER')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  description text,
  project_data jsonb NOT NULL,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_opened_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE INDEX IF NOT EXISTS projects_user_updated_idx ON projects(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS donation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_title text NOT NULL DEFAULT 'Support 2D Flip Studio',
  goal_description text NOT NULL DEFAULT 'Help support continued development of 2D Flip Studio.',
  goal_icon text,
  current_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  goal_amount numeric(12,2) NOT NULL DEFAULT 1000 CHECK (goal_amount > 0),
  currency varchar(3) NOT NULL DEFAULT 'EUR',
  paypal_url text NOT NULL DEFAULT '',
  quick_amounts jsonb NOT NULL DEFAULT '[3,5,10,25]'::jsonb,
  allow_custom_amount boolean NOT NULL DEFAULT true,
  show_progress boolean NOT NULL DEFAULT true,
  is_visible boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO donation_settings (is_visible)
SELECT false WHERE NOT EXISTS (SELECT 1 FROM donation_settings);

CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

