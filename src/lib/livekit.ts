/**
 * LiveKit connection helper.
 *
 * Tokens are minted by LiveKit Cloud's sandbox token endpoint — no LiveKit API
 * key or secret is ever present in frontend code. This is the MVP token helper
 * carried over from the previous ArenaHub implementation.
 */
const SANDBOX_ID = "arenahub-2188st";
const CONNECTION_DETAILS_ENDPOINT = "https://cloud-api.livekit.io/api/sandbox/connection-details";

export type LiveKitConnection = {
  serverUrl: string;
  token: string;
};

export async function getLiveKitConnection({
  roomName,
  participantName,
}: {
  roomName: string;
  participantName: string;
}): Promise<LiveKitConnection> {
  const url = new URL(CONNECTION_DETAILS_ENDPOINT);
  url.searchParams.set("roomName", roomName);
  url.searchParams.set("participantName", participantName);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "X-Sandbox-ID": SANDBOX_ID },
  });

  if (!res.ok) {
    throw new Error(`Could not reach the streaming server (${res.status})`);
  }

  const data = (await res.json()) as {
    serverUrl?: string;
    url?: string;
    participantToken?: string;
    token?: string;
  };

  const serverUrl = data.serverUrl || data.url;
  const token = data.participantToken || data.token;

  if (!serverUrl || !token) {
    throw new Error("The streaming server returned an invalid response");
  }

  return { serverUrl, token };
}
