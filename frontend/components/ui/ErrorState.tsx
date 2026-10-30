import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-xl border bg-white px-6 py-12 text-center"
    >
      <CircleAlert className="mb-3 size-8 text-destructive" aria-hidden />
      <h2 className="font-medium">We could not load this</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
