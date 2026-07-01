import { Suspense } from "react";
import { redirect } from "next/navigation";

import { StoryBibleWorkspace } from "@/components/story-bible-workspace";
import { currentUser } from "@/lib/auth";

export default async function StoryBiblePage() {
  if (!(await currentUser())) {
    redirect("/login");
  }

  return (
    <Suspense fallback={null}>
      <StoryBibleWorkspace />
    </Suspense>
  );
}
