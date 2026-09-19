import { Suspense } from "react";
import SearchResultsPage from "@/components/search/SearchResultsPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
          Loading...
        </div>
      }
    >
      <SearchResultsPage />
    </Suspense>
  );
}
