import type { Wizard } from '../../../../../common/wizards';

import Image from 'next/image';

export default function WizardImageMini({ wizard }: { wizard: Wizard }) {
  const getWizardImage = (wizard: Wizard) => {
    switch (wizard.name) {
      case 'Wizard':
        return '/inventory/carousel/mage.png';
      case 'Archer':
        return '/inventory/carousel/archer.png';
      case 'Phantom Duelist':
        return '/inventory/carousel/warrior.png';
      default:
        return '/inventory/carousel/mage.png';
    }
  };

  return (
    <div className="size-40 flex-shrink-0">
      <Image
        src={getWizardImage(wizard)}
        width={120}
        height={120}
        alt={wizard.name}
        style={{ objectFit: 'contain', pointerEvents: 'none' }}
        draggable={false}
        className="size-full"
        quality={100}
        unoptimized={true}
      />
    </div>
  );
}
