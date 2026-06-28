# My Backpack Brand Guide

My Backpack is an education platform for everyone in a South African household — from a 4-year-old learning IsiZulu vowels to an adult expanding their vocabulary. The brand must feel warm, trustworthy, and genuinely local. This document defines the tone, visual style, and identity standards that keep every part of the product feeling cohesive.

---

## App Name and Tagline

**App name:** My Backpack  
**Tagline:** *Everything you need to learn, in one place.*

The name is deliberately personal and familiar. "My Backpack" is something every South African school child understands. It carries the connotation of being prepared, of carrying what you need, of ownership over your own learning. The digital version of that backpack should feel the same way — organised, personal, and always with you.

---

## Tone of Voice

My Backpack speaks differently to different users. The platform knows who is using it (via their ageGroup) and should always feel appropriate for that person.

### For children (child ageGroup)

- **Warm and celebratory** — every success is worth celebrating, no matter how small
- **Simple and direct** — short sentences, everyday words, no jargon
- **Playful** — light humour, bright energy, emojis in the UI where appropriate
- **Encouraging on failure** — "Try again!" feels very different from "Wrong." Use the former, never the latter
- **Personal** — use the child's name where possible. "Well done, Siya!" beats "Well done!"

### For adults (adult ageGroup)

- **Confident and clear** — adults are respected as capable learners, not talked down to
- **Respectful and direct** — no hand-holding, but no coldness either
- **Motivating without being patronising** — celebrate progress, but assume the adult doesn't need a cartoon character to tell them they did well
- **Professional where appropriate** — particularly in feedback for professional or academic content

### For teachers

- **Professional and efficient** — teachers are busy. Get to the point.
- **Collaborative** — frame the platform as a tool that works *with* them, not a system they must submit to
- **Respectful of expertise** — teachers know their learners and their curriculum better than the app does. The app is there to serve the teacher's goals, not to replace their judgement.

### What My Backpack never is

- **Condescending** — do not explain things the user already knows
- **Rushed** — learning takes time; the app should not feel impatient
- **Overly formal** — this is not a government portal; warmth is always appropriate
- **American** — spelling, idioms, context, and examples should be South African. Use "colour" not "color", "learner" not "student" (when referring to school-age users in a CAPS context), "petrol" not "gas".

---

## Visual Style — Glassmorphism

My Backpack's primary visual style is **glassmorphism**: a soft, translucent aesthetic that feels modern and premium without being cold or corporate.

### Core characteristics

**Background colour:** `#fcfded` — a warm, very light green-tinted cream. Feels natural and gentle on the eyes. Not pure white (which is clinical) and not bold (which would overwhelm content).

**Cards and surfaces:**
- Semi-transparent white background with `backdrop-filter: blur()`
- Large border radius (16px+) — nothing sharp or angular
- Soft drop shadows — subtle elevation, not harsh
- Slightly frosted glass effect — cards feel like they're floating over the background

**Colour accent palette:** To be defined. The glassmorphism style naturally pairs well with soft, muted accent colours. Avoid saturated primary colours — they clash with the translucent aesthetic.

**Typography:**
- Clean and readable — legibility is non-negotiable, especially for children
- Large text sizes for children's interfaces — minimum 18px for body text
- Clear hierarchy: headings are significantly larger than body text
- No decorative or handwritten fonts for reading content (reserve these for headings or labels only)

**Imagery and illustrations:**
- Friendly, diverse, South African context
- Flat or semi-flat illustration style pairs well with the glassmorphism aesthetic
- Avoid stock photography that feels generic or foreign
- Characters and scenes should reflect South African environments and diversity

### What to avoid

- Cluttered layouts — glassmorphism requires breathing room to work
- Dark backgrounds — the style is built around lightness
- Sharp corners — radius is part of the language
- Excessive gradients — let the blur and translucency do the work

---

## Logo

The My Backpack logo is stored in Google Cloud Storage at:
```
my-backpack-assets/branding/logos/
```

Use the logo consistently — do not stretch, recolour, or add effects to the logo file. Always use the provided asset files rather than recreating the logo.

---

## Avatar Characters

Avatar characters appear in lessons to introduce questions, react to answers, and guide learners through the experience. They are a central part of the brand's warmth.

Core principles:
- **Friendly and non-threatening** — especially for young children
- **Diverse** — South African diversity should be reflected in character design
- **Expressive** — avatars have emotions that respond to what the learner is doing
- **Consistent** — the same character behaves consistently across all interactions

Profile avatars (used in the profile selector) currently use DiceBear-generated avatars. Full animated lesson characters are a future design milestone.

See the [Avatar Guide](avatar-guide.md) for full details on avatar dialogue, emotions, and audio requirements.

---

## Peanuts Currency Identity

Peanuts are My Backpack's in-app currency. The visual identity of peanuts should be:

- **Recognisable at a glance** — the peanut icon should be distinct and memorable
- **Friendly, not financial** — peanuts feel playful, not like "points" or "coins"
- **Consistent across all contexts** — the same icon is used everywhere: in the learner's wallet, in question feedback, in the parent dashboard

The final peanut icon design is to be determined. The name and concept are established; the visual identity is a design task for the next phase.

---

## Language

South African English is the primary written language of the interface. Key conventions:

- Spell in South African English: colour, honour, favour, recognise, centre, programme
- Use "learner" for school-age users in formal educational contexts (CAPS terminology)
- Use "child" in conversational and parental contexts
- Use "Grade" with capital G (South African convention: Grade 3, not grade 3)
- Refer to the curriculum as CAPS, not "the curriculum" when specificity helps
- IsiZulu terms should be spelled correctly and consistently — consult a native speaker or authoritative source

---

*Last updated: June 2026*
