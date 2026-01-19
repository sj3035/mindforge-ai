import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgentError } from "@/types/agent";

interface ErrorDisplayProps {
  error: AgentError;
  onRetry: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="font-medium text-foreground">Agent Error</h3>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          {error.details && (
            <p className="text-xs text-muted-foreground/70 font-mono mt-2 p-2 bg-secondary/50 rounded">
              {error.details}
            </p>
          )}
        </div>
      </div>
      
      <Button
        onClick={onRetry}
        variant="outline"
        className="w-full border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </div>
  );
}
