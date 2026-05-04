export const TournamentDetailsTimerBg = ({
  className,
}: {
  className: string;
}) => {
  return (
    <svg
      width="131"
      height="64"
      viewBox="0 0 131 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
    >
      <rect x="5" y="10" width="116" height="44" fill="#D5D8DD" />
      <rect y="10" width="5" height="44" fill="#070C19" />
      <rect
        x="121"
        width="5"
        height="111"
        transform="rotate(90 121 0)"
        fill="#070C19"
      />
      <rect
        x="121"
        y="59"
        width="5"
        height="111"
        transform="rotate(90 121 59)"
        fill="#070C19"
      />
      <rect x="126" y="10" width="5" height="44" fill="#070C19" />
      <rect x="5" y="5" width="5" height="5" fill="#070C19" />
      <rect x="5" y="54" width="5" height="5" fill="#070C19" />
      <rect x="121" y="5" width="5" height="5" fill="#070C19" />
      <rect x="121" y="54" width="5" height="5" fill="#070C19" />
      <path d="M121 5H10V10H121V5Z" fill="white" />
      <path d="M126 54L126 10L121 10L121 54L126 54Z" fill="#ACB0BC" />
      <path d="M10 59L121 59L121 54L10 54L10 59Z" fill="#ACB0BC" />
      <path d="M5 10L5 54L10 54L10 10L5 10Z" fill="white" />
    </svg>
  );
};
