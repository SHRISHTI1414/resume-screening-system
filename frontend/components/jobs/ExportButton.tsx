"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function ExportButton({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [pending, setPending] = useState(false);

  async function exportCsv() {
    setPending(true);
    try {
      const url = URL.createObjectURL(await api.jobs.exportCsv(jobId));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${jobTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-candidates.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The export failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" onClick={exportCsv} disabled={pending}>
      <Download aria-hidden />
      Export CSV
    </Button>
  );
}
