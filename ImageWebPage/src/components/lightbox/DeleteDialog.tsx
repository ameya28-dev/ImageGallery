import Modal from "@/components/ui/Modal";

interface DeleteDialogProps {
  open: boolean;
  count: number;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteDialog({
  open,
  count,
  onConfirm,
  onClose,
}: DeleteDialogProps) {
  const label =
    count > 0
      ? `Delete ${count} photo${count !== 1 ? "s" : ""}?`
      : "Delete photo?";

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="w-full max-w-sm rounded-2xl bg-surface-2 p-6"
    >
      <h3 className="mb-2 text-base font-semibold">{label}</h3>
      <p className="mb-6 text-sm text-gray-400">
        This action cannot be undone. The photo will be permanently deleted.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl bg-surface-3 py-2.5 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium"
        >
          Delete
        </button>
      </div>
    </Modal>
  );
}
