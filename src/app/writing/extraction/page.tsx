import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ExtractionWorkspace } from "@/components/extraction-workspace";
import { currentUser } from "@/lib/auth";

export default async function ExtractionPage() {
  if (!(await currentUser())) {
    redirect("/login");
  }

  return (
    <Suspense fallback={null}>
      <ExtractionWorkspace />
    </Suspense>
  );
}
