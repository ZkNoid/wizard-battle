export const AnimatedHeroBg = ({ className }: { className: string }) => {
  return (
    <svg
      width="276"
      height="340"
      viewBox="0 0 276 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
    >
      <rect y="10" width="5" height="320" fill="#070C19" />
      <rect
        x="266"
        width="5"
        height="256"
        transform="rotate(90 266 0)"
        fill="#070C19"
      />
      <rect
        x="266"
        y="335"
        width="5"
        height="256"
        transform="rotate(90 266 335)"
        fill="#070C19"
      />
      <rect x="271" y="10" width="5" height="320" fill="#070C19" />
      <rect x="5" y="5" width="5" height="5" fill="#070C19" />
      <rect x="5" y="330" width="5" height="5" fill="#070C19" />
      <rect x="266" y="5" width="5" height="5" fill="#070C19" />
      <rect x="266" y="330" width="5" height="5" fill="#070C19" />
      <path d="M266 5H10V10H266V5Z" fill="#D5D8DD" />
      <path d="M266 10H10V330H266V10Z" fill="#D5D8DD" />
      <path d="M271 330L271 10L266 10L266 330L271 330Z" fill="#ACB0BC" />
      <path d="M10 335L266 335L266 330L10 330L10 335Z" fill="#ACB0BC" />
      <path d="M5 10L5 330L10 330L10 10L5 10Z" fill="#D5D8DD" />
    </svg>
  );
};
