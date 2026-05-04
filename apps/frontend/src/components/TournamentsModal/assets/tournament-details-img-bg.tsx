export const TournamentDetailsImgBg = ({
  className,
}: {
  className: string;
}) => {
  return (
    <svg
      width="375"
      height="150"
      viewBox="0 0 375 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
    >
      <rect x="5" y="10" width="361" height="130" fill="#D5D8DD" />
      <rect y="10" width="5" height="130" fill="#070C19" />
      <rect
        x="365"
        width="5"
        height="355"
        transform="rotate(90 365 0)"
        fill="#070C19"
      />
      <rect
        x="365"
        y="145"
        width="5"
        height="355"
        transform="rotate(90 365 145)"
        fill="#070C19"
      />
      <rect x="370" y="10" width="5" height="130" fill="#070C19" />
      <rect x="5" y="5" width="5" height="5" fill="#070C19" />
      <rect x="5" y="140" width="5" height="5" fill="#070C19" />
      <rect x="365" y="5" width="5" height="5" fill="#070C19" />
      <rect x="365" y="140" width="5" height="5" fill="#070C19" />
      <path d="M365 5H10V10H365V5Z" fill="white" />
      <path d="M370 140L370 10L365 10L365 140L370 140Z" fill="#ACB0BC" />
      <path d="M10 145L365 145L365 140L10 140L10 145Z" fill="#ACB0BC" />
      <path d="M5 10L5 140L10 140L10 10L5 10Z" fill="white" />
    </svg>
  );
};
