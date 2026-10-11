import { supabase } from "@/integrations/supabase/client";

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) return false;
  return data === true;
}

export type AdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  channel_slug: string | null;
  display_name: string | null;
  avatar_url: string | null;
  favorite_games: string[];
  is_banned: boolean;
  is_featured: boolean;
  is_admin: boolean;
  stream_count: number;
  total_minutes: number;
  max_viewers: number;
};

export type AdminStream = {
  id: string;
  creator_id: string;
  channel_slug: string | null;
  display_name: string | null;
  title: string;
  stream_mode: string;
  device_type: string;
  status: string;
  stream_health: string;
  viewer_count: number;
  peak_viewers: number;
  started_at: string;
  last_heartbeat_at: string;
  ended_at: string | null;
  ended_reason: string | null;
  public_share_id: string;
};

export async function adminListUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) throw error;
  return ((data ?? []) as unknown as AdminUser[]).map((u) => ({
    ...u,
    stream_count: Number(u.stream_count),
    total_minutes: Number(u.total_minutes),
  }));
}

export async function adminListStreams(): Promise<AdminStream[]> {
  const { data, error } = await supabase.rpc("admin_list_streams");
  if (error) throw error;
  return (data ?? []) as unknown as AdminStream[];
}

export async function adminSetFlags(userId: string, isBanned: boolean, isFeatured: boolean) {
  const { error } = await supabase.rpc("admin_set_user_flags", {
    _user_id: userId,
    _is_banned: isBanned,
    _is_featured: isFeatured,
  });
  if (error) throw error;
}

export async function adminUpdateProfile(userId: string, displayName: string | null, slug: string) {
  const { error } = await supabase.rpc("admin_update_profile", {
    _user_id: userId,
    _display_name: displayName ?? "",
    _channel_slug: slug,
  });
  if (error) throw error;
}

export async function adminEndStream(streamId: string) {
  const { error } = await supabase.rpc("admin_end_stream", { _stream_id: streamId });
  if (error) throw error;
}

/** Duration in minutes between start and end (or last heartbeat). */
export function streamMinutes(s: Pick<AdminStream, "started_at" | "ended_at" | "last_heartbeat_at">) {
  const end = new Date(s.ended_at ?? s.last_heartbeat_at).getTime();
  return Math.max(0, Math.round((end - new Date(s.started_at).getTime()) / 60000));
}
