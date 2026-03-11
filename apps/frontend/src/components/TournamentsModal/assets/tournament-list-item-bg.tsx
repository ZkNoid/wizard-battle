export const TournamentListItemBg = ({ className }: { className: string }) => {
  return (
    <svg
      width="1017"
      height="160"
      viewBox="0 0 1017 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
    >
      <rect x="5" y="5" width="1001" height="150" fill="#D5D8DD" />
      <rect y="10" width="5" height="140" fill="#070C19" />
      <rect
        x="1007"
        width="5"
        height="997"
        transform="rotate(90 1007 0)"
        fill="#070C19"
      />
      <rect
        x="1007"
        y="155"
        width="5"
        height="997"
        transform="rotate(90 1007 155)"
        fill="#070C19"
      />
      <rect x="1012" y="10" width="5" height="140" fill="#070C19" />
      <rect x="5" y="5" width="5" height="5" fill="#070C19" />
      <rect x="5" y="150" width="5" height="5" fill="#070C19" />
      <rect x="1007" y="5" width="5" height="5" fill="#070C19" />
      <rect x="1007" y="150" width="5" height="5" fill="#070C19" />
      <path d="M1007 5H10V10H1007V5Z" fill="white" />
      <path d="M1012 150L1012 10L1007 10L1007 150L1012 150Z" fill="#ACB0BC" />
      <path d="M10 155L1007 155L1007 150L10 150L10 155Z" fill="#ACB0BC" />
      <path d="M5 10L5 150L10 150L10 10L5 10Z" fill="white" />
    </svg>
  );
};
