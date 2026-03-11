import { colorSchemes, type ButtonColorScheme } from '../utils';

export const BtnXlBg = ({
  className,
  color = 'gray',
}: {
  className?: string;
  color?: ButtonColorScheme;
}) => {
  const scheme = colorSchemes[color];

  return (
    <svg
      width="425"
      height="64"
      viewBox="0 0 425 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
    >
      <path d="M415 0H10V5H415V0Z" fill="#070C19" />
      <path d="M10 5H5V10H10V5Z" fill="#070C19" />
      <path d="M15 5H10V10H15V5Z" fill={scheme.light} />
      <path d="M30 5H15V10H30V5Z" fill="white" />
      <path d="M405 5H30V10H405V5Z" fill={scheme.light} />
      <path d="M410 5H405V10H410V5Z" fill="white" />
      <path d="M415 5H410V10H415V5Z" fill={scheme.light} />
      <path d="M420 5H415V10H420V5Z" fill="#070C19" />
      <path d="M5 10H0V54H5V10Z" fill="#070C19" />
      <path d="M10 10H5V54H10V10Z" fill={scheme.dark} />
      <path d="M15 10H10V15H15V10Z" fill="white" />
      <path d="M415 10H15V54H415V10Z" fill={scheme.main} />
      <path d="M420 10H415V54H420V10Z" fill={scheme.dark} />
      <path d="M425 10H420V54H425V10Z" fill="#070C19" />
      <path d="M15 15H10V25H15V15Z" fill={scheme.light} />
      <path d="M15 25H10V54H15V25Z" fill={scheme.main} />
      <path d="M10 54H5V59H10V54Z" fill="#070C19" />
      <path d="M415 54H10V59H415V54Z" fill={scheme.dark} />
      <path d="M420 54H415V59H420V54Z" fill="#070C19" />
      <path d="M415 59H10V64H415V59Z" fill="#070C19" />
    </svg>
  );
};
