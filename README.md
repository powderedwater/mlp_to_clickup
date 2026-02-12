# MLP to ClickUp Desktop (Tauri + React)

This repository contains a Tauri desktop app shell with a React + TypeScript frontend and Rust backend bootstrap.

## Features

- React + TypeScript frontend with routing shell.
- Tauri v2 backend shell in `src-tauri`.
- Shared app layout with screens for:
  - Settings
  - Run Wizard
  - Results
- Basic app state container with:
  - Persisted settings bootstrap from `localStorage`
  - Wizard flow step state

## Local development & build commands

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run frontend dev server only:

   ```bash
   npm run dev
   ```

3. Launch Tauri desktop window in development mode:

   ```bash
   npm run tauri:dev
   ```

4. Build frontend assets:

   ```bash
   npm run build
   ```

5. Build desktop application bundle:

   ```bash
   npm run tauri:build
   ```

6. Lint and format:

   ```bash
   npm run lint
   npm run format:check
   npm run format
   ```
