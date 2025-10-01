export const AudioIcon = ({
  className,
  isActive,
}: {
  className?: string;
  isActive: boolean;
}) => {
  if (isActive) {
    return (
      <svg
        width="30"
        height="24"
        viewBox="0 0 30 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path d="M9 0H15V3H9V0Z" fill="#070C19" />
        <path d="M24 3H27V6H24V3Z" fill="#070C19" />
        <path d="M9 3H15V21H9V3Z" fill="#1F3467" />
        <path d="M6 3H9V6H6V3Z" fill="#070C19" />
        <path d="M27 6H30V9H27V6Z" fill="#070C19" />
        <path d="M18 6H21V9H18V6Z" fill="#070C19" />
        <path d="M6 6H9V18H6V6Z" fill="#1F3467" />
        <path d="M0 6H6V9H0V6Z" fill="#070C19" />
        <path d="M27 9H30V18H27V9Z" fill="#1F3467" />
        <path d="M21 9H24V12H21V9Z" fill="#070C19" />
        <path d="M0 9H6V15H0V9Z" fill="#1F3467" />
        <path d="M21 12H24V15H21V12Z" fill="#1F3467" />
        <path d="M18 15H21V18H18V15Z" fill="#1F3467" />
        <path d="M0 15H6V18H0V15Z" fill="white" />
        <path d="M24 18H27V21H24V18Z" fill="#1F3467" />
        <path d="M6 18H9V21H6V18Z" fill="white" />
        <path d="M9 21H15V24H9V21Z" fill="white" />
      </svg>
    );
  } else {
    return (
      <svg
        width="30"
        height="24"
        viewBox="0 0 30 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path d="M9 0H15V3H9V0Z" fill="#070C19" />
        <path d="M9 3H15V21H9V3Z" fill="#1F3467" />
        <path d="M6 3H9V6H6V3Z" fill="#070C19" />
        <path d="M27 6H30V9H27V6Z" fill="#070C19" />
        <path d="M18 6H21V9H18V6Z" fill="#070C19" />
        <path d="M6 6H9V18H6V6Z" fill="#1F3467" />
        <path d="M0 6H6V9H0V6Z" fill="#070C19" />
        <path d="M21 9H27V15H21V9Z" fill="#1F3467" />
        <path d="M0 9H6V15H0V9Z" fill="#1F3467" />
        <path d="M27 15H30V18H27V15Z" fill="#1F3467" />
        <path d="M18 15H21V18H18V15Z" fill="#1F3467" />
        <path d="M0 15H6V18H0V15Z" fill="white" />
        <path d="M6 18H9V21H6V18Z" fill="white" />
        <path d="M9 21H15V24H9V21Z" fill="white" />
      </svg>
    );
  }
};
