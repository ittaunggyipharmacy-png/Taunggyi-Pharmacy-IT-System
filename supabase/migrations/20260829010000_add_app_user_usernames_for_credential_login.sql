-- Add a unique username for app login while keeping Supabase Auth as the credential authority.
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS username text;

CREATE UNIQUE INDEX IF NOT EXISTS app_users_username_lower_unique
  ON public.app_users (lower(username))
  WHERE username IS NOT NULL;

UPDATE public.app_users
SET username = CASE
  WHEN lower(email) = 'tgpadmin@taunggyipharmacy.com' THEN 'Tgpadmin'
  WHEN lower(email) = 'it.taunggyipharmacy@gmail.com' THEN 'itdigital'
  ELSE username
END
WHERE username IS NULL OR username = '';
