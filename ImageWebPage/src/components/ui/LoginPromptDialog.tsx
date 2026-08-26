import Modal from "@/components/ui/Modal";
import { useRouter } from "next/navigation";

interface LoginPromptDialogProps {
  open: boolean;
  action: string; // e.g., "delete this image"
  onClose: () => void;
}

export default function LoginPromptDialog({
  open,
  action,
  onClose,
}: LoginPromptDialogProps) {
  const router = useRouter();

  const handleLogin = () => {
    onClose();
    router.push("/login");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="w-full max-w-sm bg-surface-2 rounded-2xl p-6"
    >
      <h3 className="text-base font-semibold mb-2">Sign in required</h3>
      <p className="text-sm text-gray-400 mb-6">
        You need to sign in to {action}.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl bg-surface-3 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleLogin}
          className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-medium"
        >
          Sign in
        </button>
      </div>
    </Modal>
  );
}
