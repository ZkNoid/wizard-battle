export const VolumeBar = ({ className }: { className?: string }) => {
  return (
    <svg
      width="265"
      height="20"
      viewBox="0 0 265 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="5" width="255" height="5" fill="#070C19" />
      <rect x="260" width="5" height="20" fill="#070C19" />
      <rect width="5" height="20" fill="#070C19" />
      <rect x="5" y="5" width="255" height="5" fill="#747C8F" />
      <rect x="5" y="10" width="255" height="5" fill="#D5D8DD" />
      <rect x="5" y="15" width="255" height="5" fill="#070C19" />
    </svg>
  );
};
