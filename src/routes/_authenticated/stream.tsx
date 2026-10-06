import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { StreamStudio } from "@/components/StreamStudio";
import { ChannelLink } from "@/components/ChannelLink";
import { ProfileSettings } from "@/components/ProfileSettings";
import { TroubleshootHelper } from "@/components/TroubleshootHelper";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/stream")({
  head: () => ({
    meta: [
      { title: "Go live — ArenaHub" },
      {
        name: "description",
        content: "Share your screen or camera and go live on ArenaHub in a couple of clicks.",
      },
      { property: "og:title", content: "Go live — ArenaHub" },
      {
        property: "og:description",
        content: "Share your screen or camera and go live on ArenaHub in a couple of clicks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StreamPage,
});

function StreamPage() {
  const { user, loading } = useSession();

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-semibold">Start streaming</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick how you want to stream. You'll get a public watch link the moment you go live.
        </p>

        {user && (
          <div className="mt-6 space-y-6">
            <ChannelLink userId={user.id} email={user.email ?? null} />
            <ProfileSettings userId={user.id} email={user.email ?? null} />
          </div>
        )}

        <div className="mt-8">
          {loading || !user ? (
            <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          ) : (
            <StreamStudio userId={user.id} />
          )}
        </div>

        <div className="mt-8">
          <TroubleshootHelper />
        </div>
      </main>
    </div>
  );
}
