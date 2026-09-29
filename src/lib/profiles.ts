import { supabase } from "@/integrations/supabase/client";
import { STALE_THRESHOLD_MS, type StreamRow } from "@/lib/streams";

export type Profile = {
  id: string;
  channel_slug: string;
  display_name: string | null;
};

export function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

/** Every account has one permanent channel address. Create it if it is missing. */
export async function fetchMyProfile(userId: string, email?: string | null): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, channel_slug, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as Profile;

  const base = normalizeSlug(email?.split("@")[0] ?? "") || "user";
  let candidate = `${base}-${userId.replace(/-/g, "").slice(0, 6)}`;

  const inserted = await supabase
    .from("profiles")
    .insert({ id: userId, channel_slug: candidate })
    .select("id, channel_slug, display_name")
    .single();

  if (inserted.error) {
    candidate = `${base}-${Math.random().toString(36).slice(2, 8)}`;
    const retry = await supabase
      .from("profiles")
      .insert({ id: userId, channel_slug: candidate })
      .select("id, channel_slug, display_name")
      .single();
    if (retry.error) throw retry.error;
    return retry.data as Profile;
  }

  return inserted.data as Profile;
}

export async function fetchProfileBySlug(slug: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, channel_slug, display_name")
    .eq("channel_slug", slug)
    .maybeSingle();

  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function updateChannelSlug(userId: string, slug: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ channel_slug: slug })
    .eq("id", userId)
    .select("id, channel_slug, display_name")
    .single();

  if (error) throw error;
  return data as Profile;
}

/** The channel's currently live stream, if any. */
export async function fetchLiveStreamForCreator(creatorId: string): Promise<StreamRow | null> {
  const since = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
  const { data, error } = await supabase
    .from("streams")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("is_public", true)
    .eq("status", "live")
    .gte("last_heartbeat_at", since)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as StreamRow | null) ?? null;
}
