# Phase 1 — Investigation log

## Access attempts (what actually happened)

| Attempt | Result |
|---|---|
| `curl https://stake.us/casino/games/metagaming-deadeye` | **Blocked**: egress proxy returned `403 CONNECT` (host not on the session's allowlist). |
| `WebFetch` of stake.us, gambling.com, casinos.com, igamingtoday.com, slotcatalog.com | **Blocked**: DNS fails (`ENOTFOUND`) — none of these hosts are on the session's network allowlist. |
| `WebSearch` (4 queries) | Worked. Returned result titles + a model-written summary only, **not** page contents. |

Consequence: **no frontend, JS bundle, network traffic, config file or gameplay event stream of the reference game was inspected.** Nothing below about rendering tech, animation system, game architecture, API payloads or RNG was observed first-hand. Phase 1 items 2 and 3 are therefore *not completed*.

## Provenance conflict (important)

* Search summaries from ~15 review/demo sites consistently credit a slot called **Deadeye** to **ELK Studios** (released 24 Sep 2025).
* Search results for the URL you gave show Stake lists it as `metagaming-deadeye`, in Stake's **Meta Gaming** group, tagged **Bonus Buy / Cascading / Only on Stake**, with a **3.30 % house edge** (≈96.7 % RTP) — vs the ~94 % RTP quoted for ELK's game.
* These may be (a) the same game under different attribution, (b) a different game that shares the name, or (c) a re-skinned/reworked version. **I could not determine which.** The "Cascading" tag does not appear in any ELK Deadeye description I found.

## Evidence used for the build (third-party summaries, unverified, not cross-checked against the live game)

* 6 reels × 4 rows, 30 paylines, wins left→right, 3+ symbols. (One outlier source says 5 reels; discarded.)
* Wild = "Wild Poster", substitutes for everything except Scatter.
* Saloon doors above reels 3 & 4 carry multipliers (2x–100x); a later shot on a door doubles it.
* "Shots Fired": shots land before reels stop; hits on reels 1, 2, 5, 6 add outlaw posters (wilds); hits on 3/4 set/double door multipliers.
* "Duel": two characters (doors 3 & 4) with multipliers; winner's multiplier applies; if both die a large 2×3 wild lands with the combined multiplier.
* Free spins on 3+ scatters; shots in free spins can hit a spin counter for extra spins; posters/multipliers persist through the bonus.
* Bonus buys: Bonus Hunt 3x, Shots Fired 10x, Duel 25x, Free Spins 100x, Super Bonus 500x. Max win 10,000x. RTP ≈ 94 % (single source).
* Not obtained anywhere: the real paytable values, symbol weights/reel strips, shot-count distributions, door value distribution, free-spin award table, exact line shapes, duel win probabilities, cascade behaviour.

## Verifiable vs needs further testing

| Item | Status |
|---|---|
| Grid / payline count / wild substitution / scatter trigger | Consistent across sources → *plausible*, still unverified on Stake |
| Shots Fired, Duel, doors, posters (qualitative) | Described by several (likely derivative) sources → *plausible* |
| Any numeric parameter | **Unknown** — needs gameplay capture (e.g. thousands of logged spins) or provider documentation |
| Rendering tech, protocol, RNG location (client vs server) | **Unknown** — requires network access to the game iframe/provider host |
| Cascades on the Stake version | **Unknown / unreproduced** |
