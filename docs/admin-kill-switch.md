# Admin Kill Switch — Phase 1

This change provides cooperative client-side shutdown. When an admin ends a stream:
- Broadcaster receives Supabase Realtime stream updates (5-second polling fallback), disconnects LiveKit and stops local media.
- Public viewer receives Realtime updates and disconnects playback.
- Heartbeats never write `status=live` again, and all broadcaster updates are conditional on the stream still being live.
- Admin moderation end reasons remain intact.

**Manual database migration required:** After reviewing and before testing the live project, use ArenaHub's Lovable Cloud SQL editor to run [kill-switch-guard.sql](./kill-switch-guard.sql). GitHub sync does not execute this SQL. It prevents already-ended rows from being modified and makes repeated admin-end calls safe. Database changes affect the live project, so take a backup and verify the intended database.

## Manual QA
1. Open three sessions: an authenticated broadcaster, an anonymous viewer, and an admin.
2. Start a camera stream. Admin selects End stream; confirm both broadcaster media and viewer playback stop, and history shows `ended_by_admin`.
3. Wait 30 seconds; verify the row remains ended, no new heartbeats are accepted, and /live no longer lists it.
4. Repeat for screen share, multiple viewers, reconnects, and a backgrounded broadcaster tab.
5. Ban a user while streaming; check the stream stops and the ban prevents creating new streams.
6. End a new stream normally; verify history says `ended_by_user` and another new stream can start.
7. Interrupt Realtime to verify fallback polling.
8. Verify the backend row and LiveKit participants independently, not just the admin's toast.

## Known limitation — Phase 2
This is **not an enforced LiveKit room kill**. LiveKit sandbox token issuance is public and browsers can ignore the end signal. A malicious/unmodified client may still publish or reconnect directly to LiveKit. Production moderation requires a server-side room removal endpoint and server-issued role-scoped viewer/publisher tokens.
