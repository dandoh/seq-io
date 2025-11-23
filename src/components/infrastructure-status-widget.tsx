import { useState, useEffect } from 'react'
import { useInfrastructure } from '@/hooks/use-infrastructure'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Square,
  RotateCw,
} from 'lucide-react'

export function InfrastructureStatusWidget() {
  const [open, setOpen] = useState(false)
  const { status, start, stop, restart, isOperationPending } =
    useInfrastructure()

  const { data, isLoading, error } = status

  // Auto-start when infrastructure is stopped but Docker is available
  useEffect(() => {
    if (
      !isLoading &&
      data &&
      !data.ready &&
      data.docker.available &&
      data.dockerCompose.available &&
      start.status === 'idle'
    ) {
      start.mutate(undefined)
    }
  }, [data, isLoading, start])

  const getStatusColor = () => {
    if (isLoading || isOperationPending) return 'bg-muted-foreground'
    if (error) return 'bg-destructive'
    if (!data?.ready) return 'bg-destructive'
    return 'bg-primary'
  }

  const renderStatusContent = () => {
    // Show loading state for initial load or any operation in progress
    if (isLoading || isOperationPending) {
      const loadingText = start.isPending
        ? 'Starting...'
        : stop.isPending
          ? 'Stopping...'
          : restart.isPending
            ? 'Restarting...'
            : 'Checking status...'

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium text-sm">Processing</div>
                <div className="text-xs text-muted-foreground">
                  {loadingText}
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center gap-2 py-4 text-sm text-destructive">
          <XCircle className="h-4 w-4" />
          <span>Error: {error.message}</span>
        </div>
      )
    }

    // Check for missing dependencies
    if (!data?.docker.available) {
      return (
        <div className="space-y-2 py-2">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-4 w-4" />
            <span className="font-medium">Docker Not Running</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Please start Docker Desktop first.
          </p>
        </div>
      )
    }

    if (!data?.dockerCompose.available) {
      return (
        <div className="space-y-2 py-2">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-4 w-4" />
            <span className="font-medium">Docker Compose Missing</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Please install Docker Compose.
          </p>
        </div>
      )
    }

    // Infrastructure not running
    if (!data?.ready) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <div className="font-medium text-sm">Stopped</div>
                <div className="text-xs text-muted-foreground">
                  Services are down
                </div>
              </div>
            </div>
            <Button
              onClick={() => start.mutate(undefined)}
              disabled={start.isPending}
              size="sm"
              className="h-8"
            >
              {start.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3 mr-1.5" />
              )}
              Start
            </Button>
          </div>
        </div>
      )
    }

    // Infrastructure running
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm">Active</div>
              <div className="text-xs text-muted-foreground font-mono">
                {data.kafkaConnect.url.replace('http://', '')}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => restart.mutate(undefined)}
            disabled={restart.isPending}
            variant="outline"
            size="sm"
            className="h-8"
          >
            {restart.isPending ? (
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
            ) : (
              <RotateCw className="h-3 w-3 mr-1.5" />
            )}
            Restart
          </Button>
          <Button
            onClick={() => stop.mutate(undefined)}
            disabled={stop.isPending}
            variant="outline"
            size="sm"
            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20"
          >
            {stop.isPending ? (
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
            ) : (
              <Square className="h-3 w-3 mr-1.5" />
            )}
            Stop
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 gap-2 px-3 text-muted-foreground hover:text-foreground"
      >
        <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor()}`} />
        <span className="text-sm font-medium">System</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-base">Infrastructure</DialogTitle>
          </DialogHeader>
          {renderStatusContent()}
        </DialogContent>
      </Dialog>
    </>
  )
}
