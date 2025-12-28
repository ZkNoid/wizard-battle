export const CraftBg = ({ className }: { className: string }) => {
  return (
    <svg
      width="577"
      height="577"
      viewBox="0 0 577 577"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect y="10" width="5" height="557" fill="#070C19" />
      <rect x="10" y="10" width="557" height="557" fill="#D5D8DD" />
      <rect x="572" y="10" width="5" height="557" fill="#070C19" />
      <rect x="5" y="5" width="5" height="5" fill="#070C19" />
      <rect
        width="5"
        height="5"
        transform="matrix(1 0 0 -1 5 572)"
        fill="#070C19"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 572 5)"
        fill="#070C19"
      />
      <rect
        x="572"
        y="572"
        width="5"
        height="5"
        transform="rotate(180 572 572)"
        fill="#070C19"
      />
      <rect x="10" width="557" height="5" fill="#070C19" />
      <rect x="10" y="572" width="557" height="5" fill="#070C19" />
      <rect
        x="567"
        y="562"
        width="5"
        height="5"
        transform="rotate(90 567 562)"
        fill="#ACB0BC"
      />
      <rect
        x="15"
        y="562"
        width="5"
        height="5"
        transform="rotate(90 15 562)"
        fill="#ACB0BC"
      />
      <path d="M567 567H10V572H567V567Z" fill="#ACB0BC" />
      <path d="M567 5H10V10H567V5Z" fill="white" />
      <path d="M572 567L572 10L567 10L567 567L572 567Z" fill="#D5D8DD" />
      <path d="M9.99997 567L10 10L5.00003 10L5 567L9.99997 567Z" fill="white" />
    </svg>
  );
};
