-- Supabase Schema for IT Operations App

-- 1. App Users
CREATE TABLE IF NOT EXISTS app_users (
  uid UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  display_name TEXT,
  photo_url TEXT,
  role TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. System Config
CREATE TABLE IF NOT EXISTS system_config (
  id TEXT PRIMARY KEY,
  departments JSONB DEFAULT '[]',
  locations JSONB DEFAULT '[]',
  asset_categories JSONB DEFAULT '[]',
  pass_labels JSONB DEFAULT '[]',
  branches JSONB DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT PRIMARY KEY,
  allowed_menus JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Password Vault
CREATE TABLE IF NOT EXISTS password_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT,
  account TEXT,
  value TEXT,
  branch TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  description TEXT,
  priority TEXT,
  status TEXT,
  type TEXT,
  department TEXT,
  location TEXT,
  branch TEXT,
  assignee TEXT,
  requester_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- 6. Assets
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT,
  name TEXT,
  category TEXT,
  status TEXT,
  department TEXT,
  location TEXT,
  branch TEXT,
  assignee TEXT,
  purchase_date DATE,
  specs TEXT,
  parent_id UUID REFERENCES assets(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Asset Counters
CREATE TABLE IF NOT EXISTS asset_counters (
  id TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Backups
CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system TEXT,
  status TEXT,
  size TEXT,
  notes TEXT,
  date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. CCTV Requests
CREATE TABLE IF NOT EXISTS cctv_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose TEXT,
  date DATE,
  time_range TEXT,
  status TEXT,
  requester TEXT,
  reviewer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Content Plans
CREATE TABLE IF NOT EXISTS content_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT,
  type TEXT,
  topic TEXT,
  status TEXT,
  publish_date DATE,
  assignee TEXT,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Renewals
CREATE TABLE IF NOT EXISTS renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item TEXT,
  type TEXT,
  expiry_date DATE,
  cost NUMERIC,
  status TEXT,
  order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item TEXT,
  reason TEXT,
  estimated_cost NUMERIC,
  status TEXT,
  requester TEXT,
  approver TEXT,
  request_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Meeting Minutes
CREATE TABLE IF NOT EXISTS meeting_minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  date DATE,
  type TEXT,
  attendees JSONB DEFAULT '[]',
  agendas JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  decisions JSONB DEFAULT '[]',
  status TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Daily Logs
CREATE TABLE IF NOT EXISTS daily_logs (
  id TEXT PRIMARY KEY,
  date DATE,
  user_id TEXT,
  tasks JSONB DEFAULT '{}',
  custom_tasks JSONB DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Weekly Logs
CREATE TABLE IF NOT EXISTS weekly_logs (
  id TEXT PRIMARY KEY,
  week TEXT,
  user_id TEXT,
  tasks JSONB DEFAULT '{}',
  custom_tasks JSONB DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Monthly Logs
CREATE TABLE IF NOT EXISTS monthly_logs (
  id TEXT PRIMARY KEY,
  month TEXT,
  user_id TEXT,
  tasks JSONB DEFAULT '{}',
  custom_tasks JSONB DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Activities
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT,
  user_name TEXT,
  action TEXT,
  department TEXT,
  details TEXT
);

-- 18. Task Evidence
CREATE TABLE IF NOT EXISTS task_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT,
  log_id TEXT,
  image_url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT,
  user_name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. Employees
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT,
  skills JSONB DEFAULT '[]',
  department TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime for all tables
alter publication supabase_realtime add table app_users;
alter publication supabase_realtime add table system_config;
alter publication supabase_realtime add table role_permissions;
alter publication supabase_realtime add table password_vault;
alter publication supabase_realtime add table tickets;
alter publication supabase_realtime add table assets;
alter publication supabase_realtime add table backups;
alter publication supabase_realtime add table cctv_requests;
alter publication supabase_realtime add table content_plans;
alter publication supabase_realtime add table renewals;
alter publication supabase_realtime add table purchases;
alter publication supabase_realtime add table meeting_minutes;
alter publication supabase_realtime add table daily_logs;
alter publication supabase_realtime add table weekly_logs;
alter publication supabase_realtime add table monthly_logs;
alter publication supabase_realtime add table activities;
alter publication supabase_realtime add table task_evidence;
alter publication supabase_realtime add table employees;
