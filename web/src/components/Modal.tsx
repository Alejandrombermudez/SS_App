import type { ReactNode } from 'react';

export default function Modal({
  onDismiss,
  children,
  maxWidthClassName = 'max-w-md',
}: {
  onDismiss: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
      onClick={onDismiss}
    >
      <div
        className={`w-full ${maxWidthClassName} max-h-[90vh] overflow-y-auto rounded-2xl bg-[#1E2D45] shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
