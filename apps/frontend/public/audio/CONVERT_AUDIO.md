# Audio Conversion Guide

## Почему нужно конвертировать WAV в MP3/OGG?

- **WAV файлы очень большие**: 21MB для 2-3 минут музыки
- **MP3 будет ~2MB**: В 10 раз меньше при той же качестве
- **Быстрая загрузка**: Пользователи не будут ждать загрузку музыки
- **Лучшая поддержка браузеров**: MP3 поддерживается везде

## Как конвертировать?

### Вариант 1: FFmpeg (рекомендуется)

Если у вас установлен FFmpeg:

```bash
# Конвертировать WAV в MP3 с хорошим качеством
ffmpeg -i fantasy-village-woods-full.wav -codec:a libmp3lame -q:a 2 fantasy-village-woods-full.mp3

# Или в OGG (альтернатива MP3)
ffmpeg -i fantasy-village-woods-full.wav -codec:a libvorbis -q:a 6 fantasy-village-woods-full.ogg
```

Параметры:
- `-q:a 2` для MP3 = высокое качество (0-9, где 0 = лучшее)
- `-q:a 6` для OGG = хорошее качество (0-10)

### Вариант 2: Онлайн конвертеры

1. **CloudConvert**: https://cloudconvert.com/wav-to-mp3
2. **Online-Convert**: https://audio.online-convert.com/convert-to-mp3
3. **FreeConvert**: https://www.freeconvert.com/wav-to-mp3

Просто загрузите WAV файл и скачайте MP3.

### Вариант 3: Audacity (бесплатный редактор)

1. Скачайте Audacity: https://www.audacityteam.org/
2. Откройте WAV файл
3. File → Export → Export as MP3
4. Выберите качество: 192kbps или 256kbps

## После конвертации

1. Положите MP3 файл в ту же папку
2. Обновите путь в `audioAssets.ts`:

```typescript
fantasyVillage: '/audio/music/background/fantasy-village-woods-full.mp3',
```

3. Удалите WAV файл (необязательно, но освободит место)

## Поддержка форматов в Howler.js

Howler автоматически выбирает лучший формат:

```typescript
const howl = new Howl({
  src: [
    '/audio/music/background/song.mp3',  // Fallback 1
    '/audio/music/background/song.ogg',  // Fallback 2
    '/audio/music/background/song.wav',  // Fallback 3
  ]
});
```

Рекомендуется иметь 2 формата: **MP3** (для Chrome/Safari) и **OGG** (для Firefox).
