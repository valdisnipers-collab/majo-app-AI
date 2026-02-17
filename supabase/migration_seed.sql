-- ============================================================
-- Mājo App — Migration & Seed Data
-- Run this in Supabase SQL Editor to add missing tables/columns
-- and insert one test record per table.
-- ============================================================

-- ============================
-- 1. ADD MISSING COLUMNS
-- ============================

-- notifications: add created_by
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- votes: add created_by
ALTER TABLE votes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- ballots: add user_id
ALTER TABLE ballots ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);

-- activity_logs: add user_id
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);

-- ============================
-- 2. CREATE house_config TABLE
-- ============================

CREATE TABLE IF NOT EXISTS house_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL DEFAULT '',
  total_apartments INT NOT NULL DEFAULT 24,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE house_config ENABLE ROW LEVEL SECURITY;

-- Drop policies if they already exist (idempotent)
DROP POLICY IF EXISTS "House config: read all" ON house_config;
DROP POLICY IF EXISTS "House config: admin/manager insert" ON house_config;
DROP POLICY IF EXISTS "House config: admin/manager update" ON house_config;

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

-- ============================
-- 3. ADD chat_topics UPDATE POLICY (for last_message_at)
-- ============================

DROP POLICY IF EXISTS "Chat topics: update for last_message_at" ON chat_topics;
CREATE POLICY "Chat topics: update for last_message_at" ON chat_topics
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================
-- 4. ADD MISSING INDEXES
-- ============================

CREATE INDEX IF NOT EXISTS idx_ballots_user ON ballots(user_id);

-- ============================
-- 5. INSERT SEED DATA (one record per table)
-- ============================

-- House config (default row)
INSERT INTO house_config (address, total_apartments)
SELECT '', 24
WHERE NOT EXISTS (SELECT 1 FROM house_config LIMIT 1);

-- Notification (test announcement)
INSERT INTO notifications (type, title, content, date, is_emergency, is_archived)
VALUES ('info', 'Sveicināti Mājo lietotnē!', 'Šī ir testa paziņojuma ziņa. Jūs varat to izdzēst vēlāk.', now(), false, false);

-- Meeting (test meeting)
DO $$
DECLARE
  new_meeting_id UUID;
BEGIN
  INSERT INTO meetings (title, date, location, description)
  VALUES ('Kopsapulce — tests', now() + interval '7 days', 'Mājas pagalms', 'Testa sapulce sistēmas pārbaudei.')
  RETURNING id INTO new_meeting_id;

  INSERT INTO agenda_items (meeting_id, text, sort_order) VALUES
    (new_meeting_id, 'Iepazīšanās un reglaments', 0),
    (new_meeting_id, 'Finanšu pārskats', 1);
END $$;

-- Vote (test vote with options)
DO $$
DECLARE
  new_vote_id UUID;
BEGIN
  INSERT INTO votes (title, description, type, start_date, end_date)
  VALUES ('Pagalma labiekārtošana', 'Vai atbalstāt pagalma labiekārtošanu?', 'YES_NO', now(), now() + interval '14 days')
  RETURNING id INTO new_vote_id;

  INSERT INTO vote_options (vote_id, text) VALUES
    (new_vote_id, 'Jā'),
    (new_vote_id, 'Nē');
END $$;

-- Maintenance topic (test — only if a profile exists to be the author)
DO $$
DECLARE
  author_profile RECORD;
BEGIN
  SELECT id, full_name, apt_number INTO author_profile FROM profiles WHERE status = 'active' LIMIT 1;
  IF author_profile.id IS NOT NULL THEN
    INSERT INTO maintenance_topics (category, title, description, priority, status, author_id, author_name, apt_number, date)
    VALUES ('Ūdensapgāde / Kanalizācija', 'Ūdens noplūde pagrabā', 'Pagraba stāvā ir neliela ūdens noplūde pie ieejas.', 'normal', 'NEW', author_profile.id, author_profile.full_name, author_profile.apt_number, now());
  END IF;
END $$;

-- Chat topic (test — only if a profile exists)
DO $$
DECLARE
  author_profile RECORD;
BEGIN
  SELECT id, full_name INTO author_profile FROM profiles WHERE status = 'active' LIMIT 1;
  IF author_profile.id IS NOT NULL THEN
    INSERT INTO chat_topics (title, description, author_id, author_name, last_message_at)
    VALUES ('Vispārīgā diskusija', 'Brīvā tēma mājas iedzīvotājiem.', author_profile.id, author_profile.full_name, now());
  END IF;
END $$;

-- Activity log (test)
INSERT INTO activity_logs (type, message)
VALUES ('announcement', 'Sistēma veiksmīgi inicializēta.');

-- ============================
-- 6. ADD DELETE POLICIES (for vote edit/delete feature)
-- ============================

DROP POLICY IF EXISTS "Vote options: manager/admin delete" ON vote_options;
CREATE POLICY "Vote options: manager/admin delete" ON vote_options
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

DROP POLICY IF EXISTS "Ballots: manager/admin delete" ON ballots;
CREATE POLICY "Ballots: manager/admin delete" ON ballots
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

DROP POLICY IF EXISTS "Agenda: manager/admin delete" ON agenda_items;
CREATE POLICY "Agenda: manager/admin delete" ON agenda_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

DROP POLICY IF EXISTS "Maintenance topics: admin delete" ON maintenance_topics;
CREATE POLICY "Maintenance topics: admin delete" ON maintenance_topics
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

DROP POLICY IF EXISTS "Maintenance comments: admin delete" ON maintenance_comments;
CREATE POLICY "Maintenance comments: admin delete" ON maintenance_comments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );

-- ============================
-- 7. ADD status_changed_at TO maintenance_topics
-- ============================

ALTER TABLE maintenance_topics ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

SELECT 'Migration + seed data completed!' AS result;
