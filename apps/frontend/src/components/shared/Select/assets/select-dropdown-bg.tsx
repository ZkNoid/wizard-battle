export const SelectDropdownBg = ({ className }: { className: string }) => {
  return (
    <svg
      width="277"
      height="166"
      viewBox="0 0 277 166"
      fill="none"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect y="10" width="5" height="146" fill="#070C19" />
      <rect
        x="277"
        y="156"
        width="5"
        height="146"
        transform="rotate(-180 277 156)"
        fill="#070C19"
      />
      <rect x="5" y="5" width="5" height="5" fill="#070C19" />
      <rect
        x="272"
        y="161"
        width="5"
        height="5"
        transform="rotate(-180 272 161)"
        fill="#070C19"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(1 0 0 -1 5 161)"
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
        transform="matrix(1 0 0 -1 10 166)"
        fill="#070C19"
      />
      <path d="M267 5H10V161H267V5Z" fill="#D5D8DD" />
      <path d="M267 5H10V10H267V5Z" fill="white" />
      <path d="M267 161H10V156H267V161Z" fill="white" />
      <path d="M9.99999 156L10 10L5 10L5 156L9.99999 156Z" fill="white" />
      <path d="M267 10L267 156L272 156L272 10L267 10Z" fill="white" />
    </svg>
  );
};
