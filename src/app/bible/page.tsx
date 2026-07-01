import { Suspense } from "react";

import { StoryBibleWorkspace } from "@/components/story-bible-workspace";

export default function StoryBiblePage() {
  return (
    <Suspense fallback={null}>
      <StoryBibleWorkspace />
    </Suspense>
  );
}
