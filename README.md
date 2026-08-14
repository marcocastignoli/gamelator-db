# gamelator-db

The community game database for [Gamelator](https://github.com/marcocastignoli/gamelator)
— the Lutris of Android. Each game entry teaches the app how to set up a game the user
already owns: detection rules, a tuned Winlator container, a touch-gamepad layout, and
optionally a sandboxed provisioning script. The app fetches this repo at runtime, so new
games arrive without app updates.

## Layout

```
index.json                      generated Library listing — never hand-edit
schema/manifest.schema.json     JSON Schema for game manifests
games/<slug>/
  manifest.json                 everything declarative
  controls.icp                  Winlator touch-controls profile
  cover.png                     stylized text cover (tools/gen_cover.py)
  patch.js                      optional sandboxed provisioning script
tools/                          validate.py · gen_index.py · gen_cover.py (stdlib only)
```

## How the app consumes this repo

- The app follows the **`stable` branch**, not HEAD of main: merges land on `main`,
  and `stable` is fast-forwarded to it once sanity-checked, so one bad merge is never
  instantly live.
- Files are fetched raw (raw.githubusercontent / jsDelivr) with ETag caching —
  no GitHub API involved.
- `minSchemaVersion` in the index hides games that need a newer app.
- Bump a manifest's `version` to make installed apps re-run provisioning.

## Security model (do not water down)

- Everything that configures the app — container settings, controls profile, settings
  UI, asset list — is **declarative only**.
- `patch.js` runs in the app's QuickJS sandbox: no filesystem, network, process or
  timer access; only a path-jailed API over the user's chosen game folder plus
  read-only handles to assets the **app** downloaded and verified against the
  **sha256 pinned in the manifest**. Swapping a URL after review fails the hash check.
- Reviewers: treat `manifest.json` diffs as the security surface; the checklist in
  CONTRIBUTING.md is the gate.

## Adding a game

See [CONTRIBUTING.md](CONTRIBUTING.md).
