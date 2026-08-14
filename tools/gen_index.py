#!/usr/bin/env python3
"""Regenerates index.json from games/*/manifest.json (runs validate.py first).
The index is what the app fetches to render the Library; keep it generated,
never hand-edited."""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    validate = subprocess.run([sys.executable, str(ROOT / "tools" / "validate.py")])
    if validate.returncode != 0:
        sys.exit(validate.returncode)

    games = []
    for game_dir in sorted(p for p in (ROOT / "games").iterdir() if p.is_dir()):
        m = json.loads((game_dir / "manifest.json").read_text())
        games.append({
            "slug": m["slug"],
            "name": m["name"],
            "version": m["version"],
            "minSchemaVersion": m["schemaVersion"],
            "cover": "cover.png",
        })

    index = {"games": games}
    (ROOT / "index.json").write_text(json.dumps(index, indent=2) + "\n")
    print(f"index.json written ({len(games)} game(s))")


if __name__ == "__main__":
    main()
