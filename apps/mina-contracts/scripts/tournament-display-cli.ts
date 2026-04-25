/**
 * Display metadata from CLI (create-tournament, sync-tournaments).
 *
 * Supports:
 *   --title "…" | --title=… | -t "…"
 *   --image-url "…" | --image-url=… | -i "…"
 */
export function parseTournamentDisplayArgs(argv: string[]): {
  title?: string;
  imageUrl?: string;
} {
  const out: { title?: string; imageUrl?: string } = {};
  const args = argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--title' || arg === '-t') {
      const v = args[++i];
      if (v !== undefined && !v.startsWith('-')) {
        const t = v.trim();
        if (t.length > 0) out.title = t;
      }
    } else if (arg.startsWith('--title=')) {
      const t = arg.slice('--title='.length).trim();
      if (t.length > 0) out.title = t;
    } else if (arg === '--image-url' || arg === '-i') {
      const v = args[++i];
      if (v !== undefined && !v.startsWith('-')) {
        const t = v.trim();
        if (t.length > 0) out.imageUrl = t;
      }
    } else if (arg.startsWith('--image-url=')) {
      const t = arg.slice('--image-url='.length).trim();
      if (t.length > 0) out.imageUrl = t;
    }
  }

  return out;
}

const USAGE_LINE =
  'pnpm --filter mina-contracts run create-tournament -- --title "Spring Cup" --image-url /tournaments/cup.png';

/**
 * Same flags as {@link parseTournamentDisplayArgs}; both are required.
 * Prints errors and `process.exit(1)` if either is missing.
 */
export function parseRequiredTournamentDisplayArgs(argv: string[]): {
  title: string;
  imageUrl: string;
} {
  const p = parseTournamentDisplayArgs(argv);
  if (!p.title) {
    console.error('ERROR: --title (or -t) is required.');
    console.error(`Example: ${USAGE_LINE}`);
    process.exit(1);
  }
  if (!p.imageUrl) {
    console.error('ERROR: --image-url (or -i) is required.');
    console.error(`Example: ${USAGE_LINE}`);
    process.exit(1);
  }
  return { title: p.title, imageUrl: p.imageUrl };
}
