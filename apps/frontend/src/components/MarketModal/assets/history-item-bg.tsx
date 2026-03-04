export const HistoryItemBg = ({ className }: { className: string }) => {
  return (
    <svg
      width="1018"
      height="59"
      viewBox="0 0 1018 59"
      fill="none"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="5" y="10" width="1003" height="39" fill="#D5D8DD" />
      <rect y="10" width="5" height="39" fill="#070C19" />
      <rect
        x="1008"
        width="5"
        height="998"
        transform="rotate(90 1008 0)"
        fill="#070C19"
      />
      <rect
        x="1008"
        y="54"
        width="5"
        height="998"
        transform="rotate(90 1008 54)"
        fill="#070C19"
      />
      <rect x="1013" y="10" width="5" height="39" fill="#070C19" />
      <rect x="5" y="5" width="5" height="5" fill="#070C19" />
      <rect x="5" y="49" width="5" height="5" fill="#070C19" />
      <rect x="1008" y="5" width="5" height="5" fill="#070C19" />
      <rect x="1008" y="49" width="5" height="5" fill="#070C19" />
      <path d="M1008 5H10V10H1008V5Z" fill="white" />
      <path d="M1013 49L1013 10L1008 10L1008 49L1013 49Z" fill="#ACB0BC" />
      <path d="M10 54L1008 54L1008 49L10 49L10 54Z" fill="#ACB0BC" />
      <path d="M5 10L5 49L10 49L10 10L5 10Z" fill="white" />
    </svg>
  );
};
