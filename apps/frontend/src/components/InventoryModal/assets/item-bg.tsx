export const ItemBg = ({ className }: { className: string }) => {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="5" y="5" width="90" height="90" fill="#D5D8DD" />
      <rect y="10" width="5" height="80" fill="#747C8F" />
      <rect
        x="90"
        width="5"
        height="80"
        transform="rotate(90 90 0)"
        fill="#747C8F"
      />
      <rect
        x="90"
        y="95"
        width="5"
        height="80"
        transform="rotate(90 90 95)"
        fill="#747C8F"
      />
      <rect x="95" y="10" width="5" height="80" fill="#747C8F" />
      <rect x="5" y="5" width="5" height="5" fill="#747C8F" />
      <rect x="5" y="90" width="5" height="5" fill="#747C8F" />
      <rect x="90" y="5" width="5" height="5" fill="#747C8F" />
      <rect x="90" y="90" width="5" height="5" fill="#747C8F" />
      <path d="M90 5H10V10H90V5Z" fill="#ACB0BC" />
      <path d="M95 90L95 10L90 10L90 90L95 90Z" fill="#ACB0BC" />
      <path d="M10 95L90 95L90 90L10 90L10 95Z" fill="#ACB0BC" />
      <path d="M5 10L5 90L10 90L10 10L5 10Z" fill="#ACB0BC" />
    </svg>
  );
};
