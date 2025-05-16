import { cn } from "@/lib/utils";

export const AudioIcon = ({
  className,
  isActive,
}: {
  className?: string;
  isActive: boolean;
}) => {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("group", className)}
    >
      <rect
        x="10"
        y="10"
        width="60"
        height="60"
        fill="#557FE8"
        className={"group-hover:fill-[#86A6F6]"}
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
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 40 20)"
        fill="#070C19"
      />
      <rect
        x="40"
        y="60"
        width="5"
        height="5"
        transform="rotate(180 40 60)"
        fill="#FBFAFA"
      />
      <rect
        x="40"
        y="55"
        width="5"
        height="30"
        transform="rotate(180 40 55)"
        fill="#1F3467"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 35 20)"
        fill="#070C19"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 35 25)"
        fill="#1F3467"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 35 30)"
        fill="#1F3467"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 35 35)"
        fill="#1F3467"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 35 40)"
        fill="#1F3467"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 35 45)"
        fill="#1F3467"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 35 50)"
        fill="#1F3467"
      />
      <rect
        x="35"
        y="60"
        width="5"
        height="5"
        transform="rotate(180 35 60)"
        fill="#FBFAFA"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 30 25)"
        fill="#070C19"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 30 30)"
        fill="#1F3467"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 30 35)"
        fill="#1F3467"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 25 35)"
        fill="#1F3467"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 30 40)"
        fill="#1F3467"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 25 40)"
        fill="#1F3467"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 30 45)"
        fill="#1F3467"
      />
      {isActive ? (
        <>
          <rect
            width="5"
            height="5"
            transform="matrix(-1 0 0 1 50 30)"
            fill="#070C19"
          />
          <rect
            width="5"
            height="5"
            transform="matrix(-1 0 0 1 55 35)"
            fill="#070C19"
          />
          <rect
            width="5"
            height="5"
            transform="matrix(-1 0 0 1 65 35)"
            fill="#1F3467"
          />
          <rect
            width="5"
            height="5"
            transform="matrix(-1 0 0 1 65 30)"
            fill="#070C19"
          />
          <rect
            width="5"
            height="5"
            transform="matrix(-1 0 0 1 60 25)"
            fill="#070C19"
          />
          <rect
            width="5"
            height="5"
            transform="matrix(-1 0 0 1 60 50)"
            fill="#1F3467"
          />
          <rect
            width="5"
            height="5"
            transform="matrix(-1 0 0 1 55 40)"
            fill="#1F3467"
          />
          <rect
            width="5"
            height="5"
            transform="matrix(-1 0 0 1 65 40)"
            fill="#1F3467"
          />
          <rect
            width="5"
            height="5"
            transform="matrix(-1 0 0 1 65 45)"
            fill="#1F3467"
          />
          <rect
            width="5"
            height="5"
            transform="matrix(-1 0 0 1 50 45)"
            fill="#1F3467"
          />
        </>
      ) : (
        <>
          <rect
            width="5"
            height="5"
            transform="matrix(-1 0 0 1 50 31)"
            fill="#070C19"
          />
          <rect
            width="5"
            height="5"
            transform="matrix(-1 0 0 1 55 36)"
            fill="#070C19"
          />
          <rect
            width="5"
            height="5"
            transform="matrix(-1 0 0 1 60 36)"
            fill="#070C19"
          />
          <rect
            width="5"
            height="5"
            transform="matrix(-1 0 0 1 65 31)"
            fill="#070C19"
          />
          <rect
            width="5"
            height="5"
            transform="matrix(-1 0 0 1 55 41)"
            fill="#1F3467"
          />
          <rect
            width="5"
            height="5"
            transform="matrix(-1 0 0 1 60 41)"
            fill="#1F3467"
          />
          <rect
            width="5"
            height="5"
            transform="matrix(-1 0 0 1 65 46)"
            fill="#1F3467"
          />
          <rect
            width="5"
            height="5"
            transform="matrix(-1 0 0 1 50 46)"
            fill="#1F3467"
          />
        </>
      )}
      <rect
        x="30"
        y="55"
        width="5"
        height="5"
        transform="rotate(180 30 55)"
        fill="#FBFAFA"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 25 30)"
        fill="#070C19"
      />
      <rect
        x="25"
        y="50"
        width="5"
        height="5"
        transform="rotate(180 25 50)"
        fill="#FBFAFA"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 20 30)"
        fill="#070C19"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 20 35)"
        fill="#1F3467"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 20 40)"
        fill="#1F3467"
      />
      <rect
        width="5"
        height="5"
        transform="matrix(-1 0 0 1 20 45)"
        fill="#FBFAFA"
      />
      <rect x="15" y="10" width="5" height="5" fill="#FBFAFA" />
      <rect x="20" y="10" width="5" height="5" fill="#FBFAFA" />
      <rect x="25" y="10" width="5" height="5" fill="#FBFAFA" />
      <rect x="60" y="10" width="5" height="5" fill="#FBFAFA" />
    </svg>
  );
};
