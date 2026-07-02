# Asset Storage — Google Cloud Storage Structure

All static assets for My Backpack are stored in Google Cloud Storage (GCS). This document covers the bucket structure, naming conventions, file format requirements, and how assets are referenced in the codebase.

---

## Bucket Details

| Property | Value |
|---|---|
| **Bucket name** | `my-backpack-assets` |
| **Region** | `africa-south1` (Cape Town, South Africa) |
| **Access** | Public read — all assets are publicly accessible |
| **Public URL pattern** | `https://storage.googleapis.com/my-backpack-assets/[path]` |

The bucket is intentionally public-read. All content in My Backpack is educational material that learners access — there are no private assets stored in this bucket. User-specific data (profiles, progress, answers) is stored in MongoDB, not GCS.

---

## Full Folder Structure

```
my-backpack-assets/
├── branding/
│   ├── logos/           ← My Backpack logos in various formats
│   └── icons/           ← App icons, favicon variants
├── wallpapers/
│   ├── 1x1/             ← Square wallpapers
│   ├── portrait/        ← Portrait orientation (mobile)
│   └── landscape/       ← Landscape orientation (web/tablet)
├── ui/
│   └── illustrations/   ← UI illustrations, empty state images, onboarding visuals
│       └── bucket/       ← bucket/board UI illustrations (planned, not yet populated)
├── illustrations/         ← all illustration assets (avatars, DnD backgrounds, draggables) live under this one prefix
│   ├── avatars/           ← lesson avatar characters, one subfolder per avatarId
│   │   └── miss-tutor/
│   │       ├── happy.png
│   │       ├── sad.png
│   │       ├── serious.png
│   │       └── smiling.png
│   ├── drag-areas/       ← full-width backgrounds for the whole DnD widget (draggable tray + drop zone)
│   ├── drop-zones/       ← backgrounds for individual drop zones only — classroom-board.png is the
│   │                        universal default applied to every dnd_single drop zone
│   └── draggables/       ← reusable DnD asset library, organized by theme not subject
│       └── alphabet/
│           └── cartoon-grouped/  ← uppercase+lowercase pairs in one image, from Vecteezy
├── sounds/
│   ├── isizulu/
│   │   ├── vowels/       ← a.mp3, e.mp3, i.mp3, o.mp3, u.mp3
│   │   ├── questions/    ← khetha-umsindo-a.mp3, etc.
│   │   ├── feedback/     ← correct-a.mp3, try-again.mp3, etc.
│   │   ├── avatar/       ← zoe-drag-a.mp3, etc. (avatar dialogue audio)
│   │   └── consonants/   ← ba.mp3, be.mp3, bi.mp3, … cu.mp3
│   └── english/
│       ├── vowels/       ← a.mp3, e.mp3, i.mp3, o.mp3, u.mp3 (short vowel sounds)
│       ├── questions/    ← pick-sound-a.mp3, etc. (mcq_audio prompts)
│       └── cvc/          ← cat.mp3, sit.mp3, sun.mp3, etc. (CVC word pronunciations)
└── content/
    ├── vocab/            ← Vocabulary word pronunciation audio files
    ├── math/
    │   └── objects/      ← apple.png, cabbage.png, car.png, etc. (drag-intro images)
    └── english/
        ├── vowels/       ← card-a.png, card-e.png, … card-u.png (letter cards)
        └── cvc/          ← letter tile images for dnd_build questions
```

---

## Naming Conventions

Good asset naming prevents confusion as the content library grows. Always follow these conventions:

**Lowercase only** — no uppercase letters in file names or folder names.  
```
✅ isizulu-vowel-a.mp3
❌ IsiZulu-Vowel-A.mp3
```

**Hyphens, not spaces or underscores** — use hyphens between words.
```
✅ khetha-umsindo-a.mp3
❌ khetha_umsindo_a.mp3
❌ khetha umsindo a.mp3
```

**Descriptive names** — the file name should tell you what the file contains without opening it.
```
✅ isizulu-vowel-sound-a.mp3
❌ audio1.mp3
❌ file.mp3
```

**Include language and subject context in the path** — the folder structure provides context; don't duplicate it in the file name.
```
✅ sounds/isizulu/vowels/a.mp3    (path provides context)
❌ sounds/isizulu/vowels/isizulu-vowel-a.mp3  (redundant)
```

**Include full context in question-specific files** — question audio files may be used outside their folder context, so include more context.
```
✅ sounds/isizulu/questions/khetha-umsindo-a.mp3
```

---

## File Format Requirements

### Audio files

| Property | Requirement |
|---|---|
| **Format** | MP3 |
| **Bitrate** | 128kbps minimum |
| **Quality** | Clear, no background noise, no clipping |
| **Recording** | Native speaker for IsiZulu, clear enunciation |
| **Length** | Pronunciation audio: 1–3 seconds. Question audio: as long as needed. |

Avoid WAV files for distribution (too large). Avoid very low bitrate (poor quality on poor connections).

### Image files

| Type | Format | Notes |
|---|---|---|
| Illustrations | PNG | Supports transparency; best for clean line art and flat illustrations |
| Photographs | WebP | Better compression than JPEG; use for any photographic content |
| Icons | SVG | Scalable; preferred for UI icons |
| Logos | SVG (primary), PNG (fallback) | Always store both formats |

Minimum resolution for illustrations: 512×512px. For wallpapers: 1920×1080px minimum (landscape), 1080×1920px minimum (portrait).

Draggable tile images (`draggables/`) are exempt from the 512×512 minimum — that rule targets hero/wallpaper-scale art, not small drag chips.

---

## The `audio:` Prefix Convention

When a question's `content.prompt` starts with `"audio:"`, the frontend treats the rest of the string as a GCS path to an audio file rather than displaying it as text.

```
content.prompt = "audio:sounds/isizulu/vowels/a.mp3"
```

The frontend constructs the full URL:
```
https://storage.googleapis.com/my-backpack-assets/sounds/isizulu/vowels/a.mp3
```

And plays it rather than displaying the string on screen.

This convention applies to the main question prompt only. The `content.avatar.audioUrl` and `term.audioUrl` fields store full GCS paths directly, without the `audio:` prefix.

---

## Shared Asset URLs

Frequently referenced asset URLs are stored as constants in `packages/shared/constants/assets.ts`. This ensures all three apps (API, web, mobile) reference assets from a single source of truth.

When adding a new permanent asset that will be referenced frequently (a logo, a standard illustration, a recurring audio file), add its URL to this constants file rather than hardcoding the string in multiple places.

```typescript
// packages/shared/constants/assets.ts
export const ASSETS = {
  GCS_BASE: 'https://storage.googleapis.com/my-backpack-assets',
  BRANDING: {
    LOGO: 'https://storage.googleapis.com/my-backpack-assets/branding/logos/logo.png',
  },
  ISIZULU: {
    VOWEL_A: 'https://storage.googleapis.com/my-backpack-assets/sounds/isizulu/vowels/a.mp3',
    VOWEL_E: 'https://storage.googleapis.com/my-backpack-assets/sounds/isizulu/vowels/e.mp3',
    VOWEL_I: 'https://storage.googleapis.com/my-backpack-assets/sounds/isizulu/vowels/i.mp3',
    VOWEL_O: 'https://storage.googleapis.com/my-backpack-assets/sounds/isizulu/vowels/o.mp3',
    VOWEL_U: 'https://storage.googleapis.com/my-backpack-assets/sounds/isizulu/vowels/u.mp3',
  },
};
```

---

## How to Upload Assets

### Using the GCS web console

1. Go to [console.cloud.google.com/storage](https://console.cloud.google.com/storage)
2. Navigate to the `my-backpack-assets` bucket
3. Navigate to the correct folder (create it if it doesn't exist)
4. Click **Upload files** and select your file
5. The file is immediately publicly accessible at its URL

### Using the `gsutil` CLI

```bash
# Upload a single file
gsutil cp local-file.mp3 gs://my-backpack-assets/sounds/isizulu/vowels/a.mp3

# Upload a folder recursively
gsutil -m cp -r local-folder/ gs://my-backpack-assets/content/vocab/

# Make a file public (if not set at bucket level)
gsutil acl ch -u AllUsers:R gs://my-backpack-assets/sounds/isizulu/vowels/a.mp3
```

The bucket is configured for uniform access control with public read, so new uploads are automatically publicly accessible.

---

*Last updated: June 2026*
