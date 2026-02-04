# 🎵 Audio System

Audio system based on Howler.js and Zustand for managing music and sound effects.

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

## 🎮 Hooks

### 1. Background Music

```typescript
import { useBackgroundMusic } from '@/lib/hooks/useAudio';

function HomePage() {
  const { playMainTheme, playBattleMusic, stopMusic } = useBackgroundMusic();

  useEffect(() => {
    playMainTheme(); // Start background music
    return () => stopMusic(0);
  }, []);
}
```

**Available methods:**

- `playMainTheme()` - main menu / lobby
- `playBattleMusic()` - battle music
- `stopMusic(fadeDuration?)` - stop with fade-out

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

- **Music:** Looped, only one track at a time, smooth fade transitions (500ms)
- **SFX:** Parallel playback, no looping
- **Separate control:** Music can be muted separately from sound effects
  - `toggleMute()` - mutes everything (music + SFX)
  - `toggleMusicMute()` - mutes only music (SFX continue playing)
- **Autoplay:** Handled automatically (user must interact with the page)
- **Volume/Mute:** Unified control for all sounds, no localStorage persistence
- **Singleton:** `audioService` - one instance for the entire application

---

## 📂 Source Code

- `src/lib/services/audioService.ts` - Howler.js wrapper
- `src/lib/store/audioStore.ts` - Zustand state management
- `src/lib/hooks/useAudio.ts` - React hooks
- `src/lib/constants/audioAssets.ts` - File paths
