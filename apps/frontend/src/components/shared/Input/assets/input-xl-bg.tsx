export const InputXlBg = ({ className }: { className: string }) => {
  return (
    <svg
      width="574"
      height="50"
      viewBox="0 0 574 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      className={className}
    >
      <rect y="10" width="5" height="30" fill="#070C19" />
      <rect
        x="574"
        y="40"
        width="5"
        height="30"
        transform="rotate(-180 574 40)"
        fill="#070C19"
      />
      <rect x="5" y="5" width="5" height="5" fill="#070C19" />
      <rect
        x="569"
        y="45"
        width="5"
        height="5"
        transform="rotate(-180 569 45)"
        fill="#070C19"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(1 0 0 -1 5 45)"
        fill="#070C19"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 -8.74228e-08 -8.74228e-08 1 569 5)"
        fill="#070C19"
      />
      <rect x="10" width="554" height="5" fill="#070C19" />
      <rect
        width="554"
        height="5"
        transform="matrix(1 0 0 -1 10 50)"
        fill="#070C19"
      />
      <path d="M564 5H10V45H564V5Z" fill="#D5D8DD" />
      <path d="M564 5H10V10H564V5Z" fill="white" />
      <path d="M564 45H10V40H564V45Z" fill="white" />
      <path d="M10 40L10 10L5 10L5 40L10 40Z" fill="white" />
      <path d="M564 10L564 40L569 40L569 10L564 10Z" fill="white" />
    </svg>
  );
};
