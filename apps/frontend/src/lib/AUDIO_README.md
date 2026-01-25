# Audio System Documentation

Система управления аудио в игре, построенная на Howler.js и Zustand.

## Структура

```
src/lib/
├── services/
│   └── audioService.ts      # Howler.js wrapper
├── store/
│   └── audioStore.ts        # Zustand state management
├── hooks/
│   └── useAudio.ts          # React hooks
└── constants/
    └── audioAssets.ts       # Audio file paths

public/audio/
├── music/
│   ├── background/          # Фоновая музыка (главное меню, лобби)
│   │   └── fantasy-village-woods.mp3
│   └── battle/              # Музыка битвы (во время игры)
│       └── death-taker.mp3
└── sfx/                     # Звуковые эффекты
    ├── ui/
    ├── spells/
    └── archer/
```

## Использование

### 1. Воспроизведение фоновой музыки

```typescript
import { useBackgroundMusic } from '@/lib/hooks/useAudio';

function MyComponent() {
  const { playMainTheme, playBattleMusic, stopMusic } = useBackgroundMusic();

  useEffect(() => {
    // Запустить основную тему (главное меню, лобби)
    playMainTheme();
    
    // Или музыку битвы (игровая сцена)
    // playBattleMusic();
    
    // Остановить музыку
    // stopMusic();
  }, []);
}
```

**Пример: Автоматическое переключение при входе в игру**

```typescript
// В компоненте игровой страницы
useEffect(() => {
  // Включить battle музыку при входе
  playBattleMusic();

  // Вернуть фоновую музыку при выходе
  return () => {
    playMainTheme();
  };
}, [playBattleMusic, playMainTheme]);
```

### 2. Воспроизведение звуковых эффектов

```typescript
import { useSound } from '@/lib/hooks/useAudio';

function Button() {
  const playSound = useSound();

  const handleClick = () => {
    playSound('click'); // Ключ из AUDIO_ASSETS
    // Ваша логика
  };
}
```

### 2.1. Автоматические звуки модалей

Для модальных окон используйте хук `useModalSound()`:

```typescript
import { useModalSound } from '@/lib/hooks/useAudio';

function MyModal({ onClose }) {
  // Автоматически играет звук открытия при монтировании
  // и звук закрытия при размонтировании
  useModalSound();

  return (
    <div>
      <button onClick={onClose}>Закрыть</button>
      {/* Ваш контент */}
    </div>
  );
}
```

**Звуки уже интегрированы в:**
- InventoryModal
- CraftModal
- ExpeditionModal
- HowToPlay
- Support

### 2.2. Hover звуки (наведение на элементы)

Используйте `enableHoverSound` prop на компонентах `BoxButton` и `Button`:

```typescript
<BoxButton 
  onClick={handleClick}
  enableHoverSound  // 🎵 Включить hover звук
>
  Наведи на меня!
</BoxButton>

<Button 
  variant="blue"
  onClick={handleClick}
  enableHoverSound  // 🎵 Работает и с Button
>
  И на меня!
</Button>
```

**Интегрировано в:**
- Кнопки главного меню (Market, Inventory, Mail, Tournaments)
- Кнопки настроек (Support, Settings, Audio)
- Навигационные кнопки (Back, Next)
- Кнопки модалей
- Кнопки закрытия (Cross)

### 2.3. Click звуки (клик по элементам)

Используйте `enableClickSound` prop на компонентах `BoxButton` и `Button`:

```typescript
<BoxButton 
  onClick={handleClick}
  enableClickSound      // 🔊 Включить click звук
  enableHoverSound      // 🎵 Можно комбинировать с hover!
>
  Кликни на меня!
</BoxButton>

<Button 
  variant="blue"
  onClick={handleClick}
  enableClickSound      // 🔊 Работает и с Button
  enableHoverSound      // 🎵 Полная аудио-интеграция
>
  И на меня тоже!
</Button>
```

**Интегрировано в:**
- Все кнопки главного меню (Market, Inventory, Mail, Tournaments)
- Все кнопки настроек (Support, Settings, Audio/Mute)
- Кнопки главного меню (Play, Tournaments, Customization, How to play, Support)
- Навигационные кнопки (Back, Next, стрелки)
- Кнопки модалей (Send, Start, Interrupt Expedition)
- Кнопки закрытия (Cross в модалях)

### 3. Управление громкостью и mute

```typescript
import { useAudioControls } from '@/lib/hooks/useAudio';

function AudioSettings() {
  const { volume, isMuted, setVolume, toggleMute } = useAudioControls();

  return (
    <>
      <input 
        type="range" 
        value={volume} 
        onChange={(e) => setVolume(Number(e.target.value))}
      />
      <button onClick={toggleMute}>
        {isMuted ? 'Unmute' : 'Mute'}
      </button>
    </>
  );
}
```

### 4. Прямой доступ к store

```typescript
import { useAudioStore } from '@/lib/store';

function MyComponent() {
  const volume = useAudioStore(state => state.volume);
  const playSound = useAudioStore(state => state.playSound);
  
  // Используйте напрямую
  playSound('/audio/sfx/ui/click.mp3');
}
```

## Добавление новых аудио-файлов

### 1. Добавьте файл в папку `public/audio/`

```
public/audio/
├── music/
│   ├── background/
│   │   └── new-track.mp3
│   └── battle/
└── sfx/
    └── ui/
        └── new-sound.mp3
```

### 2. Обновите `audioAssets.ts`

```typescript
export const AUDIO_ASSETS = {
  music: {
    background: {
      newTrack: '/audio/music/background/new-track.mp3',
    },
  },
  sfx: {
    ui: {
      newSound: '/audio/sfx/ui/new-sound.mp3',
    },
  },
};
```

### 3. Используйте в коде

```typescript
// Музыка
playMusic(AUDIO_ASSETS.music.background.newTrack);

// Звук
playSound('newSound');
```

## Особенности

- **Музыка**: Зацикленная, только один трек в момент времени
- **SFX**: Параллельное воспроизведение, без зацикливания
- **Fade**: Плавные переходы между треками (500ms по умолчанию)
- **Singleton**: audioService - синглтон для всего приложения
- **Lazy Loading**: Аудио загружается только при первом использовании

## API

### audioService

```typescript
audioService.playMusic(src, fadeDuration?)    // Играть музыку
audioService.stopMusic(fadeDuration?)         // Остановить музыку
audioService.pauseMusic()                     // Пауза
audioService.resumeMusic()                    // Продолжить
audioService.playSound(src)                   // Играть звук
audioService.setMasterVolume(0-100)          // Установить громкость
audioService.setMuted(boolean)               // Вкл/выкл звук
```

### audioStore

```typescript
volume: number              // 0-100
isMuted: boolean           // Состояние mute
currentMusic: string       // Текущий трек
setVolume(volume)          // Установить громкость
toggleMute()               // Переключить mute
playMusic(src, fade?)      // Играть музыку
stopMusic(fade?)           // Остановить музыку
playSound(src)             // Играть звук
```

## Troubleshooting

### Музыка не играет
1. Проверьте, что файл существует в `public/audio/`
2. Проверьте консоль браузера на ошибки
3. Убедитесь, что пользователь взаимодействовал со страницей (autoplay policy)

### Звук слишком громкий/тихий
Используйте `setVolume(0-100)` для настройки громкости

### Множественные экземпляры одного звука
Это нормально для SFX. Для музыки используется только один экземпляр.
