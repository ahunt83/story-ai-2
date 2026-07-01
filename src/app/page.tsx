import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LibraryClient } from "@/components/library-client";
import { currentUser } from "@/lib/auth";

export default async function LibraryPage() {
  if (!(await currentUser())) {
    redirect("/login");
  }

  return (
    <Suspense fallback={null}>
      <LibraryClient />
    </Suspense>
  );
}
