/**
 * Display metadata from CLI (create-tournament, sync-tournaments).
 *
 * Supports inline flags:
 *   --title "…"       | --title=… | -t "…"
 *   --image-url "…"   | --image-url=… | -i "…"
 *   --description "…" | --description=… | -d "…"
 *   --sponsors '[{"name":"…","url":"…"}]' | --sponsors=… | -s "…"
 *
 * Or a JSON config file (inline flags take precedence):
 *   --config path/to/config.json | --config=… | -c path/to/config.json
 *
 * Example config.json:
 *   {
 *     "title": "Spring Cup",
 *     "imageUrl": "/tournaments/spring-cup.png",
 *     "description": "A great tournament for all wizards.",
 *     "sponsors": [
 *       { "name": "ZkNoid", "url": "https://zknoid.io" },
 *       { "name": "Mina Protocol" }
 *     ]
 *   }
 */
import fs from 'node:fs';

export interface TournamentSponsor {
  name: string;
  url?: string;
}

export interface TournamentDisplayArgs {
  title?: string;
  imageUrl?: string;
  description?: string;
  sponsors?: TournamentSponsor[];
}

interface ConfigFileShape {
  title?: string;
  imageUrl?: string;
  description?: string;
  sponsors?: TournamentSponsor[];
}

function loadConfigFile(configPath: string): ConfigFileShape {
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw) as ConfigFileShape;
}

function parseSponsorsJson(raw: string): TournamentSponsor[] | undefined {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as TournamentSponsor[];
    console.error('WARNING: --sponsors value is not a JSON array, ignoring.');
  } catch {
    console.error('WARNING: Failed to parse --sponsors JSON, ignoring.');
  }
  return undefined;
}

export function parseTournamentDisplayArgs(argv: string[]): TournamentDisplayArgs {
  const args = argv.slice(2);
  let configPath: string | undefined;
  const inline: TournamentDisplayArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    if (arg === '--config' || arg === '-c') {
      const v = args[++i];
      if (v !== undefined && !v.startsWith('-')) configPath = v.trim();
    } else if (arg.startsWith('--config=')) {
      configPath = arg.slice('--config='.length).trim();
    } else if (arg === '--title' || arg === '-t') {
      const v = args[++i];
      if (v !== undefined && !v.startsWith('-')) {
        const t = v.trim();
        if (t.length > 0) inline.title = t;
      }
    } else if (arg.startsWith('--title=')) {
      const t = arg.slice('--title='.length).trim();
      if (t.length > 0) inline.title = t;
    } else if (arg === '--image-url' || arg === '-i') {
      const v = args[++i];
      if (v !== undefined && !v.startsWith('-')) {
        const t = v.trim();
        if (t.length > 0) inline.imageUrl = t;
      }
    } else if (arg.startsWith('--image-url=')) {
      const t = arg.slice('--image-url='.length).trim();
      if (t.length > 0) inline.imageUrl = t;
    } else if (arg === '--description' || arg === '-d') {
      const v = args[++i];
      if (v !== undefined && !v.startsWith('-')) {
        const t = v.trim();
        if (t.length > 0) inline.description = t;
      }
    } else if (arg.startsWith('--description=')) {
      const t = arg.slice('--description='.length).trim();
      if (t.length > 0) inline.description = t;
    } else if (arg === '--sponsors' || arg === '-s') {
      const v = args[++i];
      if (v !== undefined && !v.startsWith('-')) {
        const parsed = parseSponsorsJson(v);
        if (parsed) inline.sponsors = parsed;
      }
    } else if (arg.startsWith('--sponsors=')) {
      const parsed = parseSponsorsJson(arg.slice('--sponsors='.length));
      if (parsed) inline.sponsors = parsed;
    }
  }

  // Load config file if specified; inline flags take precedence
  let fromConfig: ConfigFileShape = {};
  if (configPath) {
    try {
      fromConfig = loadConfigFile(configPath);
    } catch (err) {
      console.error(`ERROR: Failed to read config file: ${configPath}`, err);
      process.exit(1);
    }
  }

  return {
    title: inline.title ?? fromConfig.title,
    imageUrl: inline.imageUrl ?? fromConfig.imageUrl,
    description: inline.description ?? fromConfig.description,
    sponsors: inline.sponsors ?? fromConfig.sponsors,
  };
}

const USAGE_INLINE =
  'pnpm --filter mina-contracts run create-tournament -- --title "Spring Cup" --image-url /tournaments/cup.png';
const USAGE_CONFIG =
  'pnpm --filter mina-contracts run create-tournament -- --config tournament-config.json';

/**
 * Same as {@link parseTournamentDisplayArgs}; title and imageUrl are required.
 * Prints errors and `process.exit(1)` if either is missing.
 */
export function parseRequiredTournamentDisplayArgs(argv: string[]): {
  title: string;
  imageUrl: string;
  description?: string;
  sponsors?: TournamentSponsor[];
} {
  const p = parseTournamentDisplayArgs(argv);
  if (!p.title) {
    console.error('ERROR: --title (or -t) is required, either inline or via --config.');
    console.error(`Inline:  ${USAGE_INLINE}`);
    console.error(`Config:  ${USAGE_CONFIG}`);
    process.exit(1);
  }
  if (!p.imageUrl) {
    console.error('ERROR: --image-url (or -i) is required, either inline or via --config.');
    console.error(`Inline:  ${USAGE_INLINE}`);
    console.error(`Config:  ${USAGE_CONFIG}`);
    process.exit(1);
  }
  return {
    title: p.title,
    imageUrl: p.imageUrl,
    description: p.description,
    sponsors: p.sponsors,
  };
}
