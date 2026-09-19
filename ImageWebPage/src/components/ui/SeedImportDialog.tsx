import Modal from "@/components/ui/Modal";

interface SeedImportDialogProps {
  open: boolean;
  onDecline: () => void;
  onAccept: () => void;
  loading?: boolean;
}

export default function SeedImportDialog({
  open,
  onDecline,
  onAccept,
  loading = false,
}: SeedImportDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onDecline}
      className="w-full max-w-sm rounded-2xl bg-surface-2 p-6"
    >
      <h3 className="mb-2 text-base font-semibold">Import sample images?</h3>
      <p className="mb-6 text-sm text-gray-400">
        We can copy 8 sample photos into your gallery so you're not starting
        from empty. You can freely edit or delete them — it won't affect anyone
        else.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onDecline}
          disabled={loading}
          className="flex-1 rounded-xl bg-surface-3 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          Not now
        </button>
        <button
          onClick={onAccept}
          disabled={loading}
          className="flex-1 rounded-xl bg-white py-2.5 text-sm font-medium text-black disabled:opacity-50"
        >
          {loading ? "Importing…" : "Import"}
        </button>
      </div>
    </Modal>
  );
}
