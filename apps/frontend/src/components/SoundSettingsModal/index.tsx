'use client';

import { useAudioControls, useModalSound } from '@/lib/hooks/useAudio';
import { SoundSettingsBg } from './assets/sound-settings-bg';
import ModalTitle from '../shared/ModalTitle';
import { Button } from '../shared/Button';
import { VolumeSlider } from './VolumeSlider';

interface SoundSettingsModalProps {
  onClose: () => void;
}

export default function SoundSettingsModal({
  onClose,
}: SoundSettingsModalProps) {
  useModalSound();

  const {
    musicVolume,
    interfaceVolume,
    effectsVolume,
    setMusicVolume,
    setInterfaceVolume,
    setEffectsVolume,
  } = useAudioControls();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-100 h-100 relative px-4 pb-6 pt-2"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalTitle
          title="Sound Effects"
          onClose={onClose}
          textSizeClass="text-3xl"
        />

        <div className="mt-4 flex flex-col gap-4">
          <VolumeSlider
            label="Background music"
            value={musicVolume}
            onChange={setMusicVolume}
          />
          <VolumeSlider
            label="Interface sounds"
            value={interfaceVolume}
            onChange={setInterfaceVolume}
          />
          <VolumeSlider
            label="Effects volume"
            value={effectsVolume}
            onChange={setEffectsVolume}
          />
        </div>

        <div className="mt-4">
          <Button
            variant="gray"
            className="h-13 w-full text-lg"
            onClick={onClose}
          >
            Apply settings
          </Button>
        </div>

        <SoundSettingsBg className="absolute inset-0 -z-10 h-full w-full" />
      </div>
    </div>
  );
}
