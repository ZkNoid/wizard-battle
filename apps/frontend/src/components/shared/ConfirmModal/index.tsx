import { Button } from "../Button";
import { ConfirmModalBg } from "./assets/confirm-modal-bg";


interface ConfirmModalProps {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

export default function ConfirmModal({ title, description, onConfirm, onCancel, confirmButtonText = 'Confirm', cancelButtonText = 'Cancel' }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 font-pixel text-main-gray">
      <div className="relative w-[277px] h-[231px]" onClick={(e) => e.stopPropagation()}>
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-between gap-2">
          <h1 className="text-md text-main-gray text-center leading-relaxed mt-4">
            {title}
          </h1>
          <p className="text-xs text-main-gray text-center leading-relaxed px-4 font-thin">
            {description}
          </p>
          <div className="flex w-full gap-1 mb-4 px-3">
            <Button variant="red" onClick={onCancel} className="flex-1 h-12 px-2">
              {cancelButtonText}
            </Button>
            <Button variant="green" onClick={onConfirm} className="flex-1 h-12 px-2">
              {confirmButtonText}
            </Button>
          </div>
        </div>

        <ConfirmModalBg className="absolute inset-0 -z-10 h-full w-full" />
      </div>
    </div>
  );
}