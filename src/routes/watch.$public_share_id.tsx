import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, type RemoteTrack, type RemoteTrackPublication } from "livekit-client";
import { Eye } from "lucide-react";
import { Brand } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { getLiveKitConnection } from "@/lib/livekit";
import { fetchStreamByShareId, isStale, type StreamRow } from "@/lib/streams";

export const Route = createFileRoute("/watch/$public_share_id")({
  head: () => ({
    meta: [
      { title: "Watch live on ArenaHub" },
      { name: "description", content: "Watch this live stream on ArenaHub — no account needed." },
      { property: "og:title", content: "Watch live on ArenaHub" },
      {
        property: "og:description",
        content: "Watch this live stream on ArenaHub — no account needed.",
      },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WatchPage,
});

type Phase = "loading" | "connecting" | "waiting" | "live" | "tap" | "error" | "ended";

function WatchPage() {
  const { public_share_id } = Route.useParams();
  const [phase, setPhase] = useState<Phase>("loading");
  const [stream, setStream] = useState<StreamRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const roomRef = useRef<Room | null>(null);

  // 1. Load the stream record by its public share id.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await fetchStreamByShareId(public_share_id);
        if (cancelled) return;
        if (!row) {
          setPhase("error");
          setMessage("This stream link doesn't exist.");
          return;
        }
        const ended = row.status === "ended" || isStale(row);
        setStream(row);
        setPhase(ended ? "ended" : "connecting");
      } catch {
        if (!cancelled) {
          setPhase("error");
          setMessage("We couldn't load this stream.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [public_share_id]);

  const attachTrack = useCallback((track: RemoteTrack) => {
    if (track.kind === "video" && videoRef.current) {
      track.attach(videoRef.current);
      const v = videoRef.current;
      v.muted = true;
      v.play()
        .then(() => setPhase("live"))
        .catch(() => setPhase("tap"));
    }
    if (track.kind === "audio" && audioRef.current) {
      track.attach(audioRef.current);
      audioRef.current.play().catch(() => setPhase("tap"));
    }
  }, []);

  // 2. Join the LiveKit room and subscribe to the broadcaster's tracks.
  useEffect(() => {
    if (!stream || phase === "ended") return;

    let cancelled = false;
    const room = new Room({ adaptiveStream: true });
    roomRef.current = room;

    const scanTracks = () => {
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((pub: RemoteTrackPublication) => {
          if (!pub.isSubscribed) pub.setSubscribed(true);
          if (pub.track) attachTrack(pub.track);
        });
      });
    };

    room.on(RoomEvent.TrackSubscribed, (track) => attachTrack(track));
    room.on(RoomEvent.TrackPublished, () => scanTracks());
    room.on(RoomEvent.ParticipantConnected, () => scanTracks());
    room.on(RoomEvent.Disconnected, () => {
      if (!cancelled) setPhase("ended");
    });

    (async () => {
      try {
        const { serverUrl, token } = await getLiveKitConnection({
          roomName: stream.livekit_room_name,
          participantName: `viewer_${Math.random().toString(36).slice(2, 10)}`,
        });
        await room.connect(serverUrl, token, { autoSubscribe: true });
        if (cancelled) return;
        setPhase((p) => (p === "live" || p === "tap" ? p : "waiting"));
        scanTracks();
      } catch {
        if (!cancelled) {
          setPhase("error");
          setMessage("We couldn't connect to this stream.");
        }
      }
    })();

    const poller = setInterval(scanTracks, 1000);

    return () => {
      cancelled = true;
      clearInterval(poller);
      room.disconnect().catch(() => {});
      roomRef.current = null;
    };
  }, [stream, attachTrack, phase === "ended"]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Keep checking whether the broadcaster is still sending heartbeats.
  useEffect(() => {
    if (!stream || phase === "ended" || phase === "error") return;
    const interval = setInterval(async () => {
      const row = await fetchStreamByShareId(public_share_id).catch(() => null);
      if (!row) return;
      if (row.status === "ended" || isStale(row)) {
        setStream(row);
        setPhase("ended");
      } else {
        setStream(row);
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, [stream, phase, public_share_id]);

  async function handleTapToPlay() {
    try {
      await roomRef.current?.startAudio();
    } catch {
      /* ignore */
    }
    const v = videoRef.current;
    const a = audioRef.current;
    if (v) {
      v.muted = false;
      await v.play().catch(() => {});
    }
    if (a) await a.play().catch(() => {});
    setPhase("live");
  }

  const statusText: Record<Phase, string> = {
    loading: "Loading…",
    connecting: "Connecting…",
    waiting: "Waiting for the stream…",
    live: "Live",
    tap: "Tap to play",
    error: message ?? "Connection error",
    ended: "Stream ended",
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <Brand />
          <Link to="/live">
            <Button variant="ghost" size="sm">
              Browse live
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-background">
          <div className="aspect-video">
            <video ref={videoRef} playsInline autoPlay className="size-full object-contain" />
            <audio ref={audioRef} autoPlay className="hidden" />
          </div>

          {phase !== "live" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/85 px-6 text-center">
              <p className="text-base font-medium">{statusText[phase]}</p>
              {phase === "tap" && (
                <Button size="lg" onClick={handleTapToPlay}>
                  Tap to play
                </Button>
              )}
              {(phase === "ended" || phase === "error") && (
                <Link to="/live">
                  <Button variant="secondary">See what's live</Button>
                </Link>
              )}
            </div>
          )}

          {phase === "live" && (
            <>
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-live px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-live-foreground">
                <span className="size-1.5 rounded-full bg-live-foreground live-pulse" />
                Live
              </span>
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs">
                <Eye className="size-3.5" /> {stream?.viewer_count ?? 0}
              </span>
            </>
          )}
        </div>

        <h1 className="mt-5 text-2xl font-semibold">{stream?.title ?? "Live stream"}</h1>
        <p className="mt-1 text-sm capitalize text-muted-foreground">
          {stream ? (stream.stream_mode === "screen" ? "Screen share" : "Camera") : ""}
        </p>
      </main>
    </div>
  );
}
