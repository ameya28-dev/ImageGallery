import Modal from "@/components/ui/Modal";

interface UploadProgressDialogProps {
  current: number;
  total: number;
  skipped: number;
}

export default function UploadProgressDialog({ current, total, skipped }: UploadProgressDialogProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Modal open onClose={() => {}} className="w-80 bg-neutral-900 rounded-2xl p-6 flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-white text-base font-semibold">Uploading photos…</p>
        <p className="text-gray-400 text-sm">
          {current} of {total} uploaded
        </p>
        {skipped > 0 && (
          <p className="text-yellow-500 text-xs">
            {skipped} already in gallery
          </p>
        )}
      </div>

      <div className="w-full h-1.5 bg-neutral-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-gray-500 text-xs text-right">{pct}%</p>
    </Modal>
  );
}
