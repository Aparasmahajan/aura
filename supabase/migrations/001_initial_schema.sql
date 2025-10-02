/*
  # Multi-Portal Application Initial Schema

  1. New Tables
    - `portals`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Portal name used in URL path
      - `display_name` (text) - Human-readable portal name
      - `description` (text)
      - `logo_url` (text)
      - `banner_url` (text)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `users`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `email` (text, unique)
      - `password_hash` (text)
      - `role` (text) - 'super', 'admin', or 'user'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `portal_admins`
      - `id` (uuid, primary key)
      - `portal_id` (uuid, foreign key to portals)
      - `user_id` (uuid, foreign key to users)
      - `created_at` (timestamptz)

    - `folders`
      - `id` (uuid, primary key)
      - `portal_id` (uuid, foreign key to portals)
      - `parent_id` (uuid, nullable, self-referencing for subfolders)
      - `name` (text)
      - `description` (text)
      - `created_by` (uuid, foreign key to users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `folder_permissions`
      - `id` (uuid, primary key)
      - `folder_id` (uuid, foreign key to folders)
      - `user_id` (uuid, foreign key to users)
      - `can_edit` (boolean, default false)
      - `can_view` (boolean, default true)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on roles and permissions
*/

-- Create portals table
CREATE TABLE IF NOT EXISTS portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text DEFAULT '',
  logo_url text DEFAULT '',
  banner_url text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table (for portal authentication)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('super', 'admin', 'user')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create portal_admins junction table
CREATE TABLE IF NOT EXISTS portal_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(portal_id, user_id)
);

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create folder_permissions table
CREATE TABLE IF NOT EXISTS folder_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_edit boolean DEFAULT false,
  can_view boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(folder_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_permissions ENABLE ROW LEVEL SECURITY;

-- Portals policies: Anyone can view active portals
CREATE POLICY "Anyone can view active portals"
  ON portals FOR SELECT
  USING (is_active = true);

CREATE POLICY "Super users can insert portals"
  ON portals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super'
    )
  );

CREATE POLICY "Super users can update portals"
  ON portals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super'
    )
  );

-- Users policies: Users can view their own data
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Super users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super'
    )
  );

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Portal admins policies
CREATE POLICY "Portal admins can view assignments"
  ON portal_admins FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super'
    )
  );

CREATE POLICY "Super users can manage portal admins"
  ON portal_admins FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super'
    )
  );

CREATE POLICY "Super users can delete portal admins"
  ON portal_admins FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super'
    )
  );

-- Folders policies: Users can view folders they have permission to
CREATE POLICY "Users can view folders with permissions"
  ON folders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM folder_permissions
      WHERE folder_permissions.folder_id = folders.id
      AND folder_permissions.user_id = auth.uid()
      AND folder_permissions.can_view = true
    ) OR
    EXISTS (
      SELECT 1 FROM portal_admins
      WHERE portal_admins.portal_id = folders.portal_id
      AND portal_admins.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super'
    )
  );

CREATE POLICY "Portal admins can create folders"
  ON folders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portal_admins
      WHERE portal_admins.portal_id = folders.portal_id
      AND portal_admins.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super'
    )
  );

CREATE POLICY "Users with edit permission can update folders"
  ON folders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM folder_permissions
      WHERE folder_permissions.folder_id = folders.id
      AND folder_permissions.user_id = auth.uid()
      AND folder_permissions.can_edit = true
    ) OR
    EXISTS (
      SELECT 1 FROM portal_admins
      WHERE portal_admins.portal_id = folders.portal_id
      AND portal_admins.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM folder_permissions
      WHERE folder_permissions.folder_id = folders.id
      AND folder_permissions.user_id = auth.uid()
      AND folder_permissions.can_edit = true
    ) OR
    EXISTS (
      SELECT 1 FROM portal_admins
      WHERE portal_admins.portal_id = folders.portal_id
      AND portal_admins.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super'
    )
  );

-- Folder permissions policies
CREATE POLICY "Users can view their own folder permissions"
  ON folder_permissions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM folders
      JOIN portal_admins ON portal_admins.portal_id = folders.portal_id
      WHERE folders.id = folder_permissions.folder_id
      AND portal_admins.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super'
    )
  );

CREATE POLICY "Portal admins can manage folder permissions"
  ON folder_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM folders
      JOIN portal_admins ON portal_admins.portal_id = folders.portal_id
      WHERE folders.id = folder_permissions.folder_id
      AND portal_admins.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super'
    )
  );

CREATE POLICY "Portal admins can update folder permissions"
  ON folder_permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM folders
      JOIN portal_admins ON portal_admins.portal_id = folders.portal_id
      WHERE folders.id = folder_permissions.folder_id
      AND portal_admins.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM folders
      JOIN portal_admins ON portal_admins.portal_id = folders.portal_id
      WHERE folders.id = folder_permissions.folder_id
      AND portal_admins.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super'
    )
  );

CREATE POLICY "Portal admins can delete folder permissions"
  ON folder_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM folders
      JOIN portal_admins ON portal_admins.portal_id = folders.portal_id
      WHERE folders.id = folder_permissions.folder_id
      AND portal_admins.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portals_name ON portals(name);
CREATE INDEX IF NOT EXISTS idx_portals_is_active ON portals(is_active);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_portal_admins_portal_id ON portal_admins(portal_id);
CREATE INDEX IF NOT EXISTS idx_portal_admins_user_id ON portal_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_portal_id ON folders(portal_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folder_permissions_folder_id ON folder_permissions(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_permissions_user_id ON folder_permissions(user_id);
