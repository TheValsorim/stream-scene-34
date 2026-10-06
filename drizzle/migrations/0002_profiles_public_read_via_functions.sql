DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE (id uuid, channel_slug text, display_name text, avatar_url text, bio text, favorite_games text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, channel_slug, display_name, avatar_url, bio, favorite_games
  FROM public.profiles ORDER BY created_at ASC LIMIT 200
$$;

CREATE OR REPLACE FUNCTION public.get_profile_by_slug(_slug text)
RETURNS TABLE (id uuid, channel_slug text, display_name text, avatar_url text, bio text, favorite_games text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, channel_slug, display_name, avatar_url, bio, favorite_games
  FROM public.profiles WHERE channel_slug = _slug LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profiles() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_by_slug(text) TO anon, authenticated;