export const BuyItemBg = ({ className }: { className: string }) => {
  return (
    <svg
      width="276"
      height="160"
      viewBox="0 0 276 160"
      fill="none"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="5" y="5" width="266" height="150" fill="#D5D8DD" />
      <rect y="10" width="5" height="140" fill="#070C19" />
      <rect
        x="266"
        width="5"
        height="256"
        transform="rotate(90 266 0)"
        fill="#070C19"
      />
      <rect
        x="266"
        y="155"
        width="5"
        height="256"
        transform="rotate(90 266 155)"
        fill="#070C19"
      />
      <rect x="271" y="10" width="5" height="140" fill="#070C19" />
      <rect x="5" y="5" width="5" height="5" fill="#070C19" />
      <rect x="5" y="150" width="5" height="5" fill="#070C19" />
      <rect x="266" y="5" width="5" height="5" fill="#070C19" />
      <rect x="266" y="150" width="5" height="5" fill="#070C19" />
      <path d="M266 5H10V10H266V5Z" fill="white" />
      <path d="M271 150L271 10L266 10L266 150L271 150Z" fill="#ACB0BC" />
      <path d="M10 155L266 155L266 150L10 150L10 155Z" fill="#ACB0BC" />
      <path d="M5 10L5 150L10 150L10 10L5 10Z" fill="white" />
    </svg>
  );
};
