"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function GlobalError() {
  return <ErrorState title="Something went wrong" description="The Catalyst shell caught an unexpected error." />;
}

