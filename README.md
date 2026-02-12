# ClickUp service layer

This repository now includes a JavaScript service layer intended for a Tauri app:

- `ClickUpClient`: typed-style API wrapper with shared request helper and exponential backoff on `429` rate limits.
- `SettingsService` + `SecureTokenStore`: token validation via `GET /user`, keychain-first persistence, encrypted local fallback.
- `DestinationService`: workspace/space/folder browsing, auto-resolution for list named exactly `List`, persisted last-selected space.
- `CreationPipelineService`: parent task + ordered subtasks, media type custom field resolution, preflight unknown media types, partial-failure tolerant execution, and final reporting.

See `src/index.js` exports for integration points.
