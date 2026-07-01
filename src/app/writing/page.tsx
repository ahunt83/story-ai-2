import { Suspense } from "react";
import { redirect } from "next/navigation";

import { WritingWorkspace } from "@/components/writing-workspace";
import { currentUser } from "@/lib/auth";

export default async function WritingPage() {
  if (!(await currentUser())) {
    redirect("/login");
  }

  return (
    <Suspense fallback={null}>
      <WritingWorkspace />
    </Suspense>
  );
}
