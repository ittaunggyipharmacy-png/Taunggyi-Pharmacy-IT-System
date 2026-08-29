-- Keep app_users linked to the real Supabase Auth user and preserve announcement history.
ALTER TABLE public.it_announcements
  DROP CONSTRAINT IF EXISTS it_announcements_user_id_fkey;

ALTER TABLE public.it_announcements
  ADD CONSTRAINT it_announcements_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.app_users(uid)
  ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE public.app_users
SET uid = '0ba34e97-1885-450a-b650-dd9e28210a2c'::uuid
WHERE lower(email) = 'tgpadmin@taunggyipharmacy.com'
  AND uid <> '0ba34e97-1885-450a-b650-dd9e28210a2c'::uuid;
