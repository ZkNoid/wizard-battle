export const ExperienceBg = ({
  className,
  expWidth,
  expColor,
}: {
  className: string;
  expWidth: number;
  expColor: string;
}) => {
  return (
    <svg
      width="574"
      height="30"
      viewBox="0 0 574 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect y="5" width="574" height="20" fill="#FBFAFA" />
      <rect x="5" width="564" height="5" fill="#070C19" />
      <rect x="5" y="25" width="564" height="5" fill="#070C19" />
      {/* Experience level */}
      <rect y="5" width={`${expWidth}%`} height="20" fill={expColor} />
      <rect y="5" width="5" height="20" fill="#070C19" />
      <rect x="569" y="5" width="5" height="20" fill="#070C19" />
    </svg>
  );
};
