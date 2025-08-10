export const TileBorder = ({ className }: { className: string }) => {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="5" width="70" height="5" fill="#070C19" />
      <rect x="5" y="5" width="70" height="70" fill="#D5D8DD" />
      <rect x="5" y="75" width="70" height="5" fill="#070C19" />
      <rect
        x="80"
        y="5"
        width="70"
        height="5"
        transform="rotate(90 80 5)"
        fill="#070C19"
      />
      <rect
        x="5"
        y="5"
        width="70"
        height="5"
        transform="rotate(90 5 5)"
        fill="#070C19"
      />
    </svg>
  );
};
