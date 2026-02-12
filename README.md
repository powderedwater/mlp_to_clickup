# MLP to ClickUp (Tauri + Vite)

Desktop workflow tool for parsing MLP source files and creating ClickUp tasks/subtasks through a Tauri shell.

## Prerequisites

### Runtime/toolchain

- **Node.js:** 20.x LTS (recommended), with npm 10+.
- **Rust:** stable toolchain with `cargo` (project currently targets `rust-version = 1.77` in `src-tauri/Cargo.toml`).
- **Tauri CLI:** use via `npx tauri ...` or install globally (`cargo install tauri-cli --version '^2.0.0'`).

### Tauri system dependencies by OS

Install the official Tauri prerequisites for your OS before first build:

- **macOS**
  - Xcode Command Line Tools (`xcode-select --install`)
- **Windows**
  - Microsoft C++ Build Tools (Visual Studio Build Tools with C++ workload)
  - WebView2 (normally preinstalled on current Windows 11; install Evergreen runtime if missing)
- **Linux** (package names vary by distro)
  - `webkit2gtk` development packages
  - `glib2`, `gtk3`, `libsoup`, and related build essentials (`gcc`, `make`, `pkg-config`, etc.)

> Tip: if in doubt, follow the current upstream Tauri v2 prerequisite matrix for your platform.

## Installation

1. Install JS dependencies:

   ```bash
   npm install
   ```

2. Ensure Rust is available:

   ```bash
   rustup toolchain install stable
   rustup default stable
   ```

3. (Optional) Add Tauri CLI globally:

   ```bash
   cargo install tauri-cli --version '^2.0.0'
   ```

## Running in development

### Frontend only (Vite)

```bash
npm run dev
```

### Full desktop shell (Tauri + frontend)

```bash
npx tauri dev
```

Tauri is configured to expect:
- frontend dev server at `http://localhost:5173`
- `npm run dev` as `beforeDevCommand`

If those scripts are missing locally, add appropriate `dev`/`build` scripts in `package.json` (for example Vite defaults).

## Production builds

Build distributables with Tauri:

```bash
npx tauri build
```

Artifacts are emitted to:

- **Frontend static bundle:** `dist/`
- **Rust build outputs:** `src-tauri/target/release/`
- **Installer/app bundles:** `src-tauri/target/release/bundle/`

## Troubleshooting

### 1) Keychain/store plugin invocation issues

Symptoms:
- errors around `plugin:keychain|...` or `plugin:store|...`
- token save/read fails in desktop runtime

Checks:
- verify required Tauri plugins are added to Rust/JS setup
- confirm plugin initialization is present in Tauri app bootstrap
- if keychain fails, the app falls back to encrypted local storage (`encrypted_clickup_token`)

### 2) Token persists unexpectedly / not cleared

- clear both keychain entry and fallback store entry
- verify service/account naming consistency (`mlp_to_clickup` / `clickup_token`)

### 3) Parser dependency errors (`mammoth`, `xlsx`)

Symptoms:
- runtime module not found
- parse failures for `.docx` or `.xlsx`

Checks:
- run `npm install` to ensure parser deps are present
- confirm incoming file types are valid binary payloads (`ArrayBuffer`, `Uint8Array`, or `Buffer`)
- verify Excel sheet includes required headers (`Video Number`, `Lecture Name`, `Lecture Type`) or configured remaps

### 4) Tauri dev/build command fails immediately

- ensure `package.json` contains `dev` and `build` scripts expected by `src-tauri/tauri.conf.json`
- ensure Node, Rust, and OS-level Tauri prerequisites are installed

## Project completion checklist

Use this before declaring a workflow release-ready:

- [ ] **Token flow**
  - [ ] Token can be saved, validated (`GET /user`), loaded on restart, and cleared.
- [ ] **Destination selection**
  - [ ] User can browse/select workspace → space → folder/list destination.
  - [ ] “List” auto-resolution and persistence behavior validated.
- [ ] **Parser validation**
  - [ ] Word template parser extracts labels/notes and reports missing fields.
  - [ ] Excel parser validates required headers, row patterns, and unknown media types.
- [ ] **Preflight checks**
  - [ ] Unknown media types, missing mappings, and blocking conditions are surfaced before create.
- [ ] **Creation pipeline**
  - [ ] Parent task and ordered subtasks are created.
  - [ ] Partial failures are handled and reported without silent data loss.
- [ ] **Results reporting**
  - [ ] Final report includes created IDs/links, skipped rows, warnings, and failure reasons.
