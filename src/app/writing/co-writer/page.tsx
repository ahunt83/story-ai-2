import { Suspense } from "react";

import { WritingWorkspace } from "@/components/writing-workspace";

export default function CoWriterPage() {
  return (
    <Suspense fallback={null}>
      <WritingWorkspace initialMode="cowriter" />
    </Suspense>
  );
}
