import Modal from "@/components/ui/Modal";

interface SignOutDialogProps {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function SignOutDialog({
  open,
  onConfirm,
  onClose,
}: SignOutDialogProps) {
  return (
    <Modal open={open} onClose={onClose} className="w-full max-w-sm bg-surface-2 rounded-2xl p-6">
      <h3 className="text-base font-semibold mb-2">Sign out?</h3>
      <p className="text-sm text-gray-400 mb-6">
        You will need to sign in again to manage your gallery.
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
          className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-medium"
        >
          Sign out
        </button>
      </div>
    </Modal>
  );
}
