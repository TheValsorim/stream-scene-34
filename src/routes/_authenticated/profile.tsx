import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { ProfileSettings } from "@/components/ProfileSettings";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — ArenaHub" },
      {
        name: "description",
        content: "Edit your ArenaHub profile: picture, bio and favorite games.",
      },
      { property: "og:title", content: "Your profile — ArenaHub" },
      {
        property: "og:description",
        content: "Edit your ArenaHub profile: picture, bio and favorite games.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useSession();

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-semibold">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is what people see on your channel page.
        </p>

        <div className="mt-6">
          {loading || !user ? (
            <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          ) : (
            <ProfileSettings userId={user.id} email={user.email ?? null} />
          )}
        </div>
      </main>
    </div>
  );
}
