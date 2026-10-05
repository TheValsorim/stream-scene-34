import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { fetchMyProfile, updateMyProfile, type Profile } from "@/lib/profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Resize an image file to a small JPEG data URL so it can live in the profile row. */
function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that image"));
    };
    img.src = url;
  });
}

export function ProfileSettings({ userId, email }: { userId: string; email: string | null }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [games, setGames] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMyProfile(userId, email)
      .then((p) => {
        setProfile(p);
        setDisplayName(p.display_name ?? "");
        setBio(p.bio ?? "");
        setGames(p.favorite_games.join(", "));
      })
      .catch(() => toast.error("Couldn't load your profile"));
  }, [userId, email]);

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      const updated = await updateMyProfile(userId, { avatar_url: dataUrl });
      setProfile(updated);
      toast.success("Profile picture updated");
    } catch {
      toast.error("Couldn't save that picture. Try a different image.");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const favorite_games = games
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean)
        .slice(0, 10);
      const updated = await updateMyProfile(userId, {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        favorite_games,
      });
      setProfile(updated);
      toast.success("Profile saved");
    } catch {
      toast.error("Couldn't save your profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return <div className="h-48 animate-pulse rounded-2xl border border-border bg-card" />;
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Your profile</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This is what people see on your channel page.
      </p>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary"
          aria-label="Change profile picture"
        >
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            <User className="size-8 text-muted-foreground" />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="size-5 text-white" />
          </span>
        </button>
        <div>
          <p className="text-sm font-medium">Profile picture</p>
          <p className="text-xs text-muted-foreground">Tap the circle to upload a photo.</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarPick}
        />
      </div>

      <form onSubmit={handleSave} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            placeholder="How should viewers call you?"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="A sentence or two about you."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="games">Games you like to play</Label>
          <Input
            id="games"
            value={games}
            onChange={(e) => setGames(e.target.value)}
            placeholder="e.g. FIFA, Fortnite, Chess — separate with commas"
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save profile
        </Button>
      </form>
    </section>
  );
}
