CREATE TABLE public.streams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL,
  title text NOT NULL,
  public_share_id text NOT NULL UNIQUE,
  public_watch_url text,
  livekit_room_name text NOT NULL,
  stream_provider text NOT NULL DEFAULT 'livekit',
  stream_mode text NOT NULL DEFAULT 'camera',
  device_type text NOT NULL DEFAULT 'desktop',
  status text NOT NULL DEFAULT 'live',
  stream_health text NOT NULL DEFAULT 'live',
  is_public boolean NOT NULL DEFAULT true,
  viewer_count integer NOT NULL DEFAULT 0,
  microphone_enabled boolean NOT NULL DEFAULT true,
  camera_enabled boolean NOT NULL DEFAULT true,
  thumbnail_url text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  ended_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX streams_live_idx ON public.streams (status, is_public, last_heartbeat_at DESC);
CREATE INDEX streams_creator_idx ON public.streams (creator_id, created_at DESC);

GRANT SELECT ON public.streams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.streams TO authenticated;
GRANT ALL ON public.streams TO service_role;

ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public streams are viewable by everyone"
  ON public.streams FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their own streams"
  ON public.streams FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can create their own streams"
  ON public.streams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own streams"
  ON public.streams FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own streams"
  ON public.streams FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

ALTER TABLE public.streams REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.streams;