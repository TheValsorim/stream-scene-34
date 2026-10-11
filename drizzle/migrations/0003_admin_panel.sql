CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.profiles ADD COLUMN is_banned boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.streams ADD COLUMN peak_viewers integer NOT NULL DEFAULT 0;
UPDATE public.streams SET peak_viewers = viewer_count;

-- Users cannot change their own moderation flags
CREATE OR REPLACE FUNCTION public.protect_profile_flags()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_banned := OLD.is_banned;
    NEW.is_featured := OLD.is_featured;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_profile_flags BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_flags();

CREATE OR REPLACE FUNCTION public.track_peak_viewers()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.peak_viewers := GREATEST(COALESCE(NEW.peak_viewers,0), COALESCE(OLD.peak_viewers,0), NEW.viewer_count);
  RETURN NEW;
END $$;
CREATE TRIGGER track_peak_viewers BEFORE UPDATE ON public.streams FOR EACH ROW EXECUTE FUNCTION public.track_peak_viewers();

-- Banned users cannot start streams
DROP POLICY "Users can create their own streams" ON public.streams;
CREATE POLICY "Users can create their own streams" ON public.streams FOR INSERT TO authenticated
WITH CHECK (auth.uid() = creator_id AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_banned));

-- Public profile functions now expose featured flag and hide banned users
DROP FUNCTION public.get_public_profiles();
CREATE FUNCTION public.get_public_profiles()
RETURNS TABLE(id uuid, channel_slug text, display_name text, avatar_url text, bio text, favorite_games text[], is_featured boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, channel_slug, display_name, avatar_url, bio, favorite_games, is_featured
  FROM public.profiles WHERE NOT is_banned ORDER BY is_featured DESC, created_at ASC LIMIT 200
$$;
GRANT EXECUTE ON FUNCTION public.get_public_profiles() TO anon, authenticated;

-- Admin functions
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, channel_slug text, display_name text, avatar_url text, favorite_games text[], is_banned boolean, is_featured boolean, is_admin boolean, stream_count bigint, total_minutes numeric, max_viewers integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, u.created_at, u.last_sign_in_at, p.channel_slug, p.display_name, p.avatar_url,
    COALESCE(p.favorite_games, '{}'), COALESCE(p.is_banned,false), COALESCE(p.is_featured,false),
    public.has_role(u.id,'admin'),
    (SELECT count(*) FROM public.streams s WHERE s.creator_id = u.id),
    (SELECT COALESCE(round(sum(EXTRACT(EPOCH FROM (COALESCE(s.ended_at, s.last_heartbeat_at) - s.started_at))/60)::numeric,0),0) FROM public.streams s WHERE s.creator_id = u.id),
    (SELECT COALESCE(max(s.peak_viewers),0) FROM public.streams s WHERE s.creator_id = u.id)
  FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_streams()
RETURNS TABLE(id uuid, creator_id uuid, channel_slug text, display_name text, title text, stream_mode text, device_type text, status text, stream_health text, viewer_count integer, peak_viewers integer, started_at timestamptz, last_heartbeat_at timestamptz, ended_at timestamptz, ended_reason text, public_share_id text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT s.id, s.creator_id, p.channel_slug, p.display_name, s.title, s.stream_mode, s.device_type, s.status, s.stream_health,
    s.viewer_count, s.peak_viewers, s.started_at, s.last_heartbeat_at, s.ended_at, s.ended_reason, s.public_share_id
  FROM public.streams s LEFT JOIN public.profiles p ON p.id = s.creator_id
  ORDER BY s.started_at DESC LIMIT 500;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_user_flags(_user_id uuid, _is_banned boolean, _is_featured boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.profiles SET is_banned = _is_banned, is_featured = _is_featured WHERE id = _user_id;
  IF _is_banned THEN
    UPDATE public.streams SET status = 'ended', stream_health = 'ended', ended_at = now(), ended_reason = 'banned_by_admin'
    WHERE creator_id = _user_id AND status = 'live';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_profile(_user_id uuid, _display_name text, _channel_slug text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.profiles SET display_name = _display_name, channel_slug = _channel_slug WHERE id = _user_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_end_stream(_stream_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.streams SET status = 'ended', stream_health = 'ended', ended_at = now(), ended_reason = 'ended_by_admin'
  WHERE id = _stream_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users(), public.admin_list_streams(), public.admin_set_user_flags(uuid,boolean,boolean), public.admin_update_profile(uuid,text,text), public.admin_end_stream(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(), public.admin_list_streams(), public.admin_set_user_flags(uuid,boolean,boolean), public.admin_update_profile(uuid,text,text), public.admin_end_stream(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_flags() FROM PUBLIC, anon, authenticated;