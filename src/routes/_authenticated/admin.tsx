import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, Search, Star, Square, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  adminEndStream,
  adminListStreams,
  adminListUsers,
  adminSetFlags,
  adminUpdateProfile,
  checkIsAdmin,
  streamMinutes,
  type AdminStream,
  type AdminUser,
} from "@/lib/admin";
import { isLive } from "@/lib/streams";
import { normalizeSlug } from "@/lib/profiles";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user || !(await checkIsAdmin(data.user.id))) throw redirect({ to: "/live" });
  },
  head: () => ({
    meta: [
      { title: "Admin panel — ArenaHub" },
      { name: "description", content: "Platform statistics, users and stream moderation for ArenaHub admins." },
      { property: "og:title", content: "Admin panel — ArenaHub" },
      { property: "og:description", content: "Platform statistics, users and stream moderation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleString() : "—";
}
function fmtMinutes(m: number) {
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

function AdminPage() {
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: adminListUsers, refetchInterval: 30_000 });
  const streams = useQuery({ queryKey: ["admin", "streams"], queryFn: adminListStreams, refetchInterval: 15_000 });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Admin panel</h1>
        <p className="mt-1 text-sm text-muted-foreground">Everything happening on ArenaHub.</p>

        {users.error || streams.error ? (
          <p className="mt-6 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm">
            Couldn't load admin data. {(users.error ?? streams.error)?.message}
          </p>
        ) : null}

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="flex w-full flex-wrap justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="live">Live moderation</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="streams">Stream history</TabsTrigger>
            <TabsTrigger value="games">Games</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <Overview users={users.data ?? []} streams={streams.data ?? []} />
          </TabsContent>
          <TabsContent value="live">
            <LiveModeration streams={(streams.data ?? []).filter((s) => isLive(s))} />
          </TabsContent>
          <TabsContent value="users">
            <UsersTable users={users.data ?? []} />
          </TabsContent>
          <TabsContent value="streams">
            <StreamHistory streams={streams.data ?? []} />
          </TabsContent>
          <TabsContent value="games">
            <Games users={users.data ?? []} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Overview({ users, streams }: { users: AdminUser[]; streams: AdminStream[] }) {
  const stats = useMemo(() => {
    const live = streams.filter((s) => isLive(s));
    const weekAgo = Date.now() - 7 * 86400_000;
    const totalMin = streams.reduce((a, s) => a + streamMinutes(s), 0);
    const top = [...streams].sort((a, b) => b.peak_viewers - a.peak_viewers).slice(0, 5);
    const reasons: Record<string, number> = {};
    for (const s of streams) if (s.ended_reason) reasons[s.ended_reason] = (reasons[s.ended_reason] ?? 0) + 1;
    return {
      live: live.length,
      watching: live.reduce((a, s) => a + s.viewer_count, 0),
      newUsers: users.filter((u) => new Date(u.created_at).getTime() > weekAgo).length,
      weekStreams: streams.filter((s) => new Date(s.started_at).getTime() > weekAgo).length,
      totalMin,
      record: Math.max(0, ...streams.map((s) => s.peak_viewers)),
      camera: streams.filter((s) => s.stream_mode === "camera").length,
      screen: streams.filter((s) => s.stream_mode === "screen").length,
      mobile: streams.filter((s) => s.device_type === "mobile").length,
      top,
      reasons: Object.entries(reasons).sort((a, b) => b[1] - a[1]),
      banned: users.filter((u) => u.is_banned).length,
    };
  }, [users, streams]);

  return (
    <div className="mt-4 space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Live now" value={stats.live} hint={`${stats.watching} watching`} />
        <Kpi label="Registered users" value={users.length} hint={`+${stats.newUsers} this week`} />
        <Kpi label="Total streams" value={streams.length} hint={`${stats.weekStreams} this week`} />
        <Kpi label="Hours streamed" value={(stats.totalMin / 60).toFixed(1)} />
        <Kpi label="Record viewers" value={stats.record} hint="Peak on one stream" />
        <Kpi label="Camera streams" value={stats.camera} />
        <Kpi label="Screen streams" value={stats.screen} />
        <Kpi label="Banned accounts" value={stats.banned} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">Most watched streams</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {stats.top.length === 0 && <li className="text-muted-foreground">No streams yet.</li>}
            {stats.top.map((s) => (
              <li key={s.id} className="flex justify-between gap-2">
                <span className="truncate">{s.title} <span className="text-muted-foreground">@{s.channel_slug}</span></span>
                <span className="shrink-0 font-medium">{s.peak_viewers} viewers</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">How streams ended</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {stats.reasons.length === 0 && <li className="text-muted-foreground">No data yet.</li>}
            {stats.reasons.map(([r, n]) => (
              <li key={r} className="flex justify-between"><span>{r.replace(/_/g, " ")}</span><span className="font-medium">{n}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Streams that stopped without a reason were dropped connections (stale). Mobile streams: {stats.mobile}.
          </p>
        </div>
      </div>
    </div>
  );
}

function LiveModeration({ streams }: { streams: AdminStream[] }) {
  const qc = useQueryClient();
  const end = useMutation({
    mutationFn: adminEndStream,
    onSuccess: () => { toast.success("Stream end signal sent"); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (streams.length === 0) return <p className="mt-6 text-sm text-muted-foreground">Nobody is live right now.</p>;
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {streams.map((s) => (
        <div key={s.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">@{s.channel_slug} · {s.stream_mode} · {s.device_type}</p>
            </div>
            <span className="rounded-md bg-live px-2 py-1 text-xs font-semibold uppercase text-live-foreground">Live</span>
          </div>
          <p className="text-sm">{s.viewer_count} watching · peak {s.peak_viewers} · {fmtMinutes(streamMinutes(s))}</p>
          <div className="flex gap-2">
            <Link to="/watch/$public_share_id" params={{ public_share_id: s.public_share_id }}>
              <Button variant="secondary" size="sm">Watch</Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              disabled={end.isPending}
              onClick={() => { if (confirm(`End "${s.title}" now?`)) end.mutate(s.id); }}
            >
              <Square className="mr-1 size-3.5" /> End stream
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersTable({ users }: { users: AdminUser[] }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const flags = useMutation({
    mutationFn: (v: { id: string; banned: boolean; featured: boolean }) => adminSetFlags(v.id, v.banned, v.featured),
    onSuccess: () => { toast.success("Account updated"); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const save = useMutation({
    mutationFn: (v: { id: string }) => adminUpdateProfile(v.id, name.trim() || null, normalizeSlug(slug)),
    onSuccess: () => { toast.success("Profile saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: Error) => toast.error(e.message.includes("duplicate") ? "That channel name is taken" : e.message),
  });

  const filtered = users.filter((u) => {
    const s = q.toLowerCase();
    return !s || [u.email, u.display_name, u.channel_slug].some((v) => v?.toLowerCase().includes(s));
  });

  return (
    <div className="mt-4 space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, @channel or email" className="pl-9" />
      </div>
      <div className="space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="size-10 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold uppercase">
                  {(u.display_name ?? u.channel_slug ?? u.email ?? "?").charAt(0)}
                </span>
              )}
              {editing === u.id ? (
                <div className="flex flex-1 flex-wrap gap-2">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" className="h-8 max-w-48" />
                  <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="channel" className="h-8 max-w-40" />
                  <Button size="sm" onClick={() => save.mutate({ id: u.id })} disabled={save.isPending || normalizeSlug(slug).length < 3}>
                    <Check className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="size-4" /></Button>
                </div>
              ) : (
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 font-medium">
                    <span className="truncate">{u.display_name ?? `@${u.channel_slug ?? "—"}`}</span>
                    {u.is_admin && <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] uppercase text-primary-foreground">Admin</span>}
                    {u.is_featured && <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] uppercase text-accent-foreground">Featured</span>}
                    {u.is_banned && <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] uppercase text-destructive-foreground">Banned</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">@{u.channel_slug} · {u.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {new Date(u.created_at).toLocaleDateString()} · last login {fmtDate(u.last_sign_in_at)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {u.stream_count} streams · {fmtMinutes(u.total_minutes)} · best {u.max_viewers} viewers
                    {u.favorite_games.length > 0 && ` · ${u.favorite_games.join(", ")}`}
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {u.channel_slug && (
                <Link to="/c/$slug" params={{ slug: u.channel_slug }}>
                  <Button size="sm" variant="ghost">Channel</Button>
                </Link>
              )}
              <Button size="sm" variant="secondary" onClick={() => { setEditing(u.id); setName(u.display_name ?? ""); setSlug(u.channel_slug ?? ""); }}>
                <Pencil className="mr-1 size-3.5" /> Edit
              </Button>
              <Button size="sm" variant={u.is_featured ? "default" : "secondary"} onClick={() => flags.mutate({ id: u.id, banned: u.is_banned, featured: !u.is_featured })}>
                <Star className="mr-1 size-3.5" /> {u.is_featured ? "Unfeature" : "Feature"}
              </Button>
              {!u.is_admin && (
                <Button
                  size="sm"
                  variant={u.is_banned ? "secondary" : "destructive"}
                  onClick={() => {
                    if (u.is_banned || confirm(`Ban ${u.email}? Their live stream will be stopped and they can't stream again.`))
                      flags.mutate({ id: u.id, banned: !u.is_banned, featured: u.is_featured });
                  }}
                >
                  <Ban className="mr-1 size-3.5" /> {u.is_banned ? "Unban" : "Ban"}
                </Button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No users match.</p>}
      </div>
    </div>
  );
}

function StreamHistory({ streams }: { streams: AdminStream[] }) {
  const [filter, setFilter] = useState<"all" | "live" | "ended">("all");
  const list = streams.filter((s) => filter === "all" || (filter === "live" ? isLive(s) : !isLive(s)));
  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-2">
        {(["all", "live", "ended"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "secondary"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Title</th><th className="p-3">Streamer</th><th className="p-3">Mode</th>
              <th className="p-3">Started</th><th className="p-3">Duration</th><th className="p-3">Peak</th><th className="p-3">Ended</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="max-w-56 truncate p-3">{s.title}</td>
                <td className="p-3">@{s.channel_slug}</td>
                <td className="p-3">{s.stream_mode} / {s.device_type}</td>
                <td className="whitespace-nowrap p-3">{fmtDate(s.started_at)}</td>
                <td className="p-3">{fmtMinutes(streamMinutes(s))}</td>
                <td className="p-3">{s.peak_viewers}</td>
                <td className="p-3">
                  {isLive(s) ? <span className="font-semibold text-live">LIVE</span> : (s.ended_reason ?? (s.status === "live" ? "dropped" : s.status)).replace(/_/g, " ")}
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="p-4 text-muted-foreground">No streams.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Games({ users }: { users: AdminUser[] }) {
  const games = useMemo(() => {
    const m = new Map<string, { name: string; n: number }>();
    for (const u of users) for (const g of u.favorite_games) {
      const k = g.trim().toLowerCase();
      if (!k) continue;
      const e = m.get(k) ?? { name: g.trim(), n: 0 };
      e.n++;
      m.set(k, e);
    }
    return [...m.values()].sort((a, b) => b.n - a.n);
  }, [users]);
  const max = games[0]?.n ?? 1;
  if (games.length === 0) return <p className="mt-6 text-sm text-muted-foreground">No games on profiles yet.</p>;
  return (
    <div className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-5">
      {games.map((g) => (
        <div key={g.name} className="flex items-center gap-3 text-sm">
          <span className="w-36 truncate">{g.name}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
            <span className="block h-full bg-primary" style={{ width: `${(g.n / max) * 100}%` }} />
          </span>
          <span className="w-16 text-right text-muted-foreground">{g.n} {g.n === 1 ? "user" : "users"}</span>
        </div>
      ))}
    </div>
  );
}
