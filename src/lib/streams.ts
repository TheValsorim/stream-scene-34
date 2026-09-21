import { supabase } from "@/integrations/supabase/client";

export type StreamMode = "camera" | "screen";

export type StreamRow = {
  id: string;
  creator_id: string;
  title: string;
  public_share_id: string;
  public_watch_url: string | null;
  livekit_room_name: string;
  stream_provider: string;
  stream_mode: string;
  device_type: string;
  status: string;
  stream_health: string;
  is_public: boolean;
  viewer_count: number;
  microphone_enabled: boolean;
  camera_enabled: boolean;
  thumbnail_url: string | null;
  started_at: string;
  last_heartbeat_at: string;
  ended_at: string | null;
  ended_reason: string | null;
  created_at: string;
};

/** A stream whose broadcaster stopped sending heartbeats is treated as ended. */
export const STALE_THRESHOLD_MS = 60_000;
export const HEARTBEAT_INTERVAL_MS = 10_000;

export function isStale(stream: Pick<StreamRow, "last_heartbeat_at">) {
  return Date.now() - new Date(stream.last_heartbeat_at).getTime() > STALE_THRESHOLD_MS;
}

export function isLive(stream: Pick<StreamRow, "status" | "last_heartbeat_at">) {
  return stream.status === "live" && !isStale(stream);
}

function randomShareId() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export async function fetchLiveStreams(): Promise<StreamRow[]> {
  const since = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
  const { data, error } = await supabase
    .from("streams")
    .select("*")
    .eq("is_public", true)
    .eq("status", "live")
    .gte("last_heartbeat_at", since)
    .order("started_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as StreamRow[];
}

export async function fetchStreamByShareId(shareId: string): Promise<StreamRow | null> {
  const { data, error } = await supabase
    .from("streams")
    .select("*")
    .eq("public_share_id", shareId)
    .maybeSingle();

  if (error) throw error;
  return (data as StreamRow | null) ?? null;
}

export async function createStream({
  userId,
  title,
  mode,
  micEnabled,
}: {
  userId: string;
  title: string;
  mode: StreamMode;
  micEnabled: boolean;
}): Promise<StreamRow> {
  const shareId = randomShareId();
  const roomName = `arenahub_${shareId}`;
  const isMobile =
    typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const { data, error } = await supabase
    .from("streams")
    .insert({
      creator_id: userId,
      title,
      public_share_id: shareId,
      public_watch_url: `/watch/${shareId}`,
      livekit_room_name: roomName,
      stream_provider: "livekit",
      stream_mode: mode,
      device_type: isMobile ? "mobile" : "desktop",
      status: "live",
      stream_health: "live",
      is_public: true,
      viewer_count: 0,
      microphone_enabled: micEnabled,
      camera_enabled: mode === "camera",
      started_at: new Date().toISOString(),
      last_heartbeat_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as StreamRow;
}

export async function patchStream(streamId: string, patch: Partial<StreamRow>) {
  const { error } = await supabase.from("streams").update(patch).eq("id", streamId);
  if (error) throw error;
}

export async function endStream(streamId: string, reason: "ended_by_user" | "broadcaster_disconnected") {
  await patchStream(streamId, {
    status: "ended",
    stream_health: "ended",
    ended_at: new Date().toISOString(),
    ended_reason: reason,
  });
}
