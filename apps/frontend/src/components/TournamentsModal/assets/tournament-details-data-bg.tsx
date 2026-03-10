export const TournamentDetailsDataBg = ({
  className,
}: {
  className: string;
}) => {
  return (
    <svg
      width="435"
      height="625"
      viewBox="0 0 435 625"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
    >
      <rect y="10" width="5" height="605" fill="#070C19" />
      <rect x="5" y="5" width="430" height="615" fill="#D5D8DD" />
      <rect x="430" y="10" width="5" height="605" fill="#070C19" />
      <rect x="5" y="5" width="5" height="5" fill="#070C19" />
      <rect
        width="5"
        height="5"
        transform="matrix(1 0 0 -1 5 620)"
        fill="#070C19"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 430 5)"
        fill="#070C19"
      />
      <rect
        x="430"
        y="620"
        width="5"
        height="5"
        transform="rotate(180 430 620)"
        fill="#070C19"
      />
      <rect x="10" width="415" height="5" fill="#070C19" />
      <rect x="10" y="620" width="415" height="5" fill="#070C19" />
      <rect
        x="425"
        y="610"
        width="5"
        height="5"
        transform="rotate(90 425 610)"
        fill="#ACB0BC"
      />
      <rect
        x="15"
        y="610"
        width="5"
        height="5"
        transform="rotate(90 15 610)"
        fill="#ACB0BC"
      />
      <rect
        x="15"
        y="10"
        width="5"
        height="5"
        transform="rotate(90 15 10)"
        fill="white"
      />
      <rect
        x="425"
        y="10"
        width="5"
        height="5"
        transform="rotate(90 425 10)"
        fill="white"
      />
      <path d="M425 615H10V620H425V615Z" fill="#ACB0BC" />
      <path d="M425 5H10V10H425V5Z" fill="white" />
      <path d="M430 615L430 10L425 10L425 615L430 615Z" fill="#ACB0BC" />
      <path d="M9.99997 615L10 10L5.00003 10L5 615L9.99997 615Z" fill="white" />
    </svg>
  );
};
