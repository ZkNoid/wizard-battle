# Copilot instructions (Repo)

## Goal

Open small, safe PRs that pass CI. No unrelated refactors.

## Stack

- Next.js + TypeScript
- Styling: Tailwind (follow existing patterns)
- Package manager: pnpm (use pnpm commands)

## Commands to run before you mark work complete

- pnpm lint
- pnpm typecheck (or pnpm tsc)
- pnpm test (if present)
- pnpm build

## Bugfix workflow

1. Use repro steps / logs / stack trace from the issue.
2. Identify minimal relevant files (search/grep). Do NOT read the whole repo.
3. Implement the smallest correct fix.
4. Add or update a regression test if feasible.
5. Re-run commands above; ensure green.

## Frontend feature workflow

- Implement exactly the acceptance criteria.
- Include loading/error/empty states when relevant.
- Keep UI consistent with existing components.

## Do NOT touch unless explicitly requested

- .github/workflows/\*\*
- deployment/infra scripts
- secrets/env files

## PR description format

- Summary
- What changed
- How to verify (commands + manual steps)
- Risks / edge cases
