# PARKED — Project Omega (TheArchitectit/plexus)

**Status: PARKED indefinitely** (Roger, 2026-09-08, Mission Control Open Item #173).

- **All future work goes into [rad-gateway](https://github.com/TheArchitectit/rad-gateway).** No new development happens in this fork or upstream plexus.
- Upstream contribution arc is concluded: last PR mcowger/plexus#758 (merged 2026-07-27). 59 PRs authored upstream 2026-02→2026-07; 12 merged.
- This fork retains the stacked RequestShaper/rate-limits review series (PRs #1–#9, closed) and the 11 origin-tracked `feat/\*request-shaper`/`rate-limits` branches as historical record.
- The dashboard/feature work from this project (live metrics, concurrency tracking, detailed usage analytics, rate-limit editors, RequestShaper) is being inventoried for re-implementation inside rad-gateway.
- Working clone on UCS03 was pruned 2026-09-08: 58 local-only branches removed (copilot/claude leftovers, completed stack/pr53+pr54 series, stale experiments). Full backup: `ucs03:/mnt/ollama/home/user001/.plexus-backups/prune-20260908-0321/plexus-all-refs-20260908.bundle` (sha256 8f1d373128a09997060877af16814afc7eaac639d1462496e71986c06d36bd29).
