# pixellab.ai API Guide

How to call the pixellab API locally to generate assets for the Dragon Warrior talk game.

---

## Setup

### Get your API token

Log into pixellab.ai → Account Settings → copy your API token.

### Store it safely

```bash
# .env.development.secrets  (never commit this)
PIXELLAB_SECRET=your-token-here
```

### Install the Python SDK

```bash
pip install pixellab pillow
```

---

## Authentication

All requests use `Authorization: Bearer <token>` on the base URL `https://api.pixellab.ai/v2`.

**Python SDK:**
```python
import pixellab

client = pixellab.Client.from_env_file(".env.development.secrets")
# or: pixellab.Client.from_env()          # reads PIXELLAB_SECRET env var
# or: pixellab.Client(secret="tok_...")   # inline
```

**curl:**
```bash
curl -X POST https://api.pixellab.ai/v2/create-image-pixen \
  -H "Authorization: Bearer $PIXELLAB_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"description": "...", "image_size": {"width": 32, "height": 32}}'
```

### Check your balance first

```bash
curl https://api.pixellab.ai/v2/balance \
  -H "Authorization: Bearer $PIXELLAB_SECRET"
```

Returns `credits` (USD) and subscription generations remaining.

---

## Sync vs async endpoints

| Response | Meaning | What to do |
|----------|---------|------------|
| `200` | Image returned immediately in body | Read `response["image"]` |
| `202` | Background job started | Poll `GET /v2/background-jobs/{job_id}` until `status == "completed"`, then read `last_response` |

Most character/tileset endpoints are `202` (async). Simple generation (Pixen, Pixflux) is `200` (sync).

**Polling pattern:**
```python
import time, requests, os

def poll(job_id, token, interval=3):
    url = f"https://api.pixellab.ai/v2/background-jobs/{job_id}"
    headers = {"Authorization": f"Bearer {token}"}
    while True:
        r = requests.get(url, headers=headers).json()
        if r["status"] == "completed":
            return r["last_response"]
        if r["status"] == "failed":
            raise RuntimeError(f"Job failed: {r}")
        time.sleep(interval)
```

---

## Image format

All images in/out are base64-encoded PNG:

```python
# Input image (e.g. a reference sprite you already have)
import base64

def img_to_b64(path):
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    return {"type": "base64", "base64": f"data:image/png;base64,{data}"}

# Output image → save to file
from PIL import Image
import io

def save_b64(b64_obj, path):
    data = b64_obj["base64"].split(",", 1)[1]
    img = Image.open(io.BytesIO(base64.b64decode(data)))
    img.save(path)
```

---

## Endpoints used for this project

### Pixen — single 32×32 sprite (sync, fast)

Best for: enemy sprites, NPC seeds, FX frames. Returns immediately.

```bash
curl -X POST https://api.pixellab.ai/v2/create-image-pixen \
  -H "Authorization: Bearer $PIXELLAB_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "NES pixel art, Dragon Warrior style, front-facing battle enemy, green slime blob, glowing eyes, 4-color palette, chunky pixels",
    "image_size": {"width": 32, "height": 32},
    "view": "low_top_down",
    "direction": "south",
    "detail": "low",
    "outline": "default",
    "no_background": true
  }'
```

**Key parameters:**

| Param | Values | Notes |
|-------|--------|-------|
| `view` | `none`, `side`, `low_top_down`, `high_top_down` | Use `low_top_down` for Dragon Warrior camera |
| `direction` | `south`, `north`, `east`, `west`, `south_east`, etc. | Starting direction for characters |
| `detail` | `low`, `medium`, `high` | Use `low` or `medium` to avoid overworked NES sprites |
| `outline` | `default`, `none`, `bold` | `bold` helps at 32×32 |
| `no_background` | `true` / `false` | Always `true` for sprites |

---

### 8-direction character (async)

Best for: Jon (hero), any character that walks in all directions.

The `directions` object lets you optionally supply reference images per direction — leave it empty to generate from scratch.

```python
import requests, os

token = os.environ["PIXELLAB_SECRET"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

payload = {
    "description": "NES pixel art, Dragon Warrior style hero, blue-grey tunic, sword at side, brown hair, no helmet, small humanoid, chunky pixels, 4-color palette",
    "image_size": {"width": 32, "height": 32},
    "view": "low_top_down",
    "outline": "bold",
    "detail": "low",
    "shading": "medium",
}

r = requests.post(
    "https://api.pixellab.ai/v2/create-character-with-8-directions",
    headers=headers, json=payload
)
job = r.json()
result = poll(job["id"], token)

# result has keys: south, south_west, west, north_west, north, north_east, east, south_east
# each is a base64 image object
for direction, img in result.items():
    save_b64(img, f"assets/hero_{direction}.png")
```

**Proportions presets:** `chibi`, `cartoon`, `stylized`, `realistic_male`, `realistic_female`, `heroic` — try `chibi` or `cartoon` for the NES chunky look.

---

### Animate with text (sync, 4 frames)

Best for: walk cycles per direction, enemy idle flicker, FX strips. Returns 4 frames at 64×64.

```python
# First generate a 64×64 version of the character (Pixen),
# then feed it as reference_image here.
payload = {
    "description": "NES pixel art hero walking",
    "action": "walk cycle, looping",
    "view": "low_top_down",
    "direction": "south",
    "image_size": {"width": 64, "height": 64},
    "reference_image": img_to_b64("assets/hero_south_64.png"),
    "n_frames": 4,
}
r = requests.post(
    "https://api.pixellab.ai/v2/animate-with-text",
    headers=headers, json=payload
)
frames = r.json()  # list of 4 base64 images
for i, frame in enumerate(frames["frames"]):
    save_b64(frame, f"assets/hero_walk_south_{i}.png")
```

For the **enemy idle flicker** (flaky-test sprite):
```python
payload = {
    "description": "green slime blob pixel art, unstable flickering",
    "action": "idle, subtle wobble and flicker",
    "view": "none",
    "direction": "south",
    "image_size": {"width": 64, "height": 64},
    "reference_image": img_to_b64("assets/enemy-flaky-test.png"),
    "n_frames": 4,
}
```

---

### Top-down tileset (async)

Best for: `tileset.png` — generates 16–23 seamlessly-connecting tiles.

```python
payload = {
    "lower_description": "stone castle floor, grey cobblestones, NES pixel art, Dragon Warrior style, 4-color palette",
    "upper_description": "dark stone brick wall, castle interior, NES pixel art",
    "transition_description": "stone floor meets wall base, corner tiles",
    "tile_size": 32,
    "view": "low_top_down",
    "outline": "bold",
    "shading": "medium",
    "detail": "low",
}

r = requests.post(
    "https://api.pixellab.ai/v2/create-tileset",
    headers=headers, json=payload
)
job = r.json()
result = poll(job["id"], token)
# result["tiles"] is a list of base64 images
```

Generate two tilesets separately (castle interior, overworld) then stitch in Aseprite.

---

### Style-locked generation (Bitforge, sync)

Once Jon's hero sprite looks right, use Bitforge to keep all other assets style-consistent.

```python
payload = {
    "description": "NES pixel art, Dragon Warrior style NPC king, south-facing, seated on throne, red robe, gold crown, white beard",
    "image_size": {"width": 32, "height": 32},
    "style_image": img_to_b64("assets/hero_south.png"),  # reference for style lock
}

r = requests.post(
    "https://api.pixellab.ai/v2/create-image-bitforge",
    headers=headers, json=payload
)
save_b64(r.json()["image"], "assets/npc-king.png")
```

---

### UI elements (async, Pro)

For the speech bubble frame:

```python
payload = {
    "description": "pixel art dialogue box frame, Dragon Warrior NES style, dark background, light pixel border 2px, rectangular, no interior content, transparent outside border",
    "image_size": {"width": 96, "height": 48},
}

r = requests.post(
    "https://api.pixellab.ai/v2/generate-ui-v2",
    headers=headers, json=payload
)
job = r.json()
result = poll(job["id"], token)
save_b64(result["image"], "assets/ui-speechbubble.png")
```

---

### Prompt enhancement (optional, $0.002)

Run before the main generation if a prompt isn't working:

```bash
curl -X POST https://api.pixellab.ai/v2/enhance-pixen-prompt \
  -H "Authorization: Bearer $PIXELLAB_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"description": "NES pixel art Dragon Warrior hero"}'
# returns: {"description": "<expanded prompt>"}
```

Use the returned description in the actual generation call. Log both prompts in `prompt-log.md`.

---

## Common errors

| Code | Cause | Fix |
|------|-------|-----|
| `401` | Invalid or missing token | Check `PIXELLAB_SECRET` |
| `402` | Out of credits | Check `/balance`; add credits |
| `422` | Bad parameters | Check image dimensions (must be multiples of 4 for Pixen; size limits per endpoint) |
| `429` / `529` | Rate limit / concurrency | Wait and retry; only a few concurrent jobs allowed |
| `423` | Job not ready | Keep polling |

---

## Complete script skeleton

Save as `scripts/generate-asset.py` (not committed; uses `.env.development.secrets`).

```python
#!/usr/bin/env python3
"""Quick script for generating a single pixellab asset."""

import base64, io, os, time, requests
from PIL import Image
from dotenv import load_dotenv

load_dotenv(".env.development.secrets")
TOKEN = os.environ["PIXELLAB_SECRET"]
BASE  = "https://api.pixellab.ai/v2"
H     = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

def img_to_b64(path):
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    return {"type": "base64", "base64": f"data:image/png;base64,{data}"}

def save_b64(obj, path):
    data = obj["base64"].split(",", 1)[1]
    Image.open(io.BytesIO(base64.b64decode(data))).save(path)

def poll(job_id, interval=3):
    while True:
        r = requests.get(f"{BASE}/background-jobs/{job_id}", headers=H).json()
        print(f"  [{job_id}] {r['status']}")
        if r["status"] == "completed": return r["last_response"]
        if r["status"] == "failed":    raise RuntimeError(r)
        time.sleep(interval)

def post(endpoint, payload):
    r = requests.post(f"{BASE}/{endpoint}", headers=H, json=payload)
    r.raise_for_status()
    body = r.json()
    if r.status_code == 202:  # async
        return poll(body["id"])
    return body

# --- edit below ---

result = post("create-image-pixen", {
    "description": "NES pixel art, Dragon Warrior style, front-facing battle enemy, green slime blob, glowing red eyes, 4-color palette, chunky pixels, no background",
    "image_size": {"width": 32, "height": 32},
    "view": "low_top_down",
    "direction": "south",
    "detail": "low",
    "outline": "bold",
    "no_background": True,
})

save_b64(result["image"], "client-talks/public/rpg/assets/enemy-flaky-test.png")
print("Saved.")
```

Install `python-dotenv` if not present: `pip install python-dotenv`.
