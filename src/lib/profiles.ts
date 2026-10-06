import { supabase } from "@/integrations/supabase/client";
import { STALE_THRESHOLD_MS, type StreamRow } from "@/lib/streams";

export type Profile = {
  id: string;
  channel_slug: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  favorite_games: string[];
};

const PROFILE_COLUMNS = "id, channel_slug, display_name, avatar_url, bio, favorite_games";

export async function updateMyProfile(
  userId: string,
  fields: { display_name?: string | null; avatar_url?: string | null; bio?: string | null; favorite_games?: string[] },
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return data as Profile;
}

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
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as Profile;

  const base = normalizeSlug(email?.split("@")[0] ?? "") || "user";
  let candidate = `${base}-${userId.replace(/-/g, "").slice(0, 6)}`;

  const inserted = await supabase
    .from("profiles")
    .insert({ id: userId, channel_slug: candidate })
    .select(PROFILE_COLUMNS)
    .single();

  if (inserted.error) {
    candidate = `${base}-${Math.random().toString(36).slice(2, 8)}`;
    const retry = await supabase
      .from("profiles")
      .insert({ id: userId, channel_slug: candidate })
      .select(PROFILE_COLUMNS)
      .single();
    if (retry.error) throw retry.error;
    return retry.data as Profile;
  }

  return inserted.data as Profile;
}

export async function fetchProfileBySlug(slug: string): Promise<Profile | null> {
  const { data, error } = await supabase.rpc("get_profile_by_slug", { _slug: slug });
  if (error) throw error;
  return ((data as Profile[] | null) ?? [])[0] ?? null;
}

export async function updateChannelSlug(userId: string, slug: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ channel_slug: slug })
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return data as Profile;
}

/** All registered users' channel profiles, oldest first. */
export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.rpc("get_public_profiles");
  if (error) throw error;
  return (data as Profile[] | null) ?? [];
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
