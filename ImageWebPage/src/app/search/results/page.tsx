import { Suspense } from "react";
import SearchResultsPage from "@/components/search/SearchResultsPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-black text-white">Loading...</div>}>
      <SearchResultsPage />
    </Suspense>
  );
}
