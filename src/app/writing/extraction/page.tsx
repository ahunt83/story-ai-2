import { Suspense } from "react";

import { ExtractionWorkspace } from "@/components/extraction-workspace";

export default function ExtractionPage() {
  return (
    <Suspense fallback={null}>
      <ExtractionWorkspace />
    </Suspense>
  );
}
