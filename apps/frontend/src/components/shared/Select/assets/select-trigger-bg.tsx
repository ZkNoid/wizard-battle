export const SelectTriggerBg = ({ className }: { className: string }) => {
  return (
    <svg
      width="277"
      height="50"
      viewBox="0 0 277 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
    >
      <rect y="10" width="5" height="30" fill="#070C19" />
      <rect
        x="277"
        y="40"
        width="5"
        height="30"
        transform="rotate(-180 277 40)"
        fill="#070C19"
      />
      <rect x="5" y="5" width="5" height="5" fill="#070C19" />
      <rect
        x="272"
        y="45"
        width="5"
        height="5"
        transform="rotate(-180 272 45)"
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
        transform="matrix(-1 -8.74228e-08 -8.74228e-08 1 272 5)"
        fill="#070C19"
      />
      <rect x="10" width="257" height="5" fill="#070C19" />
      <rect
        width="257"
        height="5"
        transform="matrix(1 0 0 -1 10 50)"
        fill="#070C19"
      />
      <path d="M267 5H10V45H267V5Z" fill="#D5D8DD" />
      <path d="M267 5H10V10H267V5Z" fill="white" />
      <path d="M267 45H10V40H267V45Z" fill="white" />
      <path d="M10 40L10 10L5 10L5 40L10 40Z" fill="white" />
      <path d="M267 10L267 40L272 40L272 10L267 10Z" fill="white" />
    </svg>
  );
};
