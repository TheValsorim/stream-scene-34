import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your ArenaHub account" },
      {
        name: "description",
        content: "Sign up for ArenaHub and start streaming your screen or camera in seconds.",
      },
      { property: "og:title", content: "Create your ArenaHub account" },
      {
        property: "og:description",
        content: "Sign up for ArenaHub and start streaming your screen or camera in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      navigate({ to: "/live" });
      return;
    }
    setSent(true);
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-up failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/live" });
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="hero-glow flex min-h-[calc(100vh-4rem)] items-start justify-center px-4 py-16">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6">
          {sent ? (
            <>
              <h1 className="text-2xl font-semibold">Check your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a confirmation link to {email}. Click it to finish creating your account,
                then come back and log in.
              </p>
              <Link to="/login" className="mt-6 block">
                <Button variant="secondary" className="h-11 w-full">
                  Go to login
                </Button>
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">Create your account</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Everyone with an account can stream.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="h-11 w-full" disabled={busy}>
                  {busy ? "Creating account…" : "Create account"}
                </Button>
              </form>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button variant="secondary" className="h-11 w-full" onClick={handleGoogle}>
                Continue with Google
              </Button>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-foreground underline underline-offset-4">
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
