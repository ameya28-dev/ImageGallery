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
      className="w-full max-w-sm bg-surface-2 rounded-2xl p-6"
    >
      <h3 className="text-base font-semibold mb-2">Import sample images?</h3>
      <p className="text-sm text-gray-400 mb-6">
        We can copy 8 sample photos into your gallery so you're not starting from empty. You can freely edit or delete them — it won't affect anyone else.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onDecline}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-surface-3 text-sm font-medium disabled:opacity-50"
        >
          Not now
        </button>
        <button
          onClick={onAccept}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Importing…" : "Import"}
        </button>
      </div>
    </Modal>
  );
}
