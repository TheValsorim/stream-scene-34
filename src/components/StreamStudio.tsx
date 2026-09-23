import { useCallback, useEffect, useRef, useState } from "react";
import {
  LocalAudioTrack,
  LocalVideoTrack,
  Room,
  RoomEvent,
  createLocalAudioTrack,
} from "livekit-client";
import { Camera, Check, Copy, Eye, Mic, MicOff, Monitor, RefreshCw, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLiveKitConnection } from "@/lib/livekit";
import {
  HEARTBEAT_INTERVAL_MS,
  createStream,
  endStream,
  patchStream,
  type StreamMode,
  type StreamRow,
} from "@/lib/streams";

type Phase = "choose" | "setup" | "starting" | "live" | "ended";

export function StreamStudio({ userId }: { userId: string }) {
  const [phase, setPhase] = useState<Phase>("choose");
  const [mode, setMode] = useState<StreamMode>("camera");
  const [title, setTitle] = useState("");
  const [micEnabled, setMicEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<StreamRow | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  const previewRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const roomRef = useRef<Room | null>(null);
  const videoTrackRef = useRef<LocalVideoTrack | null>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamIdRef = useRef<string | null>(null);

  const attachPreview = useCallback((ms: MediaStream) => {
    mediaStreamRef.current = ms;
    const el = previewRef.current;
    if (el) {
      el.srcObject = ms;
      el.muted = true;
      el.play().catch(() => {});
    }
  }, []);

  // The preview <video> only mounts after the phase flips to "setup",
  // so (re)attach the captured stream once the element exists.
  useEffect(() => {
    const ms = mediaStreamRef.current;
    if (ms && phase !== "choose" && phase !== "ended") attachPreview(ms);
  }, [phase, attachPreview]);

  const stopMedia = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
  }, []);

  /** Ask the browser for the screen or camera, then show a local preview. */
  const requestMedia = useCallback(
    async (nextMode: StreamMode, facing: "user" | "environment" = "environment") => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        throw new Error("Your browser does not support streaming from this page.");
      }

      if (nextMode === "screen") {
        if (!navigator.mediaDevices.getDisplayMedia) {
          throw new Error(
            "Screen sharing isn't available in this browser. Try Chrome, Edge or Firefox on a computer.",
          );
        }
        return navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30, max: 30 } },
          audio: true,
        });
      }

      return navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: true,
      });
    },
    [],
  );

  function describeMediaError(err: unknown, nextMode: StreamMode) {
    const name = (err as { name?: string } | null)?.name;
    if (name === "NotAllowedError" || name === "SecurityError") {
      return nextMode === "screen"
        ? "Screen sharing permission was denied. Allow it in your browser and try again."
        : "Camera and microphone permission was denied. Allow access in your browser and try again.";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "No camera or microphone was found on this device.";
    }
    if (name === "NotReadableError") {
      return "Your camera or screen is already in use by another app.";
    }
    return err instanceof Error ? err.message : "Could not start capture. Please try again.";
  }

  async function handleChooseMode(nextMode: StreamMode) {
    setError(null);
    setMode(nextMode);
    try {
      const ms = await requestMedia(nextMode, facingMode);
      attachPreview(ms);
      setPhase("setup");
    } catch (err) {
      setError(describeMediaError(err, nextMode));
    }
  }

  async function handleGoLive() {
    if (!title.trim()) {
      setError("Give your stream a title first.");
      return;
    }
    const ms = mediaStreamRef.current;
    if (!ms) {
      setError("Capture stopped. Pick screen or camera again.");
      setPhase("choose");
      return;
    }

    setError(null);
    setPhase("starting");

    let created: StreamRow | null = null;
    try {
      created = await createStream({ userId, title: title.trim(), mode, micEnabled });
      streamIdRef.current = created.id;
      setStream(created);

      const { serverUrl, token } = await getLiveKitConnection({
        roomName: created.livekit_room_name,
        participantName: `broadcaster_${created.id}`,
      });

      const room = new Room({ adaptiveStream: false, dynacast: false });
      roomRef.current = room;

      const updateViewers = () => {
        const count = Math.max(0, room.remoteParticipants.size);
        setViewerCount(count);
        patchStream(created!.id, {
          viewer_count: count,
          last_heartbeat_at: new Date().toISOString(),
        }).catch(() => {});
      };
      room.on(RoomEvent.ParticipantConnected, updateViewers);
      room.on(RoomEvent.ParticipantDisconnected, updateViewers);

      await Promise.race([
        room.connect(serverUrl, token),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Connection timed out. Check your network and try again.")),
            30_000,
          ),
        ),
      ]);

      const videoMediaTrack = ms.getVideoTracks()[0];
      if (!videoMediaTrack) throw new Error("No video track available to publish.");
      const videoTrack = new LocalVideoTrack(videoMediaTrack);
      videoTrackRef.current = videoTrack;
      await room.localParticipant.publishTrack(videoTrack);

      // Screen share may carry its own audio; otherwise use the microphone.
      const capturedAudio = ms.getAudioTracks()[0];
      if (micEnabled) {
        const audioTrack = capturedAudio
          ? new LocalAudioTrack(capturedAudio)
          : await createLocalAudioTrack();
        audioTrackRef.current = audioTrack;
        await room.localParticipant.publishTrack(audioTrack.mediaStreamTrack);
      }

      // The user can stop screen sharing from the browser's own control bar.
      // Camera mode is excluded on purpose: flipping the camera stops the old
      // track, and that "ended" event must not tear down the live stream.
      if (mode === "screen") {
        videoMediaTrack.addEventListener("ended", () => {
          void finishStream("ended_by_user");
        });
      }

      await patchStream(created.id, {
        status: "live",
        stream_health: "live",
        last_heartbeat_at: new Date().toISOString(),
      });

      setPhase("live");
    } catch (err) {
      console.error(err);
      if (created) await endStream(created.id, "ended_by_user").catch(() => {});
      roomRef.current?.disconnect().catch(() => {});
      roomRef.current = null;
      setError(err instanceof Error ? err.message : "Could not start the stream.");
      setPhase("setup");
    }
  }

  const finishStream = useCallback(
    async (reason: "ended_by_user" | "broadcaster_disconnected") => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
      const id = streamIdRef.current;
      try {
        await roomRef.current?.disconnect();
      } catch {
        /* ignore */
      }
      roomRef.current = null;
      videoTrackRef.current = null;
      audioTrackRef.current = null;
      stopMedia();
      if (id) await endStream(id, reason).catch(() => {});
      setPhase("ended");
    },
    [stopMedia],
  );

  // Heartbeat + browser lifecycle cleanup while live.
  useEffect(() => {
    if (phase !== "live" || !stream) return;

    heartbeatRef.current = setInterval(() => {
      patchStream(stream.id, {
        status: "live",
        stream_health: "live",
        viewer_count: viewerCount,
        last_heartbeat_at: new Date().toISOString(),
      }).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    const handlePageHide = () => {
      void endStream(stream.id, "broadcaster_disconnected").catch(() => {});
    };
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
    };
  }, [phase, stream, viewerCount]);

  // Stop capture if the component unmounts.
  useEffect(() => stopMedia, [stopMedia]);

  async function handleToggleMic() {
    const next = !micEnabled;
    setMicEnabled(next);
    const track = audioTrackRef.current;
    if (track) {
      if (next) await track.unmute();
      else await track.mute();
    }
    if (stream) {
      await patchStream(stream.id, {
        microphone_enabled: next,
        last_heartbeat_at: new Date().toISOString(),
      }).catch(() => {});
    }
  }

  async function handleSwitchCamera() {
    if (mode !== "camera") return;
    const next = facingMode === "user" ? "environment" : "user";
    try {
      const ms = await requestMedia("camera", next);
      const newVideo = ms.getVideoTracks()[0];
      if (!newVideo) throw new Error("No camera track found.");
      if (videoTrackRef.current) await videoTrackRef.current.replaceTrack(newVideo);
      mediaStreamRef.current?.getVideoTracks().forEach((t) => t.stop());
      attachPreview(ms);
      setFacingMode(next);
    } catch (err) {
      toast.error(describeMediaError(err, "camera"));
    }
  }

  const watchUrl =
    stream && typeof window !== "undefined"
      ? `${window.location.origin}/watch/${stream.public_share_id}`
      : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(watchUrl);
      setCopied(true);
      toast.success("Watch link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link.");
    }
  }

  function handleStreamAgain() {
    setStream(null);
    streamIdRef.current = null;
    setTitle("");
    setViewerCount(0);
    setError(null);
    setPhase("choose");
  }

  if (phase === "ended") {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <h2 className="text-2xl font-semibold">Stream ended</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your stream is no longer live.</p>
        <Button className="mt-6 h-12 px-8" onClick={handleStreamAgain}>
          Start another stream
        </Button>
      </div>
    );
  }

  if (phase === "choose") {
    return (
      <div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ModeCard
            icon={<Monitor className="size-7" />}
            title="Share Screen"
            body="Stream a window, tab or your whole screen."
            onClick={() => handleChooseMode("screen")}
          />
          <ModeCard
            icon={<Camera className="size-7" />}
            title="Camera"
            body="Stream from your webcam or phone camera."
            onClick={() => handleChooseMode("camera")}
          />
        </div>
        {error && <ErrorNote message={error} />}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="relative aspect-video bg-background">
          <video
            ref={previewRef}
            playsInline
            muted
            autoPlay
            className="size-full object-contain"
          />
          {phase === "live" && (
            <>
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-live px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-live-foreground">
                <span className="size-1.5 rounded-full bg-live-foreground live-pulse" />
                Live
              </span>
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs">
                <Eye className="size-3.5" /> {viewerCount}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        {phase === "live" ? (
          <>
            <h2 className="text-lg font-semibold">You're live</h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">{stream?.title}</p>

            <div className="mt-5 space-y-2">
              <Label>Public watch link</Label>
              <div className="flex gap-2">
                <Input readOnly value={watchUrl} className="text-xs" />
                <Button variant="secondary" size="icon" onClick={handleCopy} aria-label="Copy link">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can watch — no account needed.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={handleToggleMic}>
                {micEnabled ? <Mic className="mr-2 size-4" /> : <MicOff className="mr-2 size-4" />}
                {micEnabled ? "Mute" : "Unmute"}
              </Button>
              {mode === "camera" && (
                <Button variant="secondary" onClick={handleSwitchCamera}>
                  <RefreshCw className="mr-2 size-4" />
                  Flip camera
                </Button>
              )}
            </div>

            <Button
              variant="destructive"
              className="mt-6 h-12 w-full"
              onClick={() => void finishStream("ended_by_user")}
            >
              <Square className="mr-2 size-4" />
              End stream
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">
              {mode === "screen" ? "Screen share" : "Camera"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a title, then go live. Your preview is on the left.
            </p>

            <div className="mt-5 space-y-2">
              <Label htmlFor="title">Stream title</Label>
              <Input
                id="title"
                value={title}
                maxLength={120}
                placeholder="What are you streaming?"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={micEnabled}
                onChange={(e) => setMicEnabled(e.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              Include audio
            </label>

            <Button
              className="mt-6 h-12 w-full text-base"
              disabled={phase === "starting"}
              onClick={handleGoLive}
            >
              {phase === "starting" ? "Going live…" : "Go live"}
            </Button>
            <Button
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => {
                stopMedia();
                setError(null);
                setPhase("choose");
              }}
            >
              Back
            </Button>

            {error && <ErrorNote message={error} />}
          </>
        )}
      </div>
    </div>
  );
}

function ModeCard({
  icon,
  title,
  body,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-border bg-card p-8 text-left transition-colors hover:border-primary hover:bg-surface"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-foreground">
        {icon}
      </span>
      <h2 className="mt-5 text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </button>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
      {message}
    </p>
  );
}
