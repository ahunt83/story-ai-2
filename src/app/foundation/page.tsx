import { Suspense } from "react";
import { redirect } from "next/navigation";

import { FoundationWorkspace } from "@/components/foundation-workspace";
import { currentUser } from "@/lib/auth";

export default async function FoundationPage() {
  if (!(await currentUser())) {
    redirect("/login");
  }

  return (
    <Suspense fallback={null}>
      <FoundationWorkspace />
    </Suspense>
  );
}
