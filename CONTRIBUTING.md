# Adding a game to Gamelator

Every game lands via a reviewed PR. One game per PR.

## Steps

1. Create `games/<slug>/` — slug is lowercase `[a-z0-9-]`, short, and stable
   (it becomes the container name and cache key; it can never change).
2. Write `manifest.json` against `schema/manifest.schema.json`. Start from
   `games/wow-335a/manifest.json` as the reference.
   - `detection.requiredFiles`: the smallest set of files/dirs that reliably
     identifies the game folder.
   - `container`: a setup you actually verified on a real device. Note the device
     in the PR description. `graphicsDriver: "auto"` picks Turnip on Adreno and
     Vortek elsewhere — prefer it unless the game needs a specific driver.
   - Old d3d9 games often need `dxwrapperConfig: "version=1.10.3"` — the per-launch
     DXVK probe can pick 2.4.1 and cost textures/perf.
3. Export a touch profile from Winlator/Gamelator's controls editor, tuned for the
   game, as `controls.icp`.
4. Cover: run `python3 tools/gen_cover.py <slug> <LINE1> [LINE2]`. Stylized text
   only — **no box art, no logos** (licensing).
5. Assets (optional): only `https://` URLs of files the game needs (addons, patches),
   each with its sha256 (`shasum -a 256 file`). The app downloads and verifies them;
   scripts only ever see verified copies.
6. `patch.js` (optional): provisioning logic against the sandbox API
   (`game.*`, `config.*`, `assets.get`, `state.*`, `accounts.forEach`, `log`).
   Keep it idempotent — it re-runs whenever the manifest `version` bumps.
7. Run `python3 tools/gen_index.py` (validates everything, regenerates `index.json`)
   and commit the result.

## PR checklist

- [ ] `tools/gen_index.py` passes and `index.json` is regenerated
- [ ] slug == directory name; never reused from another game
- [ ] container settings verified on a real device (named in the PR)
- [ ] every asset URL is https and its sha256 is pinned
- [ ] no copyrighted art in `cover.png`
- [ ] `patch.js` (if any) is idempotent and only touches the game folder
- [ ] `notes` tell the player anything surprising (first-login steps, known limits)

## Review rules (maintainers)

- Diffs to `manifest.json` and `patch.js` are the security surface — read them fully.
- New/changed asset URLs: download, hash, compare against the manifest before merging.
- After merge: fast-forward `stable` once the entry is sanity-checked in the app.
