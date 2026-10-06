import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { Brand } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { fetchLiveStreamForCreator, fetchProfileBySlug, type Profile } from "@/lib/profiles";

export const Route = createFileRoute("/c/$slug")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Channel — ArenaHub" },
      {
        name: "description",
        content: "This is a permanent ArenaHub channel link. Open it any time to watch when live.",
      },
      { property: "og:title", content: "Channel — ArenaHub" },
      {
        property: "og:description",
        content: "This is a permanent ArenaHub channel link. Open it any time to watch when live.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChannelPage,
});

function ChannelPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "offline" | "missing">("loading");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const found = await fetchProfileBySlug(slug);
        if (cancelled) return;
        if (!found) {
          setState("missing");
          return;
        }
        setProfile(found);
        const live = await fetchLiveStreamForCreator(found.id);
        if (cancelled) return;
        if (live) {
          navigate({
            to: "/watch/$public_share_id",
            params: { public_share_id: live.public_share_id },
            replace: true,
          });
          return;
        }
        setState("offline");
      } catch {
        if (!cancelled) setState("offline");
      }
    };

    void check();
    const timer = setInterval(() => void check(), 10_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [slug, navigate]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4">
          <Brand />
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary">
          <Radio className="size-6" />
        </span>

        {state === "missing" ? (
          <>
            <h1 className="mt-6 text-2xl font-semibold">This channel doesn't exist</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Check the link and try again.
            </p>
          </>
        ) : state === "loading" ? (
          <h1 className="mt-6 text-2xl font-semibold">Checking the channel…</h1>
        ) : (
          <>
            {profile?.avatar_url && (
              <img
                src={profile.avatar_url}
                alt=""
                className="mt-6 size-24 rounded-full border border-border object-cover"
              />
            )}
            <h1 className="mt-6 text-2xl font-semibold">
              {profile?.display_name ?? `@${slug}`} is not live right now
            </h1>
            {profile?.bio && (
              <p className="mt-3 max-w-sm text-sm text-muted-foreground">{profile.bio}</p>
            )}
            {profile && profile.favorite_games.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {profile.favorite_games.map((game) => (
                  <span
                    key={game}
                    className="rounded-full border border-border bg-secondary px-3 py-1 text-xs"
                  >
                    {game}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              Keep this page open — it starts playing automatically the moment the stream begins.
            </p>
          </>
        )}

        <Link to="/live" className="mt-8">
          <Button variant="secondary" className="h-12 px-8">
            See who's live now
          </Button>
        </Link>
      </main>
    </div>
  );
}
