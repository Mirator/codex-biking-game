# Ride the Horizon

A meditative watercolor biking experience built with HTML5 canvas. Ride endlessly through shifting biomes, collect gentle memories, and let ambience react to your pace.

## Play

Open [`index.html`](./index.html) in any modern browser or host the repository with a static server. The project is designed to deploy directly to GitHub Pages.

## Controls

- **Hold Space** – pedal forward.
- **← / A** – lean toward a calmer, slower cadence.
- **→ / D** – lean into swifter motion.
- **Enable sound** – click the button in the lower panel to fade in ambient wind.

Slow down near glimmering glyphs to uncover memory fragments tied to each biome.

## Development

The project is entirely client-side. You can use any static server for local development:

```bash
npx serve .
```

Or use Python:

```bash
python -m http.server
```

Then open your browser at the served address.

### Testing

The logic that powers biome transitions and memory fragments is covered by unit tests. Run them with the built-in Node test runner:

```bash
npm test
```

## Deployment

Because the repository is static, enable GitHub Pages in the repository settings and point it to the `main` branch (or `docs` branch if you prefer). The entry point is `index.html` at the repository root.

## Accessibility

- Responsive layout and font scaling for mobile screens.
- Canvas is labelled for screen reader context.
- Instructions remain visible while playing.
- Memories fade gently to avoid clutter while preserving a written log.
