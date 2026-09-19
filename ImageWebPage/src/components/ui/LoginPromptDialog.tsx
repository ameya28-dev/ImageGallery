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
      className="w-full max-w-sm rounded-2xl bg-surface-2 p-6"
    >
      <h3 className="mb-2 text-base font-semibold">Sign in required</h3>
      <p className="mb-6 text-sm text-gray-400">
        You need to sign in to {action}.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl bg-surface-3 py-2.5 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleLogin}
          className="flex-1 rounded-xl bg-white py-2.5 text-sm font-medium text-black"
        >
          Sign in
        </button>
      </div>
    </Modal>
  );
}
