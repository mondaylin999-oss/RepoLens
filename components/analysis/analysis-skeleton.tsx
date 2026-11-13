import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AnalysisSkeleton({ message }: { message: string }) {
  return (
    <div className="space-y-6">
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin text-primary" />
        {message}
      </p>
      <Card>
        <div className="flex gap-5 p-6">
          <Skeleton className="size-16 rounded-xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t p-6 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10" />)}
        </div>
      </Card>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card>
          <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <Skeleton className="size-44 rounded-full" />
            <div className="w-full space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-3" />)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent className="space-y-5">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-5 rounded-full" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-full" /></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
