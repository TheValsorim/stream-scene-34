import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

const SYSTEM = `You are a support assistant for ArenaHub, a browser-based live streaming app.
Broadcasters stream from a phone or computer browser with Camera (getUserMedia) or Share Screen (getDisplayMedia, desktop browsers only — iPhone/Android browsers block it). Video goes over WebRTC (LiveKit). Viewers watch via a public link without login.
App features the user can use: Flip camera, Reconnect camera button, mute mic, End stream, Full screen button for viewers, Tap to play for viewers when autoplay is blocked.
Known causes: phone auto-lock or leaving the browser turns the camera off; weak network causes black/frozen frames; Lovable editor iframe can block screen sharing (open in a new tab); browser permissions for camera/mic may be denied in site settings; iOS allows only one camera at a time.
Give 3-7 concrete, numbered steps specific to the device and browser described, most likely fix first. Keep it short and practical. Answer in the same language the user wrote in. No markdown headings.`;

export async function suggestFix(problem: string, apiKey: string): Promise<string> {
  let runId: string | undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set(RUN_ID_HEADER, runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get(RUN_ID_HEADER) ?? undefined;
      return res;
    },
  });

  let failure: unknown;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system: SYSTEM,
    messages: [{ role: "user", content: problem }],
    maxRetries: 0,
    onError: ({ error }) => {
      failure = error;
    },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = await result.text;
  if (failure) throw failure;
  return text;
}
