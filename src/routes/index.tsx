import { createFileRoute, Link } from "@tanstack/react-router";
import { Play, Radio, Monitor, Camera } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ArenaHub — Watch live streams or start your own" },
      {
        name: "description",
        content:
          "ArenaHub is the simplest way to go live. Watch streams happening right now, or share your screen or camera in seconds.",
      },
      { property: "og:title", content: "ArenaHub — Watch live streams or start your own" },
      {
        property: "og:description",
        content:
          "ArenaHub is the simplest way to go live. Watch streams happening right now, or share your screen or camera in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="hero-glow">
        <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 py-24 text-center sm:py-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-2 rounded-full bg-live live-pulse" />
            Live streaming, made simple
          </span>

          <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-6xl">
            Watch live streams or start streaming yourself.
          </h1>

          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            No setup, no software. Open ArenaHub, pick your screen or camera, and you're live with a
            link anyone can watch.
          </p>

          <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link to="/live" className="sm:w-auto">
              <Button size="lg" className="h-14 w-full px-8 text-base sm:w-auto">
                <Play className="mr-2 size-5" />
                Watch Live
              </Button>
            </Link>
            <Link to="/stream" className="sm:w-auto">
              <Button
                size="lg"
                variant="secondary"
                className="h-14 w-full px-8 text-base sm:w-auto"
              >
                <Radio className="mr-2 size-5" />
                Start Streaming
              </Button>
            </Link>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-4xl gap-4 px-4 pb-24 sm:grid-cols-2">
          <Feature
            icon={<Monitor className="size-5" />}
            title="Share your screen"
            body="Stream straight from your browser — pick a window or tab and go live."
          />
          <Feature
            icon={<Camera className="size-5" />}
            title="Go live on camera"
            body="Use your phone or webcam with your microphone. Just add a title."
          />
        </section>
      </main>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-left">
      <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-foreground">
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
