-- ============================================================
-- Mājo App — Supabase Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- 1. PROFILES (linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  apt_number INT NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'RESIDENT' CHECK (role IN ('RESIDENT', 'MANAGER', 'ADMIN')),
  phone_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('info', 'meeting', 'maintenance', 'vote', 'emergency', 'new_request')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_emergency BOOLEAN NOT NULL DEFAULT false,
  emergency_status TEXT CHECK (emergency_status IN ('active', 'in_progress', 'resolved')),
  resolved_at TIMESTAMPTZ,
  target_roles TEXT[], -- e.g. ARRAY['RESIDENT', 'MANAGER']
  related_id TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. MEETINGS
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. AGENDA ITEMS (belongs to meeting)
CREATE TABLE agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

-- 5. MAINTENANCE TOPICS
CREATE TABLE maintenance_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'APPROVED', 'RESOLVED', 'REJECTED')),
  rejection_reason TEXT,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  apt_number INT NOT NULL,
  images TEXT[], -- URLs or base64 strings
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status_changed_at TIMESTAMPTZ -- set when status changes to RESOLVED or REJECTED
);

-- 6. MAINTENANCE COMMENTS
CREATE TABLE maintenance_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES maintenance_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  text TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. VOTES
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'YES_NO' CHECK (type IN ('YES_NO', 'MULTIPLE_CHOICE')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. VOTE OPTIONS
CREATE TABLE vote_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  text TEXT NOT NULL
);

-- 9. BALLOTS (one per apartment per vote)
CREATE TABLE ballots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  apt_number INT NOT NULL,
  user_id UUID REFERENCES profiles(id),
  option_ids TEXT[], -- selected option IDs
  selected_yes BOOLEAN,
  selected_option_id TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vote_id, apt_number)
);

-- 10. CHAT TOPICS
CREATE TABLE chat_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. CHAT MESSAGES
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES chat_topics(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_apt INT,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. ACTIVITY LOGS
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('maintenance', 'announcement', 'meeting', 'vote', 'chat')),
  message TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. HOUSE CONFIG (single-row app configuration)
CREATE TABLE house_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL DEFAULT '',
  total_apartments INT NOT NULL DEFAULT 24,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default row
INSERT INTO house_config (address, total_apartments) VALUES ('', 24);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_notifications_date ON notifications(date DESC);
CREATE INDEX idx_notifications_archived ON notifications(is_archived);
CREATE INDEX idx_maintenance_status ON maintenance_topics(status);
CREATE INDEX idx_maintenance_author ON maintenance_topics(author_id);
CREATE INDEX idx_comments_topic ON maintenance_comments(topic_id);
CREATE INDEX idx_ballots_vote ON ballots(vote_id);
CREATE INDEX idx_ballots_user ON ballots(user_id);
CREATE INDEX idx_chat_messages_topic ON chat_messages(topic_id);
CREATE INDEX idx_chat_topics_last_msg ON chat_topics(last_message_at DESC);
CREATE INDEX idx_activity_logs_date ON activity_logs(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_config ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES ----
CREATE POLICY "Profiles: read all" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Profiles: update own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Profiles: insert own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: admin update" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

CREATE POLICY "Profiles: admin delete" ON profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---- NOTIFICATIONS ----
CREATE POLICY "Notifications: read all" ON notifications
  FOR SELECT USING (true);

CREATE POLICY "Notifications: manager/admin insert" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

CREATE POLICY "Notifications: manager/admin update" ON notifications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

CREATE POLICY "Notifications: manager/admin delete" ON notifications
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

-- ---- MEETINGS ----
CREATE POLICY "Meetings: read all" ON meetings
  FOR SELECT USING (true);

CREATE POLICY "Meetings: manager/admin insert" ON meetings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

CREATE POLICY "Meetings: manager/admin update" ON meetings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

CREATE POLICY "Meetings: manager/admin delete" ON meetings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

-- ---- AGENDA ITEMS ----
CREATE POLICY "Agenda: read all" ON agenda_items
  FOR SELECT USING (true);

CREATE POLICY "Agenda: manager/admin insert" ON agenda_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

CREATE POLICY "Agenda: manager/admin update" ON agenda_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

CREATE POLICY "Agenda: manager/admin delete" ON agenda_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

-- ---- MAINTENANCE TOPICS ----
CREATE POLICY "Maintenance: read all" ON maintenance_topics
  FOR SELECT USING (true);

CREATE POLICY "Maintenance: insert authenticated" ON maintenance_topics
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Maintenance: update own or manager" ON maintenance_topics
  FOR UPDATE USING (
    author_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

CREATE POLICY "Maintenance: admin delete" ON maintenance_topics
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

-- ---- MAINTENANCE COMMENTS ----
CREATE POLICY "Comments: read all" ON maintenance_comments
  FOR SELECT USING (true);

CREATE POLICY "Comments: insert authenticated" ON maintenance_comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Comments: admin delete" ON maintenance_comments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

-- ---- VOTES ----
CREATE POLICY "Votes: read all" ON votes
  FOR SELECT USING (true);

CREATE POLICY "Votes: manager/admin insert" ON votes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

CREATE POLICY "Votes: manager/admin update" ON votes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

CREATE POLICY "Votes: manager/admin delete" ON votes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

-- ---- VOTE OPTIONS ----
CREATE POLICY "Vote options: read all" ON vote_options
  FOR SELECT USING (true);

CREATE POLICY "Vote options: manager/admin insert" ON vote_options
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

CREATE POLICY "Vote options: manager/admin update" ON vote_options
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

CREATE POLICY "Vote options: manager/admin delete" ON vote_options
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

-- ---- BALLOTS ----
CREATE POLICY "Ballots: read all" ON ballots
  FOR SELECT USING (true);

CREATE POLICY "Ballots: insert authenticated" ON ballots
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Ballots: manager/admin delete" ON ballots
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

-- ---- CHAT TOPICS ----
CREATE POLICY "Chat topics: read all" ON chat_topics
  FOR SELECT USING (true);

CREATE POLICY "Chat topics: insert authenticated" ON chat_topics
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Chat topics: update for last_message_at" ON chat_topics
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ---- CHAT MESSAGES ----
CREATE POLICY "Chat messages: read all" ON chat_messages
  FOR SELECT USING (true);

CREATE POLICY "Chat messages: insert authenticated" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ---- ACTIVITY LOGS ----
CREATE POLICY "Activity logs: read all" ON activity_logs
  FOR SELECT USING (true);

CREATE POLICY "Activity logs: insert authenticated" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ---- HOUSE CONFIG ----
CREATE POLICY "House config: read all" ON house_config
  FOR SELECT USING (true);

CREATE POLICY "House config: admin/manager insert" ON house_config
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

CREATE POLICY "House config: admin/manager update" ON house_config
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

-- ============================================================
-- FUNCTION: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, apt_number, role, phone_number, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'apt_number')::int, 0),
    COALESCE(NEW.raw_user_meta_data->>'role', 'RESIDENT'),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: run after new auth signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- MIGRATION HELPERS (run these if updating existing DB)
-- ============================================================
-- ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
-- ALTER TABLE votes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
-- ALTER TABLE ballots ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);
-- ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);
-- CREATE TABLE IF NOT EXISTS house_config (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   address TEXT NOT NULL DEFAULT '',
--   total_apartments INT NOT NULL DEFAULT 24,
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
-- );
-- INSERT INTO house_config (address, total_apartments) VALUES ('', 24) ON CONFLICT DO NOTHING;
