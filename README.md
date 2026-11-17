# Deadeye prototype (experimental)

Original, independent slot prototype inspired by *publicly described* mechanics of "Deadeye".
TypeScript + Vite + PixiJS 8 + GSAP. Placeholder art only. Local simulated outcomes — no gambling connectivity.

```
npm install
npm run dev        # play + debug panel
npm test           # engine unit tests (vitest)
npm run build      # typecheck + production build
npm run sim 200000 # headless RTP/frequency simulation
node scripts/e2e.cjs [outdir]   # Playwright smoke test (needs `vite preview --port 4173`)
```

Layout: `src/engine` (pure TS outcome engine — config, RNG, spin/round resolution, presets, simulator),
`src/render` (Pixi scene + GSAP animations), `src/ui` (HUD + test environment), `docs/` (investigation + report).

See `docs/INVESTIGATION.md` and `docs/REPORT.md`. **This is not a verified reproduction of the reference game.**
