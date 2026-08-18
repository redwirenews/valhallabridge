#!/usr/bin/env python3
"""Add a card under p/<slug>/ and append catalog.json.

The editor publish button will call this, then commit and push.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SITE_PATH = ROOT / "site.json"
CATALOG_PATH = ROOT / "catalog.json"
TEMPLATE_PATH = ROOT / "templates" / "card.html"
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text())


def write_json(path: Path, data) -> None:
    text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    fd, tmp = tempfile.mkstemp(prefix=path.name + ".", dir=str(path.parent))
    tmp_path = Path(tmp)
    try:
        os.close(fd)
        tmp_path.write_text(text)
        tmp_path.replace(path)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise


def slugify_ok(slug: str, reserved: list[str]) -> str:
    slug = slug.strip().lower()
    if not SLUG_RE.match(slug) or len(slug) > 64:
        raise SystemExit(
            "slug must be 1–64 chars of lowercase letters, numbers, and hyphens"
        )
    if slug in reserved:
        raise SystemExit(f"slug '{slug}' is reserved")
    return slug


def image_size(path: Path) -> tuple[int, int]:
    try:
        from PIL import Image
    except ImportError:
        return 1200, 628
    with Image.open(path) as im:
        return im.size


def render(template: str, mapping: dict[str, str]) -> str:
    out = template
    for key, value in mapping.items():
        out = out.replace("{{" + key + "}}", value)
    if "{{" in out:
        raise SystemExit("template still has unreplaced placeholders")
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a valhallabridge card")
    parser.add_argument("--slug", required=True)
    parser.add_argument("--image", required=True, type=Path)
    parser.add_argument("--text", required=True)
    parser.add_argument("--alt", default="")
    parser.add_argument("--force", action="store_true", help="overwrite an existing slug")
    args = parser.parse_args()

    site = load_json(SITE_PATH, {})
    origin = site.get("origin", "").rstrip("/")
    if not origin:
        raise SystemExit("site.json is missing origin")

    slug = slugify_ok(args.slug, site.get("reserved", []))
    image = args.image.expanduser().resolve()
    if not image.is_file():
        raise SystemExit(f"image not found: {image}")

    dest = ROOT / "p" / slug
    if dest.exists() and not args.force:
        raise SystemExit(f"card already exists: {dest.relative_to(ROOT)}")

    dest.mkdir(parents=True, exist_ok=True)
    ext = image.suffix.lower()
    if ext not in {".png", ".jpg", ".jpeg", ".webp"}:
        raise SystemExit("image must be png, jpg, or webp")
    image_name = "card.jpg" if ext in {".jpg", ".jpeg"} else f"card{ext}"
    dest_image = dest / image_name
    shutil.copyfile(image, dest_image)

    width, height = image_size(dest_image)
    text = args.text.strip()
    alt = (args.alt or text).strip()
    canonical = f"{origin}/p/{slug}/"
    image_url = f"{canonical}{image_name}"
    created = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    page = render(
        TEMPLATE_PATH.read_text(),
        {
            "CANONICAL": canonical,
            "TEXT": html.escape(text, quote=True),
            "TEXT_JS": json.dumps(text),
            "TEXT_ENC": quote(text, safe=""),
            "ALT": html.escape(alt, quote=True),
            "IMAGE_URL": image_url,
            "WIDTH": str(width),
            "HEIGHT": str(height),
        },
    )
    (dest / "index.html").write_text(page)

    meta = {
        "slug": slug,
        "text": text,
        "alt": alt,
        "created": created,
        "image": image_name,
        "width": width,
        "height": height,
        "url": canonical,
    }
    (dest / "meta.json").write_text(json.dumps(meta, indent=2) + "\n")

    catalog = load_json(
        CATALOG_PATH,
        {"version": 1, "origin": origin, "count": 0, "cards": []},
    )
    catalog["origin"] = origin
    catalog["cards"] = [c for c in catalog.get("cards", []) if c.get("slug") != slug]
    catalog["cards"].append(
        {
            "slug": slug,
            "text": text,
            "created": created,
            "image": f"/p/{slug}/{image_name}",
            "url": canonical,
        }
    )
    catalog["cards"].sort(key=lambda c: c.get("created", ""), reverse=True)
    catalog["count"] = len(catalog["cards"])
    write_json(CATALOG_PATH, catalog)

    print(canonical)


if __name__ == "__main__":
    try:
        main()
    except BrokenPipeError:
        sys.exit(0)
