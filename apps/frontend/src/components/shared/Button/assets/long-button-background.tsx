import { colorSchemes } from './button-background';

export const LongButtonBackground = ({
  className,
  color = 'gray',
}: {
  className?: string;
  color?: 'gray' | 'blue' | 'lightGray' | 'green' | 'red';
}) => {
  const scheme = colorSchemes[color];

  return (
    <svg
      viewBox="0 0 574 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      className={className}
    >
      <path d="M564 0H10V5H564V0Z" fill="#070C19" />
      <path d="M10 5H5V10H10V5Z" fill="#070C19" />
      <path d="M15 5H10V10H15V5Z" fill={scheme.light} />
      <path d="M30 5H15V10H30V5Z" fill="white" />
      <path d="M554 5H30V10H554V5Z" fill={scheme.light} />
      <path d="M559 5H554V10H559V5Z" fill="white" />
      <path d="M564 5H559V10H564V5Z" fill={scheme.light} />
      <path d="M569 5H564V10H569V5Z" fill="#070C19" />
      <path d="M5 10H0V54H5V10Z" fill="#070C19" />
      <path d="M10 10H5V54H10V10Z" fill={scheme.dark} />
      <path d="M15 10H10V15H15V10Z" fill="white" />
      <path d="M564 10H15V54H564V10Z" fill={scheme.main} />
      <path d="M569 10H564V54H569V10Z" fill={scheme.dark} />
      <path d="M574 10H569V54H574V10Z" fill="#070C19" />
      <path d="M15 15H10V25H15V15Z" fill={scheme.light} />
      <path d="M15 25H10V54H15V25Z" fill={scheme.main} />
      <path d="M10 54H5V59H10V54Z" fill="#070C19" />
      <path d="M564 54H10V59H564V54Z" fill={scheme.dark} />
      <path d="M569 54H564V59H569V54Z" fill="#070C19" />
      <path d="M564 59H10V64H564V59Z" fill="#070C19" />
    </svg>
  );
};
