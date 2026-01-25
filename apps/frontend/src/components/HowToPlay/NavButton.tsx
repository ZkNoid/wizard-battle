import { cn } from "@/lib/utils";
import BoxButton from "../shared/BoxButton";
import { ArrowLeft } from "./assets/arrow-left";
import { ArrowRight } from "./assets/arrow-right";

export function NavButton({
  onClick,
  position,
  className,
}: {
  onClick: () => void;
  position: "left" | "right";
  className?: string;
}) {
  return (
    <BoxButton 
      onClick={onClick} 
      className={cn("h-20 w-20", className)}
      enableHoverSound
      enableClickSound
    >
      {position === "left" ? (
        <ArrowLeft className="w-8.5 h-10" />
      ) : (
        <ArrowRight className="w-8.5 h-10" />
      )}
    </BoxButton>
  );
}
