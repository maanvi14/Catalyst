"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import { ModuleSummary } from "@/types/api";

export function useModules() {
  return useQuery({
    queryKey: ["modules"],
    queryFn: () => apiClient.get<ModuleSummary[]>("/modules")
  });
}

