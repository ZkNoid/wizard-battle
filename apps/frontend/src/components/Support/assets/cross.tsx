export const Cross = ({ className }: { className: string }) => {
  return (
    <svg
      width="35"
      height="35"
      viewBox="0 0 35 35"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="5" height="5" fill="#070C19" />
      <rect
        x="35"
        y="35"
        width="5"
        height="5"
        transform="rotate(180 35 35)"
        fill="#070C19"
      />
      <rect x="5" y="5" width="5" height="5" fill="#070C19" />
      <rect
        x="30"
        y="30"
        width="5"
        height="5"
        transform="rotate(180 30 30)"
        fill="#070C19"
      />
      <rect x="10" y="10" width="5" height="5" fill="#070C19" />
      <rect
        x="25"
        y="25"
        width="5"
        height="5"
        transform="rotate(180 25 25)"
        fill="#070C19"
      />
      <rect x="15" y="15" width="5" height="5" fill="#070C19" />
      <rect x="20" y="10" width="5" height="5" fill="#070C19" />
      <rect
        x="15"
        y="25"
        width="5"
        height="5"
        transform="rotate(180 15 25)"
        fill="#070C19"
      />
      <rect x="25" y="5" width="5" height="5" fill="#070C19" />
      <rect
        x="10"
        y="30"
        width="5"
        height="5"
        transform="rotate(180 10 30)"
        fill="#070C19"
      />
      <rect x="30" width="5" height="5" fill="#070C19" />
      <rect
        x="5"
        y="35"
        width="5"
        height="5"
        transform="rotate(180 5 35)"
        fill="#070C19"
      />
    </svg>
  );
};
