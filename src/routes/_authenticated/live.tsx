import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Eye, Monitor, Camera, Radio } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchLiveStreams, type StreamRow } from "@/lib/streams";

export const Route = createFileRoute("/_authenticated/live")({
  head: () => ({
    meta: [
      { title: "Live now — ArenaHub" },
      { name: "description", content: "Browse streams that are live right now on ArenaHub." },
      { property: "og:title", content: "Live now — ArenaHub" },
      {
        property: "og:description",
        content: "Browse streams that are live right now on ArenaHub.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["live-streams"],
    queryFn: fetchLiveStreams,
    refetchInterval: 10_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("live-streams")
      .on("postgres_changes", { event: "*", schema: "public", table: "streams" }, () => {
        refetch();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const streams = data ?? [];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Live now</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {streams.length === 0
                ? "Nothing is live at the moment."
                : `${streams.length} stream${streams.length === 1 ? "" : "s"} live right now.`}
            </p>
          </div>
          <Link to="/stream">
            <Button>
              <Radio className="mr-2 size-4" />
              Go live
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        ) : streams.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-12 text-center">
            <h2 className="text-lg font-semibold">No live streams yet</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              New streams show up here automatically. Be the first — share your screen or camera.
            </p>
            <Link to="/stream" className="mt-6 inline-block">
              <Button size="lg">Start streaming</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {streams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StreamCard({ stream }: { stream: StreamRow }) {
  const isScreen = stream.stream_mode === "screen";
  return (
    <Link
      to="/watch/$public_share_id"
      params={{ public_share_id: stream.public_share_id }}
      className="group overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/60"
    >
      <div className="relative flex aspect-video items-center justify-center bg-surface">
        <span className="text-muted-foreground/60">
          {isScreen ? <Monitor className="size-10" /> : <Camera className="size-10" />}
        </span>
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-live px-2 py-1 text-xs font-semibold uppercase tracking-wide text-live-foreground">
          <span className="size-1.5 rounded-full bg-live-foreground live-pulse" />
          Live
        </span>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs text-foreground">
          <Eye className="size-3.5" />
          {stream.viewer_count}
        </span>
      </div>
      <div className="p-4">
        <h2 className="truncate font-medium group-hover:text-primary">{stream.title}</h2>
        <p className="mt-1 text-xs capitalize text-muted-foreground">
          {isScreen ? "Screen share" : "Camera"}
        </p>
      </div>
    </Link>
  );
}
