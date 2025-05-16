export const BoxBg = ({ className }: { className: string }) => {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="10"
        y="10"
        width="60"
        height="60"
        fill="#557FE8"
        className="group-hover/button:fill-[#86A6F6]"
      />
      <rect x="5" y="5" width="5" height="5" fill="#070C19" />
      <rect x="10" y="15" width="5" height="5" fill="#FBFAFA" />
      <rect x="10" y="20" width="5" height="5" fill="#A2B5E3" />
      <rect x="10" y="25" width="5" height="5" fill="#A2B5E3" />
      <rect x="10" width="60" height="5" fill="#070C19" />
      <rect x="10" y="5" width="60" height="5" fill="#1F3467" />
      <rect x="10" y="10" width="60" height="5" fill="#A2B5E3" />
      <rect x="10" y="70" width="60" height="5" fill="#1F3467" />
      <rect x="10" y="75" width="55" height="5" fill="#070C19" />
      <rect
        x="70"
        y="80"
        width="5"
        height="5"
        transform="rotate(180 70 80)"
        fill="#070C19"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 75 5)"
        fill="#070C19"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(1 0 0 -1 5 75)"
        fill="#070C19"
      />
      <rect y="10" width="5" height="5" fill="#070C19" />
      <rect y="15" width="5" height="55" fill="#070C19" />
      <rect x="5" y="10" width="5" height="60" fill="#1F3467" />
      <rect x="70" y="10" width="5" height="60" fill="#1F3467" />
      <rect x="75" y="15" width="5" height="55" fill="#070C19" />
      <rect
        x="75"
        y="75"
        width="5"
        height="5"
        transform="rotate(180 75 75)"
        fill="#070C19"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 80 10)"
        fill="#070C19"
      />
      <rect x="15" y="10" width="5" height="5" fill="#FBFAFA" />
      <rect x="20" y="10" width="5" height="5" fill="#FBFAFA" />
      <rect x="25" y="10" width="5" height="5" fill="#FBFAFA" />
      <rect x="60" y="10" width="5" height="5" fill="#FBFAFA" />
    </svg>
  );
};
