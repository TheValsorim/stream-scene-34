CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  channel_slug text NOT NULL UNIQUE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.slugify_handle(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT nullif(trim(both '-' from regexp_replace(lower(coalesce(_input, '')), '[^a-z0-9]+', '-', 'g')), '');
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  suffix int := 0;
BEGIN
  base := coalesce(
    public.slugify_handle(NEW.raw_user_meta_data ->> 'preferred_username'),
    public.slugify_handle(NEW.raw_user_meta_data ->> 'full_name'),
    public.slugify_handle(split_part(NEW.email, '@', 1)),
    'user'
  );
  base := left(base, 24);
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE channel_slug = candidate) LOOP
    suffix := suffix + 1;
    candidate := base || '-' || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, channel_slug, display_name)
  VALUES (NEW.id, candidate, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, channel_slug, display_name)
SELECT u.id,
       left(coalesce(public.slugify_handle(split_part(u.email, '@', 1)), 'user'), 24) || '-' || left(replace(u.id::text, '-', ''), 6),
       u.raw_user_meta_data ->> 'full_name'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;