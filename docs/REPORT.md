# Report

## 1. What was successfully reverse engineered
Honestly: **very little first-hand.** The reference site and every page-fetching route were blocked by the session's network policy, so no JS, network traffic, config or events were inspected. What I have is a qualitative description of the mechanics from third-party review summaries (grid, wild posters, saloon-door multipliers, Shots Fired, Duel, free spins, bonus-buy tiers and prices, 10,000x cap). Details in `docs/INVESTIGATION.md`.

## 2. What could not be accessed or verified
* stake.us page, its provider iframe, JS bundles, network/API responses, configs, event structures → blocked.
* Rendering technology, animation system, architecture, whether outcomes are server- or client-side → unknown.
* Every numeric parameter: paytable, reel weights, shot/door/duel probabilities, free-spin awards, line shapes, RTP of the Stake build.
* Whether Stake's `metagaming-deadeye` (Meta Gaming group, "Cascading" tag, 3.30 % house edge) is the same game the reviews attribute to ELK Studios. **The brief's attribution to Meta Gaming conflicts with the reviews, and I could not resolve it.**
* Cascades: tagged on Stake's listing, absent from all descriptions; **not implemented**.

## 3. Mechanics recreated accurately
**None can be claimed as accurate**, because there was nothing to test against. What is *tested* is that my engine behaves as I designed it (12 unit tests: payline evaluation, wild substitution, scatter blocking, determinism, forced presets, multiplier math, cap, grid invariants; plus a headless browser run that spins normal/forced/bought rounds with zero console errors).

## 4. Approximations (everything)
* Structure taken from reviews, implementation mine: 6×4 grid, 30 left→right lines (line shapes invented), wild poster substitution, scatter free spins, door multipliers 2x–100x with doubling, Shots Fired, Duel (left/right/both-die with 2×3 wild and summed multiplier), counter hits for extra spins, persistence in bonus, buy modes at the quoted prices, 10,000x cap.
* Invented: all paytable values, symbol weights, shot counts, door value odds, duel odds (42/42/16), poster cap (2), award table (3/4/5/6 scatters = 8/10/12/15), single-door multiplier behaviour, Hunt/Shots/Duel/Super buy effects, retrigger (+5).
* Tuned (not derived): base-game simulated RTP ≈ 93 % to land near the ~94 % review figure. Simulation (≈400k rounds, seed 12345; variance is high so ±1–2 pts): 

| Mode | Cost | Sim RTP | Notes |
|---|---|---|---|
| Base | 1x | ~93 % | hit 48.9 %, bonus 1 in ~86, avg 9.7 free spins, max seen 6,830x |
| Hunt | 3x | ~89 % | bonus ~3.6x as frequent |
| Shots | 10x | ~90 % | |
| Duel | 25x | ~69 % | under-tuned |
| Free spins | 100x | ~86 % | |
| Super | 500x | ~98 % | very high variance, small sample |

  Buy-mode balance is rough; the real game's is unknown.
* Visuals: placeholder tiles; animation sequencing (shots during reel spin, duel banner, line pulses, count-up) is my design, not observed.

## 5. Could the engine support future original slots?
Yes, as a prototyping base. The engine is renderer-free and seedable, with forced-outcome hooks, a round/spin result schema, an RTP simulator and a debug harness, so new games mostly mean swapping `config.ts` and the feature logic in `engine.ts`. Limits: only one grid/line-pay model is supported (no ways/cluster/cascade), config is not yet data-driven, art is placeholder, and it has no server RNG, certification-grade RNG or math audit. It is a prototype, not a compliance-ready math model.

## To actually verify the reference game
Allow `stake.us` (and the provider's game host) in the session's network settings, or supply a HAR/gameplay capture. Then: inspect the game iframe URL and scripts, record the spin/bet API payloads, log several thousand spins to estimate paytable, feature frequencies and door/shot distributions, and check for cascades.
