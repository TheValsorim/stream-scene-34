# Live Stream Hub

I want to completely rebuild the ArenaHub app into a very simple streaming platform.

I have attached a technical-context file containing relevant parts of the existing ArenaHub source code. Use it as a reference for the existing streaming implementation, especially LiveKit, Supabase, public watch links, stream records, heartbeat handling and viewer connections.

Do NOT recreate the old ArenaHub product.

CORE PRODUCT

The new ArenaHub has only two main purposes:

Users can watch currently live streams.

Authenticated users can start their own live stream.

Remove the tournament platform completely.

MAIN USER EXPERIENCE

Public landing page

The landing page should immediately explain the product in very simple terms:

"Watch live streams or start streaming yourself."

Use two main actions:

Watch Live

Start Streaming

Keep ArenaHub branding, but redesign the page to be minimal, modern and focused entirely on streaming.

Remove all references to:

tournaments

competitions

teams

organizers

esports competitions

registration for events

match centers

pricing plans

subscriptions

creator plans

AUTHENTICATION

Keep Supabase authentication.

Support:

Email/password login

Email/password registration

Google login

All authenticated users should automatically be allowed to stream.

There should be NO creator role or "creator mode".

Use Supabase as the authentication/backend system.

Do not use Base44 for the new application.

NAVIGATION

After login, keep the application extremely simple.

Main navigation should contain only:

Live

Shows currently active public live streams.

Stream

The user's streaming area.

Account/logout can be placed in a small profile/account menu.

There should be no large sidebar containing the old application modules.

LIVE PAGE

The Live page displays currently active streams.

Each stream card should contain:

title

LIVE badge

viewer count when available

simple thumbnail/preview area

Clicking a live stream must open the public watch page using:

/watch/:public_share_id

Do NOT link to /streams/:id.

The Live page should automatically refresh the stream list using polling or Supabase realtime so that newly started streams appear without manually refreshing the browser.

Only show streams that are:

public

currently live

STREAM PAGE

The Stream page is the user's complete broadcaster interface.

When the page opens, show two large options:

Share Screen

Camera

The user selects one of these two modes.

After selecting a mode:

enter stream title

request the required browser permissions

show a local preview

start the stream

show LIVE status

show viewer count

show public watch link

provide Copy Link

provide End Stream

Keep the entire process simple.

SCREEN STREAMING

The new "Share Screen" mode must NOT use the old OBS/RTMP workflow.

Instead, implement direct browser screen capture using:

navigator.mediaDevices.getDisplayMedia()

Then publish the captured screen track through the existing LiveKit room/stream architecture.

Reuse the existing LiveKit connection/token mechanism from the reference code.

The stream should be represented in the existing streams table in the same general way as the existing camera streams.

Suggested stream mode:

screen

If screen capture is unavailable or permission is denied, display a clear error message.

Do not silently fail.

CAMERA STREAMING

Reuse the existing working camera streaming architecture from the reference project.

The existing PhoneBroadcaster.jsx already contains important working logic for:

getUserMedia

camera preview

microphone

LiveKit room connection

publishing video

publishing audio

heartbeat

viewer count

camera switching

ending the stream

pagehide/beforeunload cleanup

Keep the proven behavior, but simplify the UI and remove all unnecessary tournament-related fields.

Suggested stream mode:

camera

A camera stream should not require:

competition

discipline

category

match

creator role

organizer role

The user should only need a title.

LIVEKIT / HOST STRUCTURE

This is extremely important:

Do NOT replace the existing streaming architecture with another provider.

Keep the existing:

Supabase stream record
→ LiveKit room
→ broadcaster participant
→ viewer participants
→ public watch URL

Keep the existing LiveKit connection helper concept.

The existing getLiveKitConnection() implementation should be reused or simplified rather than replacing the system.

Do not expose LiveKit API secrets in frontend code.

The existing sandbox token helper can remain for the MVP.

STREAM DATABASE

Reuse the existing streams table.

Do not create a second parallel streaming table unless absolutely necessary.

Preserve the existing concepts:

creator/user id

title

public_share_id

livekit_room_name

stream_provider

stream_mode

device_type

status

stream_health

is_public

viewer_count

started_at

last_heartbeat_at

ended_at

ended_reason

The new application should use simple stream modes such as:

screen

camera

Maintain compatibility with existing LiveKit stream records where practical.

Do not delete or redesign the existing database blindly.

First inspect the existing structure and reuse it.

HEARTBEAT / STREAM CLEANUP

Keep the current heartbeat architecture.

The broadcaster should periodically update:

last_heartbeat_at

status

stream_health

viewer_count

Keep stale-stream detection.

Keep explicit End Stream handling.

Keep browser lifecycle cleanup as a best-effort mechanism:

pagehide

beforeunload

When the broadcaster disconnects unexpectedly, the stream should eventually be considered ended/stale.

VIEWER

Keep the existing public Watch page concept.

Route:

/watch/:public_share_id

The viewer does NOT need to log in.

The Watch page should:

Load the stream from Supabase using public_share_id.

Get the LiveKit connection details.

Join the corresponding LiveKit room.

Subscribe to the video/audio tracks.

Display the stream.

Show simple connection states:

Connecting

Live

Waiting for stream

Stream ended

Connection error

Handle browser autoplay restrictions with a simple "Tap to play" action.

Keep this part of the existing implementation because it is already working.

ROUTING

Use a simple routing structure:

/
Landing page

/login

/register

/live
Live streams

/stream
Broadcaster page

/watch/:public_share_id
Public viewer

Authenticated:

/live

/stream

Public:

/

/login

/register

/watch/:public_share_id

REMOVE COMPLETELY

Delete the old product architecture and pages related to:

competitions

competition details

create competition

teams

team membership

matches

match center

organizer dashboard

organizer plans

creator dashboard

creator mode

pricing

subscriptions

tournament registration

admin tournament management

competition categories/disciplines

tournament notifications

Base44 entities

Base44 SDK

unnecessary dashboard components

Do not preserve these simply because they exist in the old code.

UI DIRECTION

The application should feel like a simple modern streaming platform.

Prioritize:

large clear buttons

simple navigation

clean stream cards

large video player

obvious LIVE status

minimal forms

responsive desktop and mobile UI

Do not create a complicated dashboard.

The user should understand the entire app within a few seconds.

IMPORTANT IMPLEMENTATION RULE

This is a REBUILD.

Do not visually copy every old screen.

Keep the existing technical streaming/hosting architecture where it works.

Replace the product structure with the simple streaming-focused experience described above.

Before making major architectural changes, inspect the attached existing streaming code and reuse the working parts.

Build the first version around this exact flow:

LANDING
→ LOGIN
→ LIVE
→ WATCH STREAM

or

LANDING
→ LOGIN
→ STREAM
→ SHARE SCREEN / CAMERA
→ GO LIVE
→ PUBLIC WATCH LINK
→ END STREAM

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://stream-scene-34.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d9019fc5-e30e-4292-a921-5e9fdbf73fc6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
