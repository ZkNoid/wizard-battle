import { useState } from 'react';

// Effect icon component - displays small icons for active effects
export function EffectIcon({
  effectName,
  duration,
}: {
  effectName: string;
  duration: number;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (effectName === 'Decoy') {
    return null;
  }

  const getEffectStyle = (name: string) => {
    // Map effect names to icons, colors and descriptions
    const effectStyles: Record<
      string,
      {
        icon: React.ReactNode;
        color: string;
        bgColor: string;
        description: string;
      }
    > = {
      Invisible: {
        icon: (
          <svg
            width="96"
            height="96"
            viewBox="0 0 96 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M96 0H0V6H96V0Z" fill="#070C19" />
            <path d="M36 6H0V12H36V6Z" fill="#070C19" />
            <path d="M42 6H36V12H42V6Z" fill="#0077AE" />
            <path d="M54 6H42V12H54V6Z" fill="#FFFBFE" />
            <path d="M60 6H54V12H60V6Z" fill="#0077AE" />
            <path d="M96 6H60V12H96V6Z" fill="#070C19" />
            <path d="M30 12H0V18H30V12Z" fill="#070C19" />
            <path d="M36 12H30V18H36V12Z" fill="#0077AE" />
            <path d="M42 12H36V18H42V12Z" fill="#FFFBFE" />
            <path d="M54 12H42V18H54V12Z" fill="#003F7A" />
            <path d="M60 12H54V18H60V12Z" fill="#FFFBFE" />
            <path d="M66 12H60V18H66V12Z" fill="#0077AE" />
            <path d="M96 12H66V18H96V12Z" fill="#070C19" />
            <path d="M24 18H0V60H24V18Z" fill="#070C19" />
            <path d="M30 18H24V24H30V18Z" fill="#003F7A" />
            <path d="M36 18H30V24H36V18Z" fill="#FFFBFE" />
            <path d="M42 18H36V24H42V18Z" fill="#003F7A" />
            <path d="M54 18H42V42H54V18Z" fill="#070C19" />
            <path d="M60 18H54V24H60V18Z" fill="#003F7A" />
            <path d="M66 18H60V24H66V18Z" fill="#FFFBFE" />
            <path d="M72 18H66V24H72V18Z" fill="#003F7A" />
            <path d="M96 18H72V60H96V18Z" fill="#070C19" />
            <path d="M30 24H24V36H30V24Z" fill="#FFFBFE" />
            <path d="M36 24H30V30H36V24Z" fill="#0077AE" />
            <path d="M42 24H36V42H42V24Z" fill="#070C19" />
            <path d="M60 24H54V42H60V24Z" fill="#070C19" />
            <path d="M66 24H60V30H66V24Z" fill="#0077AE" />
            <path d="M72 24H66V36H72V24Z" fill="#FFFBFE" />
            <path d="M36 30H30V48H36V30Z" fill="#070C19" />
            <path d="M66 30H60V48H66V30Z" fill="#070C19" />
            <path d="M30 36H24V42H30V36Z" fill="#003F7A" />
            <path d="M72 36H66V42H72V36Z" fill="#003F7A" />
            <path d="M30 42H24V48H30V42Z" fill="#FFFBFE" />
            <path d="M60 42H36V48H60V42Z" fill="#FFFBFE" />
            <path d="M72 42H66V48H72V42Z" fill="#FFFBFE" />
            <path d="M30 48H24V54H30V48Z" fill="#0077AE" />
            <path d="M42 48H30V60H42V48Z" fill="#FFFBFE" />
            <path d="M54 48H42V60H54V48Z" fill="#070C19" />
            <path d="M66 48H54V60H66V48Z" fill="#FFFBFE" />
            <path d="M72 48H66V54H72V48Z" fill="#0077AE" />
            <path d="M30 54H24V60H30V54Z" fill="#070C19" />
            <path d="M72 54H66V60H72V54Z" fill="#070C19" />
            <path d="M12 60H0V66H12V60Z" fill="#070C19" />
            <path d="M18 60H12V66H18V60Z" fill="#0077AE" />
            <path d="M30 60H18V66H30V60Z" fill="#FFFBFE" />
            <path d="M36 60H30V66H36V60Z" fill="#003F7A" />
            <path d="M48 60H36V66H48V60Z" fill="#070C19" />
            <path d="M60 60H48V66H60V60Z" fill="#FFFBFE" />
            <path d="M66 60H60V96H66V60Z" fill="#070C19" />
            <path d="M78 60H66V66H78V60Z" fill="#FFFBFE" />
            <path d="M84 60H78V72H84V60Z" fill="#003F7A" />
            <path d="M90 60H84V66H90V60Z" fill="#0077AE" />
            <path d="M96 60H90V72H96V60Z" fill="#070C19" />
            <path d="M6 66H0V72H6V66Z" fill="#070C19" />
            <path d="M12 66H6V72H12V66Z" fill="#FFFBFE" />
            <path d="M30 66H12V72H30V66Z" fill="#003F7A" />
            <path d="M42 66H30V96H42V66Z" fill="#070C19" />
            <path d="M54 66H42V72H54V66Z" fill="#FFFBFE" />
            <path d="M60 66H54V96H60V66Z" fill="#070C19" />
            <path d="M78 66H66V72H78V66Z" fill="#003F7A" />
            <path d="M90 66H84V72H90V66Z" fill="#FFFBFE" />
            <path d="M6 72H0V78H6V72Z" fill="#FFFBFE" />
            <path d="M12 72H6V78H12V72Z" fill="#0077AE" />
            <path d="M30 72H12V84H30V72Z" fill="#070C19" />
            <path d="M54 72H42V78H54V72Z" fill="#070C19" />
            <path d="M84 72H66V84H84V72Z" fill="#070C19" />
            <path d="M90 72H84V78H90V72Z" fill="#0077AE" />
            <path d="M96 72H90V78H96V72Z" fill="#FFFBFE" />
            <path d="M6 78H0V84H6V78Z" fill="#0077AE" />
            <path d="M12 78H6V96H12V78Z" fill="#070C19" />
            <path d="M54 78H42V84H54V78Z" fill="#FFFBFE" />
            <path d="M90 78H84V96H90V78Z" fill="#070C19" />
            <path d="M96 78H90V84H96V78Z" fill="#0077AE" />
            <path d="M6 84H0V96H6V84Z" fill="#003F7A" />
            <path d="M24 84H12V90H24V84Z" fill="#003F7A" />
            <path d="M30 84H24V96H30V84Z" fill="#070C19" />
            <path d="M54 84H42V96H54V84Z" fill="#070C19" />
            <path d="M72 84H66V96H72V84Z" fill="#070C19" />
            <path d="M84 84H72V90H84V84Z" fill="#003F7A" />
            <path d="M96 84H90V96H96V84Z" fill="#003F7A" />
            <path d="M18 90H12V96H18V90Z" fill="#FFFBFE" />
            <path d="M24 90H18V96H24V90Z" fill="#003F7A" />
            <path d="M78 90H72V96H78V90Z" fill="#003F7A" />
            <path d="M84 90H78V96H84V90Z" fill="#FFFBFE" />
          </svg>
        ),
        color: '#070C19',
        bgColor: '#0077AE',
        description: 'Your position is hidden from the enemy.',
      },
      ShadowVeilInvisible: {
        icon: (
          <svg
            width="96"
            height="96"
            viewBox="0 0 96 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M30 0H0V6H30V0Z" fill="#070C19" />
            <path d="M36 0H30V6H36V0Z" fill="#330482" />
            <path d="M60 0H36V6H60V0Z" fill="#5320A8" />
            <path d="M66 0H60V6H66V0Z" fill="#330482" />
            <path d="M96 0H66V6H96V0Z" fill="#070C19" />
            <path d="M24 6H0V12H24V6Z" fill="#070C19" />
            <path d="M30 6H24V12H30V6Z" fill="#330482" />
            <path d="M36 6H30V12H36V6Z" fill="#5320A8" />
            <path d="M42 6H36V12H42V6Z" fill="#7446C0" />
            <path d="M54 6H42V12H54V6Z" fill="#FFFBFE" />
            <path d="M60 6H54V12H60V6Z" fill="#7446C0" />
            <path d="M66 6H60V12H66V6Z" fill="#5320A8" />
            <path d="M72 6H66V12H72V6Z" fill="#330482" />
            <path d="M96 6H72V12H96V6Z" fill="#070C19" />
            <path d="M18 12H0V18H18V12Z" fill="#070C19" />
            <path d="M24 12H18V18H24V12Z" fill="#330482" />
            <path d="M30 12H24V18H30V12Z" fill="#5320A8" />
            <path d="M36 12H30V18H36V12Z" fill="#7446C0" />
            <path d="M42 12H36V18H42V12Z" fill="#FFFBFE" />
            <path d="M54 12H42V18H54V12Z" fill="#7446C0" />
            <path d="M60 12H54V18H60V12Z" fill="#FFFBFE" />
            <path d="M66 12H60V18H66V12Z" fill="#7446C0" />
            <path d="M72 12H66V18H72V12Z" fill="#5320A8" />
            <path d="M78 12H72V18H78V12Z" fill="#330482" />
            <path d="M96 12H78V18H96V12Z" fill="#070C19" />
            <path d="M12 18H0V54H12V18Z" fill="#070C19" />
            <path d="M18 18H12V54H18V18Z" fill="#330482" />
            <path d="M24 18H18V60H24V18Z" fill="#5320A8" />
            <path d="M30 18H24V24H30V18Z" fill="#7446C0" />
            <path d="M36 18H30V24H36V18Z" fill="#FFFBFE" />
            <path d="M42 18H36V24H42V18Z" fill="#7446C0" />
            <path d="M54 18H42V96H54V18Z" fill="#070C19" />
            <path d="M60 18H54V24H60V18Z" fill="#7446C0" />
            <path d="M66 18H60V24H66V18Z" fill="#FFFBFE" />
            <path d="M72 18H66V24H72V18Z" fill="#7446C0" />
            <path d="M78 18H72V60H78V18Z" fill="#5320A8" />
            <path d="M84 18H78V54H84V18Z" fill="#330482" />
            <path d="M96 18H84V54H96V18Z" fill="#070C19" />
            <path d="M30 24H24V36H30V24Z" fill="#FFFBFE" />
            <path d="M36 24H30V30H36V24Z" fill="#7446C0" />
            <path d="M42 24H36V96H42V24Z" fill="#070C19" />
            <path d="M60 24H54V96H60V24Z" fill="#070C19" />
            <path d="M66 24H60V30H66V24Z" fill="#7446C0" />
            <path d="M72 24H66V36H72V24Z" fill="#FFFBFE" />
            <path d="M36 30H30V60H36V30Z" fill="#070C19" />
            <path d="M66 30H60V60H66V30Z" fill="#070C19" />
            <path d="M30 36H24V42H30V36Z" fill="#7446C0" />
            <path d="M72 36H66V42H72V36Z" fill="#7446C0" />
            <path d="M30 42H24V48H30V42Z" fill="#FFFBFE" />
            <path d="M72 42H66V48H72V42Z" fill="#FFFBFE" />
            <path d="M30 48H24V60H30V48Z" fill="#7446C0" />
            <path d="M72 48H66V60H72V48Z" fill="#7446C0" />
            <path d="M6 54H0V60H6V54Z" fill="#070C19" />
            <path d="M12 54H6V60H12V54Z" fill="#330482" />
            <path d="M18 54H12V60H18V54Z" fill="#5320A8" />
            <path d="M84 54H78V60H84V54Z" fill="#5320A8" />
            <path d="M90 54H84V60H90V54Z" fill="#330482" />
            <path d="M96 54H90V60H96V54Z" fill="#070C19" />
            <path d="M6 60H0V66H6V60Z" fill="#330482" />
            <path d="M12 60H6V66H12V60Z" fill="#5320A8" />
            <path d="M18 60H12V72H18V60Z" fill="#7446C0" />
            <path d="M30 60H18V66H30V60Z" fill="#FFFBFE" />
            <path d="M36 60H30V66H36V60Z" fill="#7446C0" />
            <path d="M66 60H60V66H66V60Z" fill="#7446C0" />
            <path d="M78 60H66V66H78V60Z" fill="#FFFBFE" />
            <path d="M84 60H78V72H84V60Z" fill="#7446C0" />
            <path d="M90 60H84V66H90V60Z" fill="#5320A8" />
            <path d="M96 60H90V66H96V60Z" fill="#330482" />
            <path d="M6 66H0V72H6V66Z" fill="#5320A8" />
            <path d="M12 66H6V72H12V66Z" fill="#FFFBFE" />
            <path d="M30 66H18V72H30V66Z" fill="#7446C0" />
            <path d="M36 66H30V96H36V66Z" fill="#070C19" />
            <path d="M66 66H60V96H66V66Z" fill="#070C19" />
            <path d="M78 66H66V72H78V66Z" fill="#7446C0" />
            <path d="M90 66H84V72H90V66Z" fill="#FFFBFE" />
            <path d="M96 66H90V72H96V66Z" fill="#5320A8" />
            <path d="M6 72H0V78H6V72Z" fill="#FFFBFE" />
            <path d="M12 72H6V78H12V72Z" fill="#7446C0" />
            <path d="M30 72H12V84H30V72Z" fill="#070C19" />
            <path d="M84 72H66V84H84V72Z" fill="#070C19" />
            <path d="M90 72H84V78H90V72Z" fill="#7446C0" />
            <path d="M96 72H90V78H96V72Z" fill="#FFFBFE" />
            <path d="M6 78H0V96H6V78Z" fill="#7446C0" />
            <path d="M12 78H6V96H12V78Z" fill="#070C19" />
            <path d="M90 78H84V96H90V78Z" fill="#070C19" />
            <path d="M96 78H90V96H96V78Z" fill="#7446C0" />
            <path d="M24 84H12V90H24V84Z" fill="#5320A8" />
            <path d="M30 84H24V96H30V84Z" fill="#070C19" />
            <path d="M72 84H66V96H72V84Z" fill="#070C19" />
            <path d="M84 84H72V90H84V84Z" fill="#5320A8" />
            <path d="M18 90H12V96H18V90Z" fill="#FFFBFE" />
            <path d="M24 90H18V96H24V90Z" fill="#5320A8" />
            <path d="M78 90H72V96H78V90Z" fill="#5320A8" />
            <path d="M84 90H78V96H84V90Z" fill="#FFFBFE" />
          </svg>
        ),
        color: '#070C19',
        bgColor: '#330482',
        description: 'Shadow veil conceals your position from enemies.',
      },
      Bleeding: {
        icon: (
          <svg
            width="96"
            height="96"
            viewBox="0 0 96 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M96 0H0V12H96V0Z" fill="#070C19" />
            <path d="M48 12H0V18H48V12Z" fill="#070C19" />
            <path d="M54 12H48V18H54V12Z" fill="#570F0A" />
            <path d="M96 12H54V18H96V12Z" fill="#070C19" />
            <path d="M42 18H0V24H42V18Z" fill="#070C19" />
            <path d="M48 18H42V24H48V18Z" fill="#570F0A" />
            <path d="M54 18H48V30H54V18Z" fill="#F33712" />
            <path d="M60 18H54V24H60V18Z" fill="#570F0A" />
            <path d="M96 18H60V24H96V18Z" fill="#070C19" />
            <path d="M36 24H0V30H36V24Z" fill="#070C19" />
            <path d="M42 24H36V30H42V24Z" fill="#570F0A" />
            <path d="M48 24H42V60H48V24Z" fill="#F33712" />
            <path d="M60 24H54V36H60V24Z" fill="#F33712" />
            <path d="M66 24H60V30H66V24Z" fill="#570F0A" />
            <path d="M96 24H66V30H96V24Z" fill="#070C19" />
            <path d="M30 30H0V42H30V30Z" fill="#070C19" />
            <path d="M36 30H30V42H36V30Z" fill="#570F0A" />
            <path d="M42 30H36V54H42V30Z" fill="#F33712" />
            <path d="M54 30H48V42H54V30Z" fill="#FF7A60" />
            <path d="M66 30H60V42H66V30Z" fill="#F33712" />
            <path d="M72 30H66V42H72V30Z" fill="#570F0A" />
            <path d="M96 30H72V42H96V30Z" fill="#070C19" />
            <path d="M60 36H54V48H60V36Z" fill="#FF7A60" />
            <path d="M24 42H0V96H24V42Z" fill="#070C19" />
            <path d="M30 42H24V60H30V42Z" fill="#570F0A" />
            <path d="M36 42H30V48H36V42Z" fill="#F33712" />
            <path d="M54 42H48V60H54V42Z" fill="#F33712" />
            <path d="M66 42H60V48H66V42Z" fill="#FF7A60" />
            <path d="M72 42H66V60H72V42Z" fill="#F33712" />
            <path d="M78 42H72V60H78V42Z" fill="#570F0A" />
            <path d="M96 42H78V96H96V42Z" fill="#070C19" />
            <path d="M36 48H30V60H36V48Z" fill="#9C1704" />
            <path d="M66 48H54V72H66V48Z" fill="#F33712" />
            <path d="M42 54H36V72H42V54Z" fill="#9C1704" />
            <path d="M30 60H24V96H30V60Z" fill="#070C19" />
            <path d="M36 60H30V72H36V60Z" fill="#570F0A" />
            <path d="M54 60H42V72H54V60Z" fill="#9C1704" />
            <path d="M72 60H66V72H72V60Z" fill="#570F0A" />
            <path d="M78 60H72V96H78V60Z" fill="#070C19" />
            <path d="M36 72H30V96H36V72Z" fill="#070C19" />
            <path d="M66 72H36V78H66V72Z" fill="#570F0A" />
            <path d="M72 72H66V96H72V72Z" fill="#070C19" />
            <path d="M66 78H36V96H66V78Z" fill="#070C19" />
          </svg>
        ),
        color: '#070C19',
        bgColor: '#F33712',
        description: 'Takes 20 damage at the end of each turn.',
      },
      Slowing: {
        icon: (
          <svg
            width="96"
            height="96"
            viewBox="0 0 96 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M96 0H0V6H96V0Z" fill="#070C19" />
            <path d="M54 6H0V18H54V6Z" fill="#070C19" />
            <path d="M60 6H54V12H60V6Z" fill="#F33712" />
            <path d="M84 6H60V12H84V6Z" fill="#070C19" />
            <path d="M90 6H84V12H90V6Z" fill="#F33712" />
            <path d="M96 6H90V96H96V6Z" fill="#070C19" />
            <path d="M60 12H54V18H60V12Z" fill="#9C1704" />
            <path d="M66 12H60V18H66V12Z" fill="#F33712" />
            <path d="M78 12H66V18H78V12Z" fill="#070C19" />
            <path d="M84 12H78V18H84V12Z" fill="#F33712" />
            <path d="M90 12H84V18H90V12Z" fill="#9C1704" />
            <path d="M42 18H0V24H42V18Z" fill="#070C19" />
            <path d="M48 18H42V24H48V18Z" fill="#ADC2E7" />
            <path d="M60 18H48V24H60V18Z" fill="#070C19" />
            <path d="M66 18H60V24H66V18Z" fill="#9C1704" />
            <path d="M78 18H66V24H78V18Z" fill="#F33712" />
            <path d="M84 18H78V24H84V18Z" fill="#9C1704" />
            <path d="M90 18H84V24H90V18Z" fill="#070C19" />
            <path d="M36 24H0V30H36V24Z" fill="#070C19" />
            <path d="M42 24H36V30H42V24Z" fill="#ADC2E7" />
            <path d="M48 24H42V54H48V24Z" fill="#748FBE" />
            <path d="M54 24H48V30H54V24Z" fill="#ADC2E7" />
            <path d="M60 24H54V30H60V24Z" fill="#F33712" />
            <path d="M66 24H60V30H66V24Z" fill="#070C19" />
            <path d="M78 24H66V30H78V24Z" fill="#9C1704" />
            <path d="M84 24H78V30H84V24Z" fill="#070C19" />
            <path d="M90 24H84V30H90V24Z" fill="#F33712" />
            <path d="M30 30H0V36H30V30Z" fill="#070C19" />
            <path d="M36 30H30V36H36V30Z" fill="#ADC2E7" />
            <path d="M42 30H36V78H42V30Z" fill="#748FBE" />
            <path d="M54 30H48V48H54V30Z" fill="#748FBE" />
            <path d="M60 30H54V36H60V30Z" fill="#9C1704" />
            <path d="M66 30H60V36H66V30Z" fill="#F33712" />
            <path d="M78 30H66V36H78V30Z" fill="#070C19" />
            <path d="M84 30H78V36H84V30Z" fill="#F33712" />
            <path d="M90 30H84V36H90V30Z" fill="#9C1704" />
            <path d="M24 36H0V42H24V36Z" fill="#070C19" />
            <path d="M30 36H24V42H30V36Z" fill="#ADC2E7" />
            <path d="M36 36H30V78H36V36Z" fill="#748FBE" />
            <path d="M60 36H54V42H60V36Z" fill="#748FBE" />
            <path d="M66 36H60V42H66V36Z" fill="#9C1704" />
            <path d="M78 36H66V42H78V36Z" fill="#F33712" />
            <path d="M84 36H78V42H84V36Z" fill="#9C1704" />
            <path d="M90 36H84V96H90V36Z" fill="#070C19" />
            <path d="M18 42H0V48H18V42Z" fill="#070C19" />
            <path d="M24 42H18V48H24V42Z" fill="#ADC2E7" />
            <path d="M30 42H24V72H30V42Z" fill="#748FBE" />
            <path d="M60 42H54V48H60V42Z" fill="#5A6B97" />
            <path d="M66 42H60V66H66V42Z" fill="#070C19" />
            <path d="M78 42H66V48H78V42Z" fill="#9C1704" />
            <path d="M84 42H78V96H84V42Z" fill="#070C19" />
            <path d="M12 48H0V96H12V48Z" fill="#070C19" />
            <path d="M18 48H12V66H18V48Z" fill="#ADC2E7" />
            <path d="M24 48H18V66H24V48Z" fill="#748FBE" />
            <path d="M54 48H48V54H54V48Z" fill="#5A6B97" />
            <path d="M60 48H54V60H60V48Z" fill="#070C19" />
            <path d="M78 48H66V96H78V48Z" fill="#070C19" />
            <path d="M48 54H42V60H48V54Z" fill="#5A6B97" />
            <path d="M54 54H48V60H54V54Z" fill="#070C19" />
            <path d="M48 60H42V78H48V60Z" fill="#748FBE" />
            <path d="M60 60H48V66H60V60Z" fill="#5A6B97" />
            <path d="M18 66H12V96H18V66Z" fill="#070C19" />
            <path d="M24 66H18V72H24V66Z" fill="#5A6B97" />
            <path d="M60 66H48V78H60V66Z" fill="#748FBE" />
            <path d="M66 66H60V78H66V66Z" fill="#5A6B97" />
            <path d="M24 72H18V96H24V72Z" fill="#070C19" />
            <path d="M30 72H24V78H30V72Z" fill="#5A6B97" />
            <path d="M30 78H24V96H30V78Z" fill="#070C19" />
            <path d="M60 78H30V84H60V78Z" fill="#5A6B97" />
            <path d="M66 78H60V96H66V78Z" fill="#070C19" />
            <path d="M60 84H30V96H60V84Z" fill="#070C19" />
          </svg>
        ),
        color: '#070C19',
        bgColor: '#0077AE',
        description: 'Movement speed is reduced by 1.',
      },
      Weaken: {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path
              d="M12 2v20M2 12h20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M6 6l12 12M18 6l-12 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        ),
        color: '#F97316',
        bgColor: '#7C2D12',
        description: 'Defense reduced by 30%. Takes more damage from attacks.',
      },
      Revealed: {
        icon: (
          <svg
            width="96"
            height="96"
            viewBox="0 0 96 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M96 0H0V12H96V0Z" fill="#070C19" />
            <path d="M30 12H0V18H30V12Z" fill="#070C19" />
            <path d="M36 12H30V24H36V12Z" fill="#0077AE" />
            <path d="M60 12H36V18H60V12Z" fill="#012B51" />
            <path d="M96 12H60V18H96V12Z" fill="#070C19" />
            <path d="M24 18H0V24H24V18Z" fill="#070C19" />
            <path d="M30 18H24V24H30V18Z" fill="#0077AE" />
            <path d="M60 18H36V24H60V18Z" fill="#003F7A" />
            <path d="M66 18H60V24H66V18Z" fill="#1594CE" />
            <path d="M96 18H66V24H96V18Z" fill="#070C19" />
            <path d="M18 24H0V30H18V24Z" fill="#070C19" />
            <path d="M24 24H18V30H24V24Z" fill="#0077AE" />
            <path d="M42 24H24V30H42V24Z" fill="#003F7A" />
            <path d="M48 24H42V30H48V24Z" fill="#50C4FA" />
            <path d="M66 24H48V30H66V24Z" fill="#003F7A" />
            <path d="M72 24H66V30H72V24Z" fill="#1594CE" />
            <path d="M96 24H72V30H96V24Z" fill="#070C19" />
            <path d="M12 30H0V96H12V30Z" fill="#070C19" />
            <path d="M18 30H12V66H18V30Z" fill="#012B51" />
            <path d="M24 30H18V36H24V30Z" fill="#1594CE" />
            <path d="M36 30H24V36H36V30Z" fill="#003F7A" />
            <path d="M42 30H36V36H42V30Z" fill="#7AD5FF" />
            <path d="M48 30H42V36H48V30Z" fill="#0077AE" />
            <path d="M54 30H48V36H54V30Z" fill="#1594CE" />
            <path d="M72 30H54V36H72V30Z" fill="#003F7A" />
            <path d="M78 30H72V66H78V30Z" fill="#012B51" />
            <path d="M96 30H78V96H96V30Z" fill="#070C19" />
            <path d="M24 36H18V60H24V36Z" fill="#0077AE" />
            <path d="M30 36H24V66H30V36Z" fill="#003F7A" />
            <path d="M36 36H30V42H36V36Z" fill="#7AD5FF" />
            <path d="M42 36H36V60H42V36Z" fill="#0077AE" />
            <path d="M48 36H42V60H48V36Z" fill="#003F7A" />
            <path d="M54 36H48V60H54V36Z" fill="#0077AE" />
            <path d="M60 36H54V48H60V36Z" fill="#1594CE" />
            <path d="M72 36H60V66H72V36Z" fill="#003F7A" />
            <path d="M36 42H30V48H36V42Z" fill="#50C4FA" />
            <path d="M36 48H30V60H36V48Z" fill="#1594CE" />
            <path d="M60 48H54V60H60V48Z" fill="#7AD5FF" />
            <path d="M24 60H18V66H24V60Z" fill="#1594CE" />
            <path d="M36 60H30V72H36V60Z" fill="#003F7A" />
            <path d="M42 60H36V66H42V60Z" fill="#7AD5FF" />
            <path d="M48 60H42V66H48V60Z" fill="#0077AE" />
            <path d="M54 60H48V66H54V60Z" fill="#7AD5FF" />
            <path d="M60 60H54V72H60V60Z" fill="#003F7A" />
            <path d="M18 66H12V96H18V66Z" fill="#070C19" />
            <path d="M24 66H18V72H24V66Z" fill="#012B51" />
            <path d="M30 66H24V72H30V66Z" fill="#0077AE" />
            <path d="M42 66H36V78H42V66Z" fill="#003F7A" />
            <path d="M48 66H42V72H48V66Z" fill="#1594CE" />
            <path d="M54 66H48V78H54V66Z" fill="#003F7A" />
            <path d="M66 66H60V72H66V66Z" fill="#1594CE" />
            <path d="M72 66H66V72H72V66Z" fill="#012B51" />
            <path d="M78 66H72V96H78V66Z" fill="#070C19" />
            <path d="M24 72H18V96H24V72Z" fill="#070C19" />
            <path d="M30 72H24V78H30V72Z" fill="#012B51" />
            <path d="M36 72H30V78H36V72Z" fill="#0077AE" />
            <path d="M48 72H42V78H48V72Z" fill="#003F7A" />
            <path d="M60 72H54V78H60V72Z" fill="#1594CE" />
            <path d="M66 72H60V78H66V72Z" fill="#012B51" />
            <path d="M72 72H66V96H72V72Z" fill="#070C19" />
            <path d="M30 78H24V96H30V78Z" fill="#070C19" />
            <path d="M60 78H30V84H60V78Z" fill="#012B51" />
            <path d="M66 78H60V96H66V78Z" fill="#070C19" />
            <path d="M60 84H30V96H60V84Z" fill="#070C19" />
          </svg>
        ),
        color: '#FBBF24',
        bgColor: '#78350F',
        description: 'Your true position is visible to the enemy.',
      },
      Vulnerable: {
        icon: (
          <svg
            width="96"
            height="96"
            viewBox="0 0 96 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M96 0H0V12H96V0Z" fill="#070C19" />
            <path d="M18 12H0V18H18V12Z" fill="#070C19" />
            <path d="M24 12H18V18H24V12Z" fill="#330482" />
            <path d="M30 12H24V18H30V12Z" fill="#9560EC" />
            <path d="M96 12H30V18H96V12Z" fill="#070C19" />
            <path d="M12 18H0V30H12V18Z" fill="#070C19" />
            <path d="M18 18H12V30H18V18Z" fill="#330482" />
            <path d="M24 18H18V30H24V18Z" fill="#9560EC" />
            <path d="M30 18H24V24H30V18Z" fill="#330482" />
            <path d="M36 18H30V30H36V18Z" fill="#9560EC" />
            <path d="M54 18H36V30H54V18Z" fill="#070C19" />
            <path d="M60 18H54V30H60V18Z" fill="#330482" />
            <path d="M66 18H60V30H66V18Z" fill="#9560EC" />
            <path d="M96 18H66V30H96V18Z" fill="#070C19" />
            <path d="M30 24H24V30H30V24Z" fill="#CAAAFF" />
            <path d="M6 30H0V96H6V30Z" fill="#070C19" />
            <path d="M12 30H6V66H12V30Z" fill="#330482" />
            <path d="M18 30H12V66H18V30Z" fill="#9560EC" />
            <path d="M30 30H18V66H30V30Z" fill="#070C19" />
            <path d="M36 30H30V66H36V30Z" fill="#CAAAFF" />
            <path d="M42 30H36V66H42V30Z" fill="#9560EC" />
            <path d="M48 30H42V96H48V30Z" fill="#070C19" />
            <path d="M54 30H48V66H54V30Z" fill="#330482" />
            <path d="M60 30H54V66H60V30Z" fill="#9560EC" />
            <path d="M66 30H60V66H66V30Z" fill="#CAAAFF" />
            <path d="M72 30H66V66H72V30Z" fill="#9560EC" />
            <path d="M96 30H72V36H96V30Z" fill="#070C19" />
            <path d="M78 36H72V96H78V36Z" fill="#070C19" />
            <path d="M84 36H78V60H84V36Z" fill="#9560EC" />
            <path d="M90 36H84V60H90V36Z" fill="#CAAAFF" />
            <path d="M96 36H90V96H96V36Z" fill="#070C19" />
            <path d="M90 60H78V96H90V60Z" fill="#070C19" />
            <path d="M12 66H6V96H12V66Z" fill="#070C19" />
            <path d="M18 66H12V78H18V66Z" fill="#330482" />
            <path d="M24 66H18V78H24V66Z" fill="#9560EC" />
            <path d="M30 66H24V72H30V66Z" fill="#CAAAFF" />
            <path d="M36 66H30V78H36V66Z" fill="#9560EC" />
            <path d="M42 66H36V96H42V66Z" fill="#070C19" />
            <path d="M54 66H48V96H54V66Z" fill="#070C19" />
            <path d="M60 66H54V78H60V66Z" fill="#330482" />
            <path d="M66 66H60V78H66V66Z" fill="#9560EC" />
            <path d="M72 66H66V96H72V66Z" fill="#070C19" />
            <path d="M30 72H24V78H30V72Z" fill="#330482" />
            <path d="M18 78H12V96H18V78Z" fill="#070C19" />
            <path d="M24 78H18V84H24V78Z" fill="#330482" />
            <path d="M30 78H24V84H30V78Z" fill="#9560EC" />
            <path d="M36 78H30V96H36V78Z" fill="#070C19" />
            <path d="M66 78H54V96H66V78Z" fill="#070C19" />
            <path d="M30 84H18V96H30V84Z" fill="#070C19" />
          </svg>
        ),
        color: '#F472B6',
        bgColor: '#831843',
        description:
          'Defense reduced by 50%. Receives significantly more damage.',
      },
      Immobilize: {
        icon: (
          <svg
            width="96"
            height="96"
            viewBox="0 0 96 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M96 0H0V6H96V0Z" fill="#070C19" />
            <path d="M48 6H0V18H48V6Z" fill="#070C19" />
            <path d="M54 6H48V12H54V6Z" fill="#F33712" />
            <path d="M60 6H54V12H60V6Z" fill="#9C1704" />
            <path d="M78 6H60V12H78V6Z" fill="#070C19" />
            <path d="M84 6H78V12H84V6Z" fill="#9C1704" />
            <path d="M90 6H84V12H90V6Z" fill="#F33712" />
            <path d="M96 6H90V96H96V6Z" fill="#070C19" />
            <path d="M54 12H48V24H54V12Z" fill="#070C19" />
            <path d="M60 12H54V18H60V12Z" fill="#F33712" />
            <path d="M66 12H60V18H66V12Z" fill="#9C1704" />
            <path d="M72 12H66V18H72V12Z" fill="#070C19" />
            <path d="M78 12H72V18H78V12Z" fill="#9C1704" />
            <path d="M84 12H78V18H84V12Z" fill="#F33712" />
            <path d="M90 12H84V36H90V12Z" fill="#070C19" />
            <path d="M42 18H0V24H42V18Z" fill="#070C19" />
            <path d="M48 18H42V24H48V18Z" fill="#ADC2E7" />
            <path d="M60 18H54V30H60V18Z" fill="#070C19" />
            <path d="M66 18H60V24H66V18Z" fill="#F33712" />
            <path d="M72 18H66V24H72V18Z" fill="#9C1704" />
            <path d="M78 18H72V24H78V18Z" fill="#F33712" />
            <path d="M84 18H78V30H84V18Z" fill="#070C19" />
            <path d="M36 24H0V30H36V24Z" fill="#070C19" />
            <path d="M42 24H36V30H42V24Z" fill="#ADC2E7" />
            <path d="M48 24H42V54H48V24Z" fill="#748FBE" />
            <path d="M54 24H48V30H54V24Z" fill="#ADC2E7" />
            <path d="M66 24H60V30H66V24Z" fill="#9C1704" />
            <path d="M72 24H66V30H72V24Z" fill="#F33712" />
            <path d="M78 24H72V30H78V24Z" fill="#9C1704" />
            <path d="M30 30H0V36H30V30Z" fill="#070C19" />
            <path d="M36 30H30V36H36V30Z" fill="#ADC2E7" />
            <path d="M42 30H36V78H42V30Z" fill="#748FBE" />
            <path d="M54 30H48V36H54V30Z" fill="#748FBE" />
            <path d="M60 30H54V36H60V30Z" fill="#9C1704" />
            <path d="M66 30H60V36H66V30Z" fill="#F33712" />
            <path d="M72 30H66V96H72V30Z" fill="#070C19" />
            <path d="M78 30H72V36H78V30Z" fill="#F33712" />
            <path d="M84 30H78V36H84V30Z" fill="#9C1704" />
            <path d="M24 36H0V42H24V36Z" fill="#070C19" />
            <path d="M30 36H24V42H30V36Z" fill="#ADC2E7" />
            <path d="M36 36H30V78H36V36Z" fill="#748FBE" />
            <path d="M54 36H48V42H54V36Z" fill="#9C1704" />
            <path d="M60 36H54V42H60V36Z" fill="#F33712" />
            <path d="M66 36H60V42H66V36Z" fill="#ADC2E7" />
            <path d="M78 36H72V96H78V36Z" fill="#070C19" />
            <path d="M84 36H78V42H84V36Z" fill="#F33712" />
            <path d="M90 36H84V42H90V36Z" fill="#9C1704" />
            <path d="M18 42H0V48H18V42Z" fill="#070C19" />
            <path d="M24 42H18V48H24V42Z" fill="#ADC2E7" />
            <path d="M30 42H24V72H30V42Z" fill="#748FBE" />
            <path d="M54 42H48V48H54V42Z" fill="#748FBE" />
            <path d="M60 42H54V48H60V42Z" fill="#5A6B97" />
            <path d="M66 42H60V66H66V42Z" fill="#070C19" />
            <path d="M90 42H78V96H90V42Z" fill="#070C19" />
            <path d="M12 48H0V96H12V48Z" fill="#070C19" />
            <path d="M18 48H12V66H18V48Z" fill="#ADC2E7" />
            <path d="M24 48H18V66H24V48Z" fill="#748FBE" />
            <path d="M54 48H48V54H54V48Z" fill="#5A6B97" />
            <path d="M60 48H54V60H60V48Z" fill="#070C19" />
            <path d="M48 54H42V60H48V54Z" fill="#5A6B97" />
            <path d="M54 54H48V60H54V54Z" fill="#070C19" />
            <path d="M48 60H42V78H48V60Z" fill="#748FBE" />
            <path d="M60 60H48V66H60V60Z" fill="#5A6B97" />
            <path d="M18 66H12V96H18V66Z" fill="#070C19" />
            <path d="M24 66H18V72H24V66Z" fill="#5A6B97" />
            <path d="M60 66H48V78H60V66Z" fill="#748FBE" />
            <path d="M66 66H60V78H66V66Z" fill="#5A6B97" />
            <path d="M24 72H18V96H24V72Z" fill="#070C19" />
            <path d="M30 72H24V78H30V72Z" fill="#5A6B97" />
            <path d="M30 78H24V96H30V78Z" fill="#070C19" />
            <path d="M60 78H30V84H60V78Z" fill="#5A6B97" />
            <path d="M66 78H60V96H66V78Z" fill="#070C19" />
            <path d="M60 84H30V96H60V84Z" fill="#070C19" />
          </svg>
        ),
        color: '#94A3B8',
        bgColor: '#334155',
        description: 'Cannot move. Speed reduced to 0.',
      },
      Cloud: {
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
          </svg>
        ),
        color: '#D1D5DB',
        bgColor: '#374151',
        description: 'A smoke cloud hides anyone within 2 tiles of its center.',
      },
    };

    // Get style or use default
    return (
      effectStyles[name] || {
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <circle cx="12" cy="12" r="8" />
          </svg>
        ),
        color: '#9CA3AF',
        bgColor: '#374151',
        description: 'Unknown effect.',
      }
    );
  };

  const style = getEffectStyle(effectName);

  return (
    <div
      className="relative flex h-6 w-6 cursor-help items-center justify-center rounded border-2"
      style={{
        backgroundColor: style.bgColor,
        borderColor: style.color,
        color: style.color,
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {style.icon}
      {duration >= 0 && (
        <span
          className="absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full text-[8px] font-bold"
          style={{ backgroundColor: style.color, color: style.bgColor }}
        >
          {duration}
        </span>
      )}
      {/* Tooltip */}
      {showTooltip && (
        <div
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 min-w-48 max-w-64 -translate-x-1/2 rounded-lg px-3 py-2 shadow-lg"
          style={{
            backgroundColor: style.bgColor,
            border: `2px solid ${style.color}`,
          }}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-sm font-bold"
                style={{ color: style.color }}
              >
                {effectName}
              </span>
              {duration > 0 && (
                <span
                  className="rounded px-1.5 py-0.5 text-xs"
                  style={{ backgroundColor: style.color, color: style.bgColor }}
                >
                  {duration} {duration === 1 ? 'turn' : 'turns'}
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed text-gray-300">
              {style.description}
            </p>
          </div>
          {/* Tooltip arrow */}
          <div
            className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `6px solid ${style.color}`,
            }}
          />
        </div>
      )}
    </div>
  );
}
