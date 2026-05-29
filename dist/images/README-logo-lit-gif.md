# Logo “lit” animation (optional GIF)

**Current setup:** brain glow uses `assets/images/logo-brain-light.png` with a CSS incandescent flicker (see `SiteLogo.astro`).

You can still add a GIF below for chip blue pulse or extra effects.

## File to add

Save your Photoshop export as:

```
public/images/logo-lit.gif
```

## Export settings (recommended)

| Setting | Value |
|--------|--------|
| Canvas | **340 × 340 px** (same as `assets/images/c-logo-dark.png`) |
| Background | **Transparent** |
| Alignment | Pixel-align with `c-logo-dark.png` (winter / light theme logo) |
| Loop | Forever |
| Content | Brain glow + chip blue pulse only — no need to redraw “CHARLES” if the base PNG already shows it |

## What to draw

- **Brain:** off-white / pale green glow on the twisty lines inside the C (not the thick C ring).
- **Chip:** blue pulse traveling along traces (your choice of style).
- Leave the pull-cord **“o”** node clear if possible (cord is drawn in HTML on top).

## Optional second asset

If you want a different treatment in dark theme later:

```
public/images/logo-lit-dim.gif
```

Wire that up in `SiteLogo.astro` when ready.

## Preview

1. Add `logo-lit.gif`.
2. Run `npm run dev`.
3. Pull the cord or switch to light theme — the GIF should appear over the logo.
