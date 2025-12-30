interface ColorScheme {
  light: string;
  medium: string;
  dark: string;
  main: string;
}

const colorSchemes: Record<'gray' | 'blue' | 'lightGray', ColorScheme> = {
  gray: {
    light: '#D5D8DD',
    medium: '#ACB0BC',
    dark: '#747C8F',
    main: '#ACB0BC',
  },
  blue: {
    light: '#A2B5E3',
    medium: '#557FE8',
    dark: '#1F3467',
    main: '#557FE8',
  },
  lightGray: {
    light: '#D5D8DD',
    medium: '#D5D8DD',
    dark: '#747C8F',
    main: '#D5D8DD',
  },
};

export const ButtonBackground = ({
  className,
  color = 'gray',
}: {
  className?: string;
  color?: 'gray' | 'blue' | 'lightGray';
}) => {
  const scheme = colorSchemes[color];

  return (
    <svg
      width="210"
      height="64"
      viewBox="0 0 210 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M200 0H10V5H200V0Z" fill="#070C19" />
      <path d="M10 5H5V10H10V5Z" fill="#070C19" />
      <path d="M15 5H10V10H15V5Z" fill={scheme.light} />
      <path d="M30 5H15V10H30V5Z" fill="white" />
      <path d="M190 5H30V10H190V5Z" fill={scheme.light} />
      <path d="M195 5H190V10H195V5Z" fill="white" />
      <path d="M200 5H195V10H200V5Z" fill={scheme.light} />
      <path d="M205 5H200V10H205V5Z" fill="#070C19" />
      <path d="M5 10H0V54H5V10Z" fill="#070C19" />
      <path d="M10 10H5V54H10V10Z" fill={scheme.dark} />
      <path d="M15 10H10V15H15V10Z" fill="white" />
      <path d="M200 10H15V54H200V10Z" fill={scheme.main} />
      <path d="M205 10H200V54H205V10Z" fill={scheme.dark} />
      <path d="M210 10H205V54H210V10Z" fill="#070C19" />
      <path d="M15 15H10V25H15V15Z" fill={scheme.light} />
      <path d="M15 25H10V54H15V25Z" fill={scheme.main} />
      <path d="M10 54H5V59H10V54Z" fill="#070C19" />
      <path d="M200 54H10V59H200V54Z" fill={scheme.dark} />
      <path d="M205 54H200V59H205V54Z" fill="#070C19" />
      <path d="M200 59H10V64H200V59Z" fill="#070C19" />
    </svg>
  );
};
