# Wireframe pre-bake (browser only — no Chromium install)

The portrait wireframe is generated in the browser. To ship fast-loading assets:

1. Run `npm run dev`
2. Open **`http://localhost:4321/?wireframeBake=1`** in **Firefox, Safari, or Edge** (any browser you use)
3. Wait for the mesh to finish, then use the bake panel:
   - **Download mesh JSON** → save as `public/data/wireframe-mesh.json`
   - Run **`npm run encode:wireframe-mesh`** → writes `public/data/wireframe-mesh.pck.gz` (~600 KB gzip)
   - **Record loop video** → save as `public/media/wireframe-loop.webm`
   - **Download poster** → save as `public/media/wireframe-poster.png`
4. Commit those files. Visitors get the video loop immediately; capable devices load the JSON for the interactive canvas.

### GIMP overlay (wireframe guide layer)

To edit `profile.png` in GIMP with the mesh aligned on top:

1. Run `npm run dev`
2. Open **`http://localhost:4321/?wireframeOverlay=1`** in your browser
3. Wait for the mesh to appear, then click **Download wireframe-mesh-overlay.png**
4. In GIMP: open `public/images/profile.png`, import the overlay as a new layer above it (760×1080, same size). Use it as a guide while you invert/blotch the face; hide or delete the overlay layer when done.

The overlay is mesh lines only on a transparent background — no photo fill.

### Optional: animated WebP from PNG frames

If you prefer WebP over WebM, click **Download frame PNGs**, then:

```bash
npm run encode:wireframe-loop
```

That uses **Sharp only** (already in the project) to write `public/media/wireframe-loop.webp` and update the poster. Set `data-loop-url` to the `.webp` path on the portrait element.
