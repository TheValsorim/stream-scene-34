import { useEffect, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchMyProfile, normalizeSlug, updateChannelSlug, type Profile } from "@/lib/profiles";
import { shareOrigin } from "@/lib/share";

/** The broadcaster's permanent public link — send it once, reuse it for every stream. */
export function ChannelLink({ userId, email }: { userId: string; email?: string | null }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [slug, setSlug] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMyProfile(userId, email)
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setSlug(p.channel_slug);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, email]);

  const url = profile ? `${shareOrigin()}/c/${profile.channel_slug}` : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Your channel link was copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link.");
    }
  }

  async function handleSave() {
    const next = normalizeSlug(slug);
    if (next.length < 3) {
      toast.error("Use at least 3 letters or numbers.");
      return;
    }
    setBusy(true);
    try {
      const updated = await updateChannelSlug(userId, next);
      setProfile(updated);
      setSlug(updated.channel_slug);
      setEditing(false);
      toast.success("Your channel link was updated");
    } catch {
      toast.error("That name is already taken. Try another one.");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) {
    return <div className="h-28 animate-pulse rounded-2xl border border-border bg-card" />;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Link2 className="size-4 text-muted-foreground" />
        <Label>Your permanent channel link</Label>
      </div>

      {editing ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 items-center gap-1 rounded-md border border-border px-2">
            <span className="text-xs text-muted-foreground">{shareOrigin()}/c/</span>
            <Input
              value={slug}
              maxLength={24}
              onChange={(e) => setSlug(e.target.value)}
              className="border-0 px-1 focus-visible:ring-0"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSlug(profile.channel_slug);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 flex gap-2">
            <Input readOnly value={url} className="text-xs" />
            <Button variant="secondary" size="icon" onClick={handleCopy} aria-label="Copy link">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Send this link once. It always shows your stream when you're live — no account needed.
            </p>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Change
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
