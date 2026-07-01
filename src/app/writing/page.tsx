import { Suspense } from "react";

import { WritingWorkspace } from "@/components/writing-workspace";

export default function WritingPage() {
  return (
    <Suspense fallback={null}>
      <WritingWorkspace />
    </Suspense>
  );
}
