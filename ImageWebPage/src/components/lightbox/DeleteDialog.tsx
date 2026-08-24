import Modal from "@/components/ui/Modal";

interface DeleteDialogProps {
  open: boolean;
  count: number;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteDialog({ open, count, onConfirm, onClose }: DeleteDialogProps) {
  const label = count > 0 ? `Delete ${count} photo${count !== 1 ? "s" : ""}?` : "Delete photo?";

  return (
    <Modal open={open} onClose={onClose} className="w-full max-w-sm bg-surface-2 rounded-2xl p-6">
      <h3 className="text-base font-semibold mb-2">{label}</h3>
      <p className="text-sm text-gray-400 mb-6">
        This action cannot be undone. The photo will be permanently deleted.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl bg-surface-3 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-medium"
        >
          Delete
        </button>
      </div>
    </Modal>
  );
}
