import { Button } from '../Button';
import { ConfirmModalBg } from './assets/confirm-modal-bg';

interface ConfirmModalProps {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

export default function ConfirmModal({
  title,
  description,
  onConfirm,
  onCancel,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
}: ConfirmModalProps) {
  return (
    <div className="font-pixel text-main-gray fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-70 h-70 relative" onClick={(e) => e.stopPropagation()}>
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-between gap-2">
          <h1 className="text-main-gray mt-4 text-center text-xl leading-relaxed">
            {title}
          </h1>
          <p className="text-main-gray px-4 text-center text-xs font-thin leading-relaxed">
            {description}
          </p>
          <div className="mb-4 flex w-full gap-1 px-3">
            <Button
              variant="red"
              onClick={onCancel}
              className="h-12 flex-1 px-2 text-sm"
            >
              {cancelButtonText}
            </Button>
            <Button
              variant="green"
              onClick={onConfirm}
              className="h-12 flex-1 px-2 text-sm"
            >
              {confirmButtonText}
            </Button>
          </div>
        </div>

        <ConfirmModalBg className="absolute inset-0 -z-10 h-full w-full" />
      </div>
    </div>
  );
}
