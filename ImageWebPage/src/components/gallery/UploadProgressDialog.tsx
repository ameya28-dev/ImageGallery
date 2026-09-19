import Modal from "@/components/ui/Modal";

interface UploadProgressDialogProps {
  current: number;
  total: number;
  skipped: number;
}

export default function UploadProgressDialog({
  current,
  total,
  skipped,
}: UploadProgressDialogProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Modal
      open
      onClose={() => {}}
      className="flex w-80 flex-col gap-5 rounded-2xl bg-neutral-900 p-6"
    >
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-white">Uploading photos…</p>
        <p className="text-sm text-gray-400">
          {current} of {total} uploaded
        </p>
        {skipped > 0 && (
          <p className="text-xs text-yellow-500">
            {skipped} {skipped === 1 ? "file" : "files"} skipped (duplicates or
            errors)
          </p>
        )}
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-700">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-right text-xs text-gray-500">{pct}%</p>
    </Modal>
  );
}
