import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const REACTIONS = ["❤️", "🔥", "😂", "👏", "😮", "🎮"] as const;

type Floater = { id: number; emoji: string; left: number };

/**
 * Live emoji reactions over a video. Uses a Realtime broadcast channel keyed
 * by the stream id — nothing is stored. `canSend` shows the picker bar.
 */
export function LiveReactions({ streamId, canSend }: { streamId: string; canSend: boolean }) {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSentRef = useRef(0);
  const nextId = useRef(0);

  const spawn = (emoji: string) => {
    const id = nextId.current++;
    setFloaters((f) => [...f.slice(-30), { id, emoji, left: 8 + Math.random() * 20 }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 2600);
  };

  useEffect(() => {
    const channel = supabase.channel(`reactions:${streamId}`, {
      config: { broadcast: { self: false } },
    });
    channel
      .on("broadcast", { event: "react" }, ({ payload }) => {
        const emoji = (payload as { emoji?: string })?.emoji;
        if (emoji && (REACTIONS as readonly string[]).includes(emoji)) spawn(emoji);
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  const send = (emoji: string) => {
    const now = Date.now();
    if (now - lastSentRef.current < 300) return;
    lastSentRef.current = now;
    spawn(emoji);
    channelRef.current?.send({ type: "broadcast", event: "react", payload: { emoji } });
  };

  return (
    <>
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-1/3 overflow-hidden">
        {floaters.map((f) => (
          <span
            key={f.id}
            className="reaction-float absolute bottom-16 text-3xl"
            style={{ right: `${f.left}%` }}
          >
            {f.emoji}
          </span>
        ))}
      </div>
      {canSend && (
        <div className="absolute bottom-3 left-3 z-10 flex gap-1 rounded-full bg-background/80 p-1">
          {REACTIONS.map((e) => (
            <button
              key={e}
              type="button"
              aria-label={`React ${e}`}
              onClick={() => send(e)}
              className="grid size-9 place-items-center rounded-full text-xl transition-transform active:scale-125 hover:bg-secondary"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
