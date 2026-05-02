import { colorSchemes, type ButtonColorScheme } from '../utils';

export const BtnXsBg = ({
  className,
  color = 'gray',
}: {
  className?: string;
  color?: ButtonColorScheme;
}) => {
  const scheme = colorSchemes[color];

  return (
    <svg
      width="114"
      height="49"
      viewBox="0 0 114 49"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
    >
      <path d="M104 0H10V5H104V0Z" fill="#070C19" />
      <path d="M10 5H5V10H10V5Z" fill="#070C19" />
      <path d="M15 5H10V10H15V5Z" fill={scheme.light} />
      <path d="M30 5H15V10H30V5Z" fill="white" />
      <path d="M104 5H30V10H104V5Z" fill={scheme.light} />
      <path d="M99 5H94V10H99V5Z" fill="white" />
      <path d="M104 5H99V10H104V5Z" fill={scheme.light} />
      <path d="M109 5H104V10H109V5Z" fill="#070C19" />
      <path d="M5 10H0V39H5V10Z" fill="#070C19" />
      <path d="M10 10H5V39H10V10Z" fill={scheme.dark} />
      <path d="M15 10H10V15H15V10Z" fill="white" />
      <path d="M104 10H15V39H104V10Z" fill={scheme.main} />
      <path d="M109 10H104V39H109V10Z" fill={scheme.dark} />
      <path d="M114 10H109V39H114V10Z" fill="#070C19" />
      <path d="M15 15H10V25H15V15Z" fill={scheme.light} />
      <path d="M15 25H10V39H15V25Z" fill={scheme.main} />
      <path d="M10 39H5V44H10V39Z" fill="#070C19" />
      <path d="M104 39H10V44H104V39Z" fill={scheme.dark} />
      <path d="M109 39H104V44H109V39Z" fill="#070C19" />
      <path d="M104 44H10V49H104V44Z" fill="#070C19" />
    </svg>
  );
};
