export const BoxBg = ({
  className,
  color,
}: {
  className: string;
  color: 'blue' | 'gray';
}) => {
  const colors = {
    blue: {
      accent: '#A2B5E3',
      main: '#557FE8',
      dark: '#1F3467',
      border: '#070C19',
      white: 'white',
    },
    gray: {
      accent: '#D5D8DD',
      main: '#ACB0BC',
      dark: '#747C8F',
      border: '#070C19',
      white: 'white',
    },
  };

  const currentColors = colors[color];

  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M54 0H10V5H54V0Z" fill={currentColors.border} />
      <path d="M10 5H5V10H10V5Z" fill={currentColors.border} />
      <path d="M15 5H10V10H15V5Z" fill={currentColors.accent} />
      <path d="M30 5H15V10H30V5Z" fill={currentColors.white} />
      <path d="M44 5H30V10H44V5Z" fill={currentColors.accent} />
      <path d="M49 5H44V10H49V5Z" fill={currentColors.white} />
      <path d="M54 5H49V10H54V5Z" fill={currentColors.accent} />
      <path d="M59 5H54V10H59V5Z" fill={currentColors.border} />
      <path d="M5 10H0V54H5V10Z" fill={currentColors.border} />
      <path d="M10 10H5V54H10V10Z" fill={currentColors.dark} />
      <path d="M15 10H10V15H15V10Z" fill={currentColors.white} />
      <path d="M54 10H15V54H54V10Z" fill={currentColors.main} />
      <path d="M59 10H54V54H59V10Z" fill={currentColors.dark} />
      <path d="M64 10H59V54H64V10Z" fill={currentColors.border} />
      <path d="M15 15H10V25H15V15Z" fill={currentColors.accent} />
      <path d="M15 25H10V54H15V25Z" fill={currentColors.main} />
      <path d="M10 54H5V59H10V54Z" fill={currentColors.border} />
      <path d="M54 54H10V59H54V54Z" fill={currentColors.dark} />
      <path d="M59 54H54V59H59V54Z" fill={currentColors.border} />
      <path d="M54 59H10V64H54V59Z" fill={currentColors.border} />
    </svg>
  );
};
