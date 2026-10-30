"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CircleAlert, CircleCheck, FileUp, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";

import { api } from "@/lib/api";
import { cn, formatFileSize } from "@/lib/utils";
import { validateResumeFile } from "@/lib/validations";

type UploadStatus = "Waiting" | "Uploading" | "Processing" | "Completed" | "Failed";

interface UploadItem {
  id: number;
  file: File;
  status: UploadStatus;
  error?: string;
}

const POLL_INTERVAL_MS = 2000;

const STATUS_ICONS: Record<UploadStatus, typeof Loader2> = {
  Waiting: FileUp,
  Uploading: Loader2,
  Processing: Loader2,
  Completed: CircleCheck,
  Failed: CircleAlert,
};

export function ResumeUploader({ jobId }: { jobId: string }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queue = useRef<UploadItem[]>([]);
  const running = useRef(false);
  const mounted = useRef(true);
  const nextId = useRef(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function update(id: number, changes: Partial<UploadItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }

  async function waitForResult(resumeId: string): Promise<string | null> {
    while (mounted.current) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const resume = await api.resumes.get(resumeId);
      if (resume.processing_status === "completed") return null;
      if (resume.processing_status === "failed") {
        return resume.error_message ?? "Unable to process this resume.";
      }
    }
    return null;
  }

  async function processOne(item: UploadItem) {
    try {
      update(item.id, { status: "Uploading" });
      const resume = await api.resumes.upload(jobId, item.file);
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      update(item.id, { status: "Processing" });
      const error = await waitForResult(resume.id);
      update(item.id, error ? { status: "Failed", error } : { status: "Completed" });
    } catch (error) {
      update(item.id, {
        status: "Failed",
        error: error instanceof Error ? error.message : "Upload failed.",
      });
    }
    queryClient.invalidateQueries();
  }

  /** One at a time, so that a bulk upload stays within Groq's free-tier rate limits. */
  async function runQueue() {
    if (running.current) return;
    running.current = true;
    while (queue.current.length > 0 && mounted.current) {
      await processOne(queue.current.shift()!);
    }
    running.current = false;
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const added = Array.from(files).map((file): UploadItem => {
      const error = validateResumeFile(file) ?? undefined;
      return { id: nextId.current++, file, status: error ? "Failed" : "Waiting", error };
    });
    setItems((current) => [...added, ...current]);
    queue.current.push(...added.filter((item) => item.status === "Waiting"));
    void runQueue();
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border",
        )}
      >
        <FileUp className="mb-2 size-7 text-primary" aria-hidden />
        <p className="text-sm font-medium">Drag &amp; Drop your resume here</p>
        <p className="my-1 text-xs text-muted-foreground">or</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Browse Files
        </button>
        <p className="mt-2 text-xs text-muted-foreground">PDF or DOCX, up to 5 MB each</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          aria-label="Choose resume files"
          accept=".pdf,.docx"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <ul aria-live="polite" className="mt-3 space-y-2">
          {items.map((item) => {
            const Icon = STATUS_ICONS[item.status];
            const busy = item.status === "Uploading" || item.status === "Processing";
            return (
              <li key={item.id} className="rounded-lg border px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(item.file.size)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1 text-xs font-medium",
                      item.status === "Completed" && "text-green-700",
                      item.status === "Failed" && "text-destructive",
                    )}
                  >
                    <Icon className={cn("size-3.5", busy && "animate-spin")} aria-hidden />
                    {item.status}
                  </span>
                </div>
                {item.error && <p className="mt-1 text-xs text-destructive">{item.error}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
