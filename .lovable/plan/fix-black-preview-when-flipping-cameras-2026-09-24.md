# Fix black preview when flipping cameras

## Changes
- Release the current camera before requesting the opposite lens, avoiding mobile browsers returning a black second camera track.
- Preserve the existing microphone track and live room connection during the switch.
- Reattach and explicitly resume the local preview after the replacement camera becomes active.
- If switching fails, request the previous camera again and restore both the broadcast and preview.

## Verification
- Confirm the app builds cleanly.
- Exercise repeated camera flips with simulated mobile media and verify the stream remains live, audio is retained, and the preview video stays playable.
