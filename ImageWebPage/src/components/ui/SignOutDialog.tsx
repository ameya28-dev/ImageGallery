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
    <Modal
      open={open}
      onClose={onClose}
      className="w-full max-w-sm rounded-2xl bg-surface-2 p-6"
    >
      <h3 className="mb-2 text-base font-semibold">Sign out?</h3>
      <p className="mb-6 text-sm text-gray-400">
        You will need to sign in again to manage your gallery.
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
          className="flex-1 rounded-xl bg-white py-2.5 text-sm font-medium text-black"
        >
          Sign out
        </button>
      </div>
    </Modal>
  );
}
