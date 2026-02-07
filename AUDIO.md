# 🎵 Audio System

Audio system based on Howler.js and Zustand for managing music and sound effects.

**Key Features:**
- 🎼 Single Howl instance ownership in store (no duplication)
- 💾 Music track caching for instant playback
- ⚡ Preloading support for better UX
- 🔇 Separate mute controls for music and SFX
- 🧹 Automatic cleanup on app close

## 📁 File Structure

```
public/audio/
├── music/
│   ├── background/fantasy-village-woods.mp3   # Main menu
│   └── battle/death-taker.mp3                 # Battle
└── sfx/
    ├── ui/                                    # UI sounds
    │   ├── hover.mp3
    │   ├── click.mp3
    │   ├── modal-open.mp3
    │   └── modal-close.mp3
    ├── mage/                                  # Mage sounds
    │   ├── cast.mp3
    │   └── impact.mp3
    └── archer/                                # Archer sounds
        ├── arrow-shot.mp3
        └── arrow-impact.mp3
```

## 📦 Configuration (audioAssets.ts)

```typescript
AUDIO_ASSETS = {
  music: {
    background: { fantasyVillage },
    battle: { deathTaker },
  },
  sfx: {
    ui: { hover, click, modalOpen, modalClose },
    heroes: {
      mage: { cast, impact },
      archer: { shot, impact },
      phantomDuelist: {}, // For future expansion
    },
  },
};
```

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│         audioStore (Zustand)        │
├─────────────────────────────────────┤
│  musicCache: Map<Track, Howl>       │ ← Single source of truth
│  currentMusicHowl: Howl | null      │ ← Currently playing
│  currentMusicTrack: Track | null    │
│                                     │
│  playMusic()     ──────┐            │
│  preloadMusic()        ├────────────┼──> Owns all music Howl instances
│  stopMusic()           │            │
│  cleanup()         ────┘            │
└─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────┐
│      audioService (Singleton)       │
├─────────────────────────────────────┤
│  soundEffects: Map<SFX, Howl>       │ ← SFX only
│                                     │
│  createMusicHowl(src): Howl         │ ← Factory method
│  playSound(src)                     │
│  setMasterVolume(vol)               │ ← Global settings
│  setMuted(muted)                    │
└─────────────────────────────────────┘
```

**Why this architecture?**
- ✅ **No music duplication** - Store owns single Howl per track
- ✅ **Fast track switching** - Cached Howl instances
- ✅ **Race condition free** - Centralized state management
- ✅ **Easy debugging** - All music logic in one place

---

## 🎮 Hooks

### 1. Preloading Music (Recommended)

```typescript
import { usePreloadMusic } from '@/lib/hooks/useAudio';

function HomePage() {
  const preloadMusic = usePreloadMusic();

  useEffect(() => {
    // Preload all tracks on app start for instant playback
    preloadMusic();
  }, [preloadMusic]);
}
```

**Benefits:**
- Eliminates loading delays when switching tracks
- Smooth transitions between menu and battle music
- Better user experience

---

### 2. Background Music

```typescript
import { useBackgroundMusic } from '@/lib/hooks/useAudio';

function HomePage() {
  const { playMainTheme, playBattleMusic, stopMusic } = useBackgroundMusic();

  useEffect(() => {
    playMainTheme(); // Start background music
    // Note: No cleanup needed - StrictMode safe
  }, [playMainTheme]);
}
```

**Available methods:**

- `playMainTheme()` - main menu / lobby (auto-checks if already playing)
- `playBattleMusic()` - battle music (auto-checks if already playing)
- `stopMusic()` - stop current music immediately

**Important notes:**

- ✅ Music hooks include built-in duplicate prevention
- ✅ Safe to call `playMainTheme()` multiple times - only plays once
- ✅ React StrictMode safe - no cleanup needed in most cases
- ✅ Music switches instantly (no fade delays)

---

### 2. Volume Control

```typescript
import { useAudioControls } from '@/lib/hooks/useAudio';

function AudioSettings() {
  const {
    volume,
    isMuted,
    isMusicMuted,
    setVolume,
    toggleMute,
    toggleMusicMute,
  } = useAudioControls();

  return (
    <>
      {/* Volume */}
      <input value={volume} onChange={(e) => setVolume(Number(e.target.value))} />

      {/* All sounds */}
      <button onClick={toggleMute}>{isMuted ? 'Unmute All' : 'Mute All'}</button>

      {/* Music only */}
      <button onClick={toggleMusicMute}>
        {isMusicMuted ? 'Unmute Music' : 'Mute Music'}
      </button>
    </>
  );
}
```

**Available methods:**

- `volume` - current volume (0-100)
- `isMuted` - all sounds are muted
- `isMusicMuted` - only music is muted (SFX still play)
- `setVolume(volume)` - set volume
- `toggleMute()` - toggle all sounds
- `toggleMusicMute()` - toggle music only
- `setMuted(muted)` - set mute for all sounds
- `setMusicMuted(muted)` - set mute for music only

---

### 3. UI Sounds

#### Hover

```typescript
import { useHoverSound } from '@/lib/hooks/useAudio';

function MyButton() {
  const playHoverSound = useHoverSound();

  return <button onMouseEnter={playHoverSound}>Hover me</button>;
}
```

Or via props:

```typescript
<Button enableHoverSound>Hover me</Button>
<BoxButton enableHoverSound>Or me</BoxButton>
```

#### Click

```typescript
import { useClickSound } from '@/lib/hooks/useAudio';

function MyButton() {
  const playClickSound = useClickSound();

  return <button onClick={playClickSound}>Click me</button>;
}
```

Or via props:

```typescript
<Button enableClickSound>Click me</Button>
<BoxButton enableClickSound>Or me</BoxButton>
```

#### Modal (open/close)

```typescript
import { useModalSound } from '@/lib/hooks/useAudio';

function MyModal() {
  useModalSound();  // Automatically plays sounds on mount/unmount

  return <div>Modal content</div>;
}
```

---

### 4. Spell Sounds (automatic)

```typescript
import { useSpellSounds } from '@/lib/hooks/useAudio';

function GamePage() {
  useSpellSounds();  // Automatically plays spell sounds via EventBus

  return <Game />;
}
```

**How it works:**

1. Phaser emits `EventBus.emit('cast-spell', x, y, spell)`
2. `useSpellSounds` intercepts the event
3. Automatically plays sound via `SPELL_SOUND_MAP`

**Current mappings:**

- Mage: Lightning, FireBall, Teleport, Heal, Laser → `mage/cast.mp3`
- Archer: Arrow, AimingShot, HailOfArrows, Decoy, Cloud → `archer/arrow-shot.mp3`
- Phantom Duelist: Fallback → `mage/cast.mp3`

---

### 5. Direct Usage

```typescript
import { useSound } from '@/lib/hooks/useAudio';

function MyComponent() {
  const playSound = useSound();

  const handleAction = () => {
    playSound('click'); // Key from AUDIO_ASSETS.sfx
  };
}
```

Or via store:

```typescript
import { useAudioStore } from '@/lib/store/audioStore';

const playSound = useAudioStore((state) => state.playSound);
playSound('/audio/sfx/ui/click.mp3'); // Full path
```

---

## ➕ Adding New Sounds

### For a new hero (e.g., Phantom Duelist):

## It's better to use mp3 because wav files are significantly larger.

## I used the service https://cloudconvert.com/wav-to-mp3 for conversion

1. **Add files:**

   ```bash
   mkdir -p apps/frontend/public/audio/sfx/phantom
   # Add: cast.mp3, impact.mp3
   ```

2. **Update `audioAssets.ts`:**

   ```typescript
   phantomDuelist: {
     cast: '/audio/sfx/phantom/cast.mp3',
     impact: '/audio/sfx/phantom/impact.mp3',
   },
   ```

3. **Update `SPELL_SOUND_MAP` in `useAudio.ts`:**
   ```typescript
   'SpectralArrow': AUDIO_ASSETS.sfx.heroes.phantomDuelist.cast,
   'ShadowVeil': AUDIO_ASSETS.sfx.heroes.phantomDuelist.cast,
   // ... etc.
   ```

### For a unique spell sound:

1. **Add file:** `lightning.mp3`
2. **Update `audioAssets.ts`:**
   ```typescript
   mage: {
     cast: '/audio/sfx/mage/cast.mp3',
     impact: '/audio/sfx/mage/impact.mp3',
     lightning: '/audio/sfx/mage/lightning.mp3',  // ← new
   },
   ```
3. **Update mapping:**
   ```typescript
   'Lightning': AUDIO_ASSETS.sfx.heroes.mage.lightning,
   ```

---

## 🎛️ Features

- **Music:** 
  - Looped, only one track at a time, instant transitions
  - Cached Howl instances for immediate playback
  - Store owns all music Howl instances (prevents duplication)
  - Preloading support for better UX
  - React StrictMode safe
- **SFX:** 
  - Parallel playback, no looping
  - Managed separately from music
- **Separate control:** 
  - `toggleMute()` - mutes everything (music + SFX)
  - `toggleMusicMute()` - mutes only music (SFX continue playing)
  - Mute state automatically applied to cached tracks
- **Anti-duplication guarantee:**
  - Store is single owner of music Howl instances
  - One Howl instance per track in cache
  - Built-in duplicate prevention logic
  - Safe to call `playMusic()` multiple times
- **Automatic cleanup:**
  - Cleanup on window `beforeunload` event
  - Manual cleanup available via `cleanup()` method
- **Volume/Mute:** 
  - Unified control via `Howler.volume()` for all sounds
  - No localStorage persistence
- **Autoplay:** Handled automatically (user must interact with the page)

---

## 📂 Source Code

- `src/lib/store/audioStore.ts` - **Main music management** (owns Howl instances, caching, state)
- `src/lib/services/audioService.ts` - **SFX management** and Howl factory
- `src/lib/hooks/useAudio.ts` - React hooks (useBackgroundMusic, usePreloadMusic, etc.)
- `src/lib/constants/audioAssets.ts` - Audio file paths

---

## ✅ Best Practices

### 1. Preload music on app start

```typescript
// In HomePage or _app.tsx
const preloadMusic = usePreloadMusic();

useEffect(() => {
  preloadMusic(); // Load all tracks into cache
}, [preloadMusic]);
```

**Why?** Eliminates delays when switching between tracks.

---

### 2. Background Music Management

**Always cleanup on unmount:**

```typescript
useEffect(() => {
  playMainTheme();
  return () => stopMusic(0); // ← Critical!
}, [playMainTheme, stopMusic]);
```

**Don't worry about duplicate calls:**

```typescript
// ✅ Safe - built-in protection
playMainTheme();
playMainTheme();
playMainTheme(); // Only plays once
```

**Page transitions:**

```typescript
// HomePage
useEffect(() => {
  playMainTheme();
  return () => stopMusic(0); // Stop when leaving
}, []);

// GamePage
useEffect(() => {
  playBattleMusic();
  return () => playMainTheme(); // Return to main theme
}, []);
```

### Common Pitfalls

❌ **Don't:** Forget cleanup

```typescript
useEffect(() => {
  playMainTheme();
  // Missing return cleanup!
}, []);
```

❌ **Don't:** Comment out stopMusic

```typescript
return () => {
  // stopMusic(0); ← BAD! Always cleanup
};
```

✅ **Do:** Always include dependencies

```typescript
useEffect(() => {
  playMainTheme();
  return () => stopMusic(0);
}, [playMainTheme, stopMusic]); // ← Include all used functions
```

---

## 🐛 Troubleshooting

### Music plays twice/duplicates

**This should no longer happen!** The new architecture guarantees:
- Only one Howl instance per track (cached in store)
- Store is the single owner of all music Howl instances
- Built-in duplicate prevention checks playing state
- React StrictMode safe (no double-play in dev mode)

**If it still happens:**
1. Check that you're not manually creating Howl instances outside the store
2. Check browser console for `🎵` debug logs to trace the issue

---

### Music doesn't stop when component unmounts

**This is intentional!** Background music continues playing across pages by design.

**To stop music explicitly:**

```typescript
const { stopMusic } = useBackgroundMusic();

// Stop when needed
stopMusic();
```

---

### Music has loading delay when switching

**Cause:** Tracks not preloaded

**Fix:** Add preload on app start:

```typescript
const preloadMusic = usePreloadMusic();
useEffect(() => {
  preloadMusic();
}, [preloadMusic]);
```

---

### Music stutters or has issues

**Root cause:** Usually browser autoplay policy or React StrictMode in development.

**Solutions:**
1. User must interact with page first (click/tap)
2. Use `preloadMusic()` to cache tracks early
3. Check console for `🎵` debug logs

---

## 🔍 Debug Mode

All music operations log to console with `🎵` prefix:

```
🎵 Creating new Howl for: /audio/music/battle/death-taker.mp3
🎵 Using cached Howl for: /audio/music/background/fantasy-village-woods.mp3
🎵 Current state: {currentTrack: '...', requestedTrack: '...'}
🎵 Music already playing: /audio/music/battle/death-taker.mp3
🎵 Stopping old music: /audio/music/background/fantasy-village-woods.mp3
🎵 Starting new music: /audio/music/battle/death-taker.mp3
🎵 Set as current: /audio/music/battle/death-taker.mp3
```

Check these logs to trace music playback and identify issues.
