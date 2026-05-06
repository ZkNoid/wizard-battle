/**
 * Display metadata and tournament parameters from CLI (create-tournament, sync-tournaments).
 *
 * Supports inline flags:
 *   --title "…"              | --title=… | -t "…"
 *   --image-url "…"          | --image-url=… | -i "…"
 *   --description "…"        | --description=… | -d "…"
 *   --sponsors '[{"name":"…","url":"…"}]' | --sponsors=… | -s "…"
 *   --ticket-price <nanoMINA>| --ticket-price=…
 *   --fee-percent <bps>      | --fee-percent=…
 *   --claim-window <slots>   | --claim-window=…
 *   --battle-start-delay <slots> | --battle-start-delay=…
 *   --battle-slots <slots>   | --battle-slots=…
 *   --prize-percents '[2500,1500,…]' | --prize-percents=…
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
 *     ],
 *     "ticketPrice": "1000000000",
 *     "feePercent": 500,
 *     "claimWindow": 20000,
 *     "battleStartDelay": 10,
 *     "battleSlots": 400,
 *     "prizePercents": [2500, 1500, 1000, 1000, 1000, 700, 700, 700, 500, 400]
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
  /** Ticket price in nanoMINA (string to preserve large integers). */
  ticketPrice?: string;
  /** Fee in basis points, e.g. 500 = 5 %. */
  feePercent?: number;
  /** Number of slots after battleEndSlot during which winners may claim. */
  claimWindow?: number;
  /** Slots from now until the battle opens for joining. */
  battleStartDelay?: number;
  /** Number of slots the battle / join window stays open. */
  battleSlots?: number;
  /**
   * Prize distribution, one entry per winner place (must sum to 10 000).
   * E.g. [2500, 1500, 1000, 1000, 1000, 700, 700, 700, 500, 400]
   */
  prizePercents?: number[];
}

interface ConfigFileShape {
  title?: string;
  imageUrl?: string;
  description?: string;
  sponsors?: TournamentSponsor[];
  ticketPrice?: string | number;
  feePercent?: number;
  claimWindow?: number;
  battleStartDelay?: number;
  battleSlots?: number;
  prizePercents?: number[];
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

function parsePrizePercentsJson(raw: string): number[] | undefined {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((n) => typeof n === 'number')) {
      return parsed as number[];
    }
    console.error('WARNING: --prize-percents value is not a JSON number array, ignoring.');
  } catch {
    console.error('WARNING: Failed to parse --prize-percents JSON, ignoring.');
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

    } else if (arg === '--ticket-price') {
      const v = args[++i];
      if (v !== undefined && !v.startsWith('-')) inline.ticketPrice = v.trim();
    } else if (arg.startsWith('--ticket-price=')) {
      inline.ticketPrice = arg.slice('--ticket-price='.length).trim();

    } else if (arg === '--fee-percent') {
      const v = args[++i];
      if (v !== undefined && !v.startsWith('-')) inline.feePercent = Number(v);
    } else if (arg.startsWith('--fee-percent=')) {
      inline.feePercent = Number(arg.slice('--fee-percent='.length));

    } else if (arg === '--claim-window') {
      const v = args[++i];
      if (v !== undefined && !v.startsWith('-')) inline.claimWindow = Number(v);
    } else if (arg.startsWith('--claim-window=')) {
      inline.claimWindow = Number(arg.slice('--claim-window='.length));

    } else if (arg === '--battle-start-delay') {
      const v = args[++i];
      if (v !== undefined && !v.startsWith('-')) inline.battleStartDelay = Number(v);
    } else if (arg.startsWith('--battle-start-delay=')) {
      inline.battleStartDelay = Number(arg.slice('--battle-start-delay='.length));

    } else if (arg === '--battle-slots') {
      const v = args[++i];
      if (v !== undefined && !v.startsWith('-')) inline.battleSlots = Number(v);
    } else if (arg.startsWith('--battle-slots=')) {
      inline.battleSlots = Number(arg.slice('--battle-slots='.length));

    } else if (arg === '--prize-percents') {
      const v = args[++i];
      if (v !== undefined && !v.startsWith('-')) {
        const parsed = parsePrizePercentsJson(v);
        if (parsed) inline.prizePercents = parsed;
      }
    } else if (arg.startsWith('--prize-percents=')) {
      const parsed = parsePrizePercentsJson(arg.slice('--prize-percents='.length));
      if (parsed) inline.prizePercents = parsed;
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

  // Normalise ticketPrice from config (may be number or string)
  const configTicketPrice =
    fromConfig.ticketPrice !== undefined
      ? String(fromConfig.ticketPrice)
      : undefined;

  return {
    title: inline.title ?? fromConfig.title,
    imageUrl: inline.imageUrl ?? fromConfig.imageUrl,
    description: inline.description ?? fromConfig.description,
    sponsors: inline.sponsors ?? fromConfig.sponsors,
    ticketPrice: inline.ticketPrice ?? configTicketPrice,
    feePercent: inline.feePercent ?? fromConfig.feePercent,
    claimWindow: inline.claimWindow ?? fromConfig.claimWindow,
    battleStartDelay: inline.battleStartDelay ?? fromConfig.battleStartDelay,
    battleSlots: inline.battleSlots ?? fromConfig.battleSlots,
    prizePercents: inline.prizePercents ?? fromConfig.prizePercents,
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
  ticketPrice?: string;
  feePercent?: number;
  claimWindow?: number;
  battleStartDelay?: number;
  battleSlots?: number;
  prizePercents?: number[];
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
    ticketPrice: p.ticketPrice,
    feePercent: p.feePercent,
    claimWindow: p.claimWindow,
    battleStartDelay: p.battleStartDelay,
    battleSlots: p.battleSlots,
    prizePercents: p.prizePercents,
  };
}
