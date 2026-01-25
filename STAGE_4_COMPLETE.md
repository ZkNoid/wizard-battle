# ✅ Этап 4 Завершён: Hover эффекты (наведение на кнопки)

## 🎯 Что реализовано

### 1. Создан хук `useHoverSound()`
```typescript
export function useHoverSound() {
  const playSound = useAudioStore((state) => state.playSound);
  
  return useCallback(() => {
    playSound(AUDIO_ASSETS.sfx.ui.hover);
  }, [playSound]);
}
```

### 2. Добавлена поддержка hover звуков в компоненты
- ✅ **BoxButton** - новый prop `enableHoverSound`
- ✅ **Button** - новый prop `enableHoverSound`
- ✅ Звук играет только если не disabled
- ✅ Звук играет только при onMouseEnter

### 3. Интегрировано в главное меню
**HomePage:**
- ✅ Market button (иконка магазина)
- ✅ Inventory button (иконка инвентаря)
- ✅ Mail button (иконка почты)
- ✅ Tournaments button (иконка турниров)

**SettingsBar:**
- ✅ Support button (? иконка)
- ✅ Settings button (⚙️ иконка)
- ✅ Audio mute button (🔊 иконка)

### 4. Обновлена документация
- ✅ Обновлён `public/audio/sfx/ui/README.md`
- ✅ Добавлены примеры использования
- ✅ Список интегрированных компонентов

## 📁 Изменённые файлы

### Новая функциональность:

```
src/lib/hooks/
└── useAudio.ts                      ✅ Добавлен useHoverSound()

src/components/shared/
├── BoxButton/index.tsx              ✅ Prop enableHoverSound
└── Button/index.tsx                 ✅ Prop enableHoverSound

src/components/
├── HomePage/index.tsx               ✅ Включены hover звуки
├── BaseLayout/SettingsBar.tsx       ✅ Включены hover звуки
└── AudioSelector/index.tsx          ✅ Включен hover звук
```

## 🎨 Использование

### Базовое использование в любом компоненте:

```typescript
import BoxButton from '@/components/shared/BoxButton';

<BoxButton
  onClick={handleClick}
  enableHoverSound    // 👈 Просто добавьте этот prop!
>
  Hover me!
</BoxButton>
```

### С компонентом Button:

```typescript
import { Button } from '@/components/shared/Button';

<Button
  variant="blue"
  onClick={handleClick}
  enableHoverSound    // 👈 И здесь работает!
>
  Click me!
</Button>
```

### Прямое использование хука:

```typescript
import { useHoverSound } from '@/lib/hooks/useAudio';

function CustomButton() {
  const playHoverSound = useHoverSound();

  return (
    <div onMouseEnter={playHoverSound}>
      Custom hover sound!
    </div>
  );
}
```

## 📝 Что нужно сделать

### Добавить hover звук:

1. **Скачайте звук**:
   - UI Hover/Rollover/Select
   - https://www.pond5.com/ru/sound-effects/item/192536642-ui-hover-rollover-select-10

2. **Конвертируйте в MP3** (если WAV):
   ```bash
   ffmpeg -i hover.wav -codec:a libmp3lame -q:a 4 hover.mp3
   ```

3. **Поместите файл**:
   ```
   apps/frontend/public/audio/sfx/ui/hover.mp3
   ```

4. **Готово!** Звук заработает автоматически.

## 🧪 Тестирование

### Проверьте hover звуки:

1. ✅ Откройте http://localhost:3000

2. ✅ Наведите курсор на кнопки верхнего меню:
   - Market (иконка магазина) → звук
   - Inventory (иконка сумки) → звук
   - Mail (иконка письма) → звук
   - Tournaments (иконка кубка) → звук

3. ✅ Наведите на кнопки настроек:
   - Support (?) → звук
   - Settings (⚙️) → звук
   - Audio mute (🔊) → звук

4. ✅ Проверьте, что звук НЕ играет:
   - На disabled кнопках
   - При клике (только при hover)
   - Если enableHoverSound не указан

### Проверьте громкость:

- Используйте AudioSelector слайдер
- Hover звуки должны подчиняться общей громкости

## 🎨 Особенности реализации

### Opt-in подход

Мы использовали opt-in подход (не breaking changes):

```typescript
// ❌ НЕ ломает существующий код
<BoxButton onClick={...}>  
  // Работает как раньше, без звука
</BoxButton>

// ✅ Новая функциональность по запросу
<BoxButton onClick={...} enableHoverSound>
  // Теперь с hover звуком!
</BoxButton>
```

### Проверка disabled

```typescript
const handleMouseEnter = () => {
  if (enableHoverSound && !disabled) {  // 👈 Проверяем disabled
    playHoverSound();
  }
};
```

Звук не играет на disabled кнопках - хороший UX!

### Производительность

- Звук кешируется Howler.js при первой загрузке
- Последующие hover'ы используют кешированный файл
- Нет задержек при наведении

## 📊 Статус звуков

| Звук | Статус | Этап |
|------|--------|------|
| Фоновая музыка | ✅ Работает | 1 |
| Battle музыка | ✅ Работает | 2 |
| Открытие модалей | ✅ Работает | 3 |
| Закрытие модалей | ✅ Работает | 3 |
| Hover эффекты | ⏳ Нужен файл | 4 |
| Click эффекты | 📋 Запланировано | 5 |
| Звуки заклинаний | 📋 Запланировано | 6 |

## 🔊 Интегрированные компоненты

```
HomePage (/)
├── Market button             ✅ enableHoverSound
├── Inventory button          ✅ enableHoverSound
├── Mail button               ✅ enableHoverSound
├── Tournaments button        ✅ enableHoverSound
├── Support button (?)        ✅ enableHoverSound
├── Settings button (⚙️)      ✅ enableHoverSound
└── Audio mute button (🔊)    ✅ enableHoverSound
```

## 🚀 Расширение функциональности

### Добавить hover звук в другие компоненты:

Просто добавьте prop `enableHoverSound`:

```typescript
// В любой кнопке проекта
<BoxButton
  onClick={handleClick}
  enableHoverSound  // 👈 Просто добавьте!
  color="blue"
>
  New button with sound
</BoxButton>
```

### Добавить hover звук в кастомный компонент:

```typescript
import { useHoverSound } from '@/lib/hooks/useAudio';

function MyComponent() {
  const playHover = useHoverSound();

  return (
    <div 
      onMouseEnter={playHover}
      className="cursor-pointer"
    >
      Custom element with hover sound
    </div>
  );
}
```

## 📋 Следующий этап

**Этап 5: Click эффекты (клики по кнопкам)**

Будет реализовано:
- Звук при клике на кнопки
- Prop `enableClickSound` в Button/BoxButton
- Интеграция с основными кнопками
- Различие между hover и click звуками

Готовы продолжать? 🚀

## 💡 Полезные команды

```bash
# Проверить структуру аудио файлов
ls -lh apps/frontend/public/audio/sfx/ui/

# Конвертировать WAV → MP3
ffmpeg -i hover.wav -codec:a libmp3lame -q:a 4 hover.mp3

# Перезапустить dev server
cd apps/frontend && pnpm dev
```

## 🎯 Преимущества реализации

1. **Не ломает существующий код** - все работает без изменений
2. **Легко добавлять** - один prop `enableHoverSound`
3. **Консистентно** - все кнопки звучат одинаково
4. **Производительно** - кеширование звуков
5. **UX-friendly** - не играет на disabled кнопках
