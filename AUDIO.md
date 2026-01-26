# 🎵 Audio System

Аудио-система на базе Howler.js и Zustand для управления музыкой и звуковыми эффектами.

## 📁 Структура файлов

```
public/audio/
├── music/
│   ├── background/fantasy-village-woods.mp3   # Главное меню
│   └── battle/death-taker.mp3                 # Битва
└── sfx/
    ├── ui/                                    # UI звуки
    │   ├── hover.mp3
    │   ├── click.mp3
    │   ├── modal-open.mp3
    │   └── modal-close.mp3
    ├── mage/                                  # Звуки мага
    │   ├── cast.mp3
    │   └── impact.mp3
    └── archer/                                # Звуки лучника
        ├── arrow-shot.mp3
        └── arrow-impact.mp3
```

## 📦 Конфигурация (audioAssets.ts)

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
      phantomDuelist: {}, // Для будущего расширения
    },
  },
};
```

## 🎮 Хуки

### 1. Фоновая музыка

```typescript
import { useBackgroundMusic } from '@/lib/hooks/useAudio';

function HomePage() {
  const { playMainTheme, playBattleMusic, stopMusic } = useBackgroundMusic();

  useEffect(() => {
    playMainTheme(); // Запустить фоновую музыку
    return () => stopMusic(0);
  }, []);
}
```

**Доступные методы:**

- `playMainTheme()` - главное меню / лобби
- `playBattleMusic()` - музыка битвы
- `stopMusic(fadeDuration?)` - остановить с fade-out

---

### 2. Управление громкостью

```typescript
import { useAudioControls } from '@/lib/hooks/useAudio';

function AudioSettings() {
  const { volume, isMuted, setVolume, toggleMute } = useAudioControls();

  return (
    <>
      <input value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
      <button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</button>
    </>
  );
}
```

---

### 3. UI звуки

#### Hover (наведение)

```typescript
import { useHoverSound } from '@/lib/hooks/useAudio';

function MyButton() {
  const playHoverSound = useHoverSound();

  return <button onMouseEnter={playHoverSound}>Hover me</button>;
}
```

Или через пропс:

```typescript
<Button enableHoverSound>Hover me</Button>
<BoxButton enableHoverSound>Or me</BoxButton>
```

#### Click (клик)

```typescript
import { useClickSound } from '@/lib/hooks/useAudio';

function MyButton() {
  const playClickSound = useClickSound();

  return <button onClick={playClickSound}>Click me</button>;
}
```

Или через пропс:

```typescript
<Button enableClickSound>Click me</Button>
<BoxButton enableClickSound>Or me</BoxButton>
```

#### Modal (открытие/закрытие)

```typescript
import { useModalSound } from '@/lib/hooks/useAudio';

function MyModal() {
  useModalSound();  // Автоматически играет звуки при mount/unmount

  return <div>Modal content</div>;
}
```

---

### 4. Звуки заклинаний (автоматические)

```typescript
import { useSpellSounds } from '@/lib/hooks/useAudio';

function GamePage() {
  useSpellSounds();  // Автоматически играет звуки заклинаний через EventBus

  return <Game />;
}
```

**Как это работает:**

1. Phaser emit'ит `EventBus.emit('cast-spell', x, y, spell)`
2. `useSpellSounds` перехватывает событие
3. Автоматически играет звук через `SPELL_SOUND_MAP`

**Текущие маппинги:**

- Mage: Lightning, FireBall, Teleport, Heal, Laser → `mage/cast.mp3`
- Archer: Arrow, AimingShot, HailOfArrows, Decoy, Cloud → `archer/arrow-shot.mp3`
- Phantom Duelist: Fallback → `mage/cast.mp3`

---

### 5. Прямое использование

```typescript
import { useSound } from '@/lib/hooks/useAudio';

function MyComponent() {
  const playSound = useSound();

  const handleAction = () => {
    playSound('click'); // Ключ из AUDIO_ASSETS.sfx
  };
}
```

Или через store:

```typescript
import { useAudioStore } from '@/lib/store/audioStore';

const playSound = useAudioStore((state) => state.playSound);
playSound('/audio/sfx/ui/click.mp3'); // Полный путь
```

---

## ➕ Добавление новых звуков

### Для нового героя (например, Phantom Duelist):

## Лучше использовать mp3, потому что wav весят существенно больше.

## Я использовал сервис https://cloudconvert.com/wav-to-mp3 для конвертации

1. **Добавить файлы:**

   ```bash
   mkdir -p apps/frontend/public/audio/sfx/phantom
   # Добавить: cast.mp3, impact.mp3
   ```

2. **Обновить `audioAssets.ts`:**

   ```typescript
   phantomDuelist: {
     cast: '/audio/sfx/phantom/cast.mp3',
     impact: '/audio/sfx/phantom/impact.mp3',
   },
   ```

3. **Обновить `SPELL_SOUND_MAP` в `useAudio.ts`:**
   ```typescript
   'SpectralArrow': AUDIO_ASSETS.sfx.heroes.phantomDuelist.cast,
   'ShadowVeil': AUDIO_ASSETS.sfx.heroes.phantomDuelist.cast,
   // ... и т.д.
   ```

### Для уникального звука заклинания:

1. **Добавить файл:** `lightning.mp3`
2. **Обновить `audioAssets.ts`:**
   ```typescript
   mage: {
     cast: '/audio/sfx/mage/cast.mp3',
     impact: '/audio/sfx/mage/impact.mp3',
     lightning: '/audio/sfx/mage/lightning.mp3',  // ← новый
   },
   ```
3. **Обновить маппинг:**
   ```typescript
   'Lightning': AUDIO_ASSETS.sfx.heroes.mage.lightning,
   ```

---

## 🎛️ Особенности

- **Музыка:** Зацикленная, только один трек одновременно, плавные fade-переходы (500ms)
- **SFX:** Параллельное воспроизведение, без зацикливания
- **Autoplay:** Обрабатывается автоматически (пользователь должен взаимодействовать со страницей)
- **Volume/Mute:** Единый контроль для всех звуков, без сохранения в localStorage
- **Singleton:** `audioService` - один экземпляр на всё приложение

---

## 📂 Исходный код

- `src/lib/services/audioService.ts` - Howler.js wrapper
- `src/lib/store/audioStore.ts` - Zustand state management
- `src/lib/hooks/useAudio.ts` - React hooks
- `src/lib/constants/audioAssets.ts` - Пути к файлам
