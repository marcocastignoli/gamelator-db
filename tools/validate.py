#!/usr/bin/env python3
"""Validates every games/*/manifest.json. Stdlib-only so contributors can run it
with a bare python3; if the `jsonschema` package happens to be installed it is
also run against schema/manifest.schema.json for full coverage."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SUPPORTED_SCHEMA_VERSION = 1

errors = []


def err(slug, msg):
    errors.append(f"games/{slug}: {msg}")


def check_manifest(game_dir):
    slug = game_dir.name
    mf = game_dir / "manifest.json"
    if not mf.is_file():
        err(slug, "manifest.json missing")
        return None
    try:
        m = json.loads(mf.read_text())
    except json.JSONDecodeError as e:
        err(slug, f"manifest.json is not valid JSON: {e}")
        return None

    def need(key, typ):
        if key not in m:
            err(slug, f"missing required field '{key}'")
            return None
        if not isinstance(m[key], typ):
            err(slug, f"field '{key}' has wrong type (expected {typ.__name__})")
            return None
        return m[key]

    schema_version = need("schemaVersion", int)
    if schema_version is not None and schema_version > SUPPORTED_SCHEMA_VERSION:
        err(slug, f"schemaVersion {schema_version} is newer than this tooling supports")
    if need("slug", str) is not None and m["slug"] != slug:
        err(slug, f"slug '{m['slug']}' does not match directory name")
    if need("slug", str) is not None and not re.fullmatch(r"[a-z0-9][a-z0-9-]*", m["slug"]):
        err(slug, "slug must be lowercase [a-z0-9-]")
    need("name", str)
    version = need("version", int)
    if version is not None and version < 1:
        err(slug, "version must be >= 1")

    detection = need("detection", dict)
    if detection is not None:
        if not isinstance(detection.get("requiredFiles"), list) or not detection["requiredFiles"]:
            err(slug, "detection.requiredFiles must be a non-empty list")
        if not isinstance(detection.get("exeName"), str):
            err(slug, "detection.exeName must be a string")

    container = need("container", dict)
    if container is not None:
        for field in ("screenSize", "graphicsDriver", "dxwrapper", "box64Preset"):
            if not isinstance(container.get(field), str):
                err(slug, f"container.{field} must be a string")
        if not isinstance(container.get("startupSelection"), int):
            err(slug, "container.startupSelection must be an integer")
        if isinstance(container.get("screenSize"), str) and \
                not re.fullmatch(r"[0-9]+x[0-9]+", container["screenSize"]):
            err(slug, "container.screenSize must look like 960x432")

    for asset in m.get("assets", []):
        if not isinstance(asset, dict):
            err(slug, "assets entries must be objects")
            continue
        if not str(asset.get("url", "")).startswith("https://"):
            err(slug, f"asset '{asset.get('id')}' url must be https")
        if not re.fullmatch(r"[0-9a-f]{64}", str(asset.get("sha256", ""))):
            err(slug, f"asset '{asset.get('id')}' needs a pinned lowercase sha256")

    # referenced files must exist and be inside the game directory
    for key in ("controlsProfile", "patchScript"):
        rel = m.get(key)
        if rel is None:
            continue
        target = (game_dir / rel).resolve()
        if game_dir.resolve() not in target.parents:
            err(slug, f"{key} escapes the game directory")
        elif not target.is_file():
            err(slug, f"{key} references missing file '{rel}'")
    if not (game_dir / "cover.png").is_file():
        err(slug, "cover.png missing (use tools/gen_cover.py for a placeholder)")
    return m


def try_jsonschema(manifests):
    try:
        import jsonschema
    except ImportError:
        return
    schema = json.loads((ROOT / "schema" / "manifest.schema.json").read_text())
    for slug, m in manifests:
        for e in jsonschema.Draft7Validator(schema).iter_errors(m):
            err(slug, f"schema: {e.message}")


def main():
    game_dirs = sorted(p for p in (ROOT / "games").iterdir() if p.is_dir())
    if not game_dirs:
        print("no games found", file=sys.stderr)
        sys.exit(1)
    manifests = []
    for game_dir in game_dirs:
        m = check_manifest(game_dir)
        if m is not None:
            manifests.append((game_dir.name, m))
    try_jsonschema(manifests)
    if errors:
        for e in errors:
            print("ERROR:", e, file=sys.stderr)
        sys.exit(1)
    print(f"OK: {len(manifests)} game(s) valid")


if __name__ == "__main__":
    main()
