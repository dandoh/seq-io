import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Database,
  Loader2,
  Play,
  Square,
  Trash2,
  Info,
} from 'lucide-react'
import { orpcQuery } from '@/orpc/client'
import { useQuery } from '@tanstack/react-query'
import { LiveStream } from '@/components/live-stream'
import { Badge } from '@/components/ui/badge'
import { useStream } from '@/hooks/use-stream'
import { getTopicPrefix } from '@/lib/schemas'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export const Route = createFileRoute('/connector/$id')({
  component: ConnectorStreamPage,
})

function ConnectorStreamPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()

  // Fetch connector details
  const {
    data: connector,
    isLoading: isConnectorLoading,
    error: connectorError,
  } = useQuery(orpcQuery.getConnectorById.queryOptions({ input: { id } }))

  // Initialize stream hook
  // We pass an empty string as default topicPrefix if connector is not loaded yet
  // The hook handles cleanup when topicPrefix changes
  const {
    isConnected,
    isStreaming,
    messages,
    error: streamError,
    stopStream,
    startStream,
    clearMessages,
  } = useStream({
    topicPrefix: connector ? getTopicPrefix(connector) : '',
  })

  if (isConnectorLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (connectorError || !connector) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Database className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Connector not found</h2>
        <p className="text-sm text-muted-foreground">
          The connector you're looking for doesn't exist.
        </p>
        <Button onClick={() => navigate({ to: '/' })}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Connectors
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background font-sans selection:bg-primary/10">
      {/* Texture Overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(oklch(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link to="/">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>

            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
                {connector.name}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Stream Content */}
      <main className="flex-1 overflow-hidden relative z-10">
        <div className="container mx-auto max-w-7xl h-full px-6 py-6 flex flex-col gap-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto mask-fade-r">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/50 bg-background/50 text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors cursor-default">
                <span className="font-bold opacity-70">Type</span>
                <span className="text-foreground">
                  {connector.dbType}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/50 bg-background/50 text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors cursor-default">
                <span className="font-bold opacity-70">Host</span>
                <span className="text-foreground">
                  {connector.host}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/50 bg-background/50 text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors cursor-default">
                <span className="font-bold opacity-70">Port</span>
                <span className="text-foreground">
                  {connector.port}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/50 bg-background/50 text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors cursor-default">
                <span className="font-bold opacity-70">Database</span>
                <span className="text-foreground">
                  {connector.database}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-background border border-border/50 rounded-md p-1">
              {/* Status & Count */}
              <div className="flex items-center gap-2 px-3 border-r border-border/50">
                <div
                  className={`h-2 w-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-muted-foreground/30'}`}
                />
                <span className="text-xs font-mono text-muted-foreground tabular-nums min-w-[3ch] text-center">
                  {messages.length}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5">
                {isStreaming ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={stopStream}
                    className="h-7 px-2.5 text-xs hover:bg-destructive/10 hover:text-destructive font-medium"
                  >
                    <Square className="h-3 w-3 mr-1.5 fill-current" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startStream}
                    className="h-7 px-2.5 text-xs hover:bg-primary/10 hover:text-primary font-medium"
                  >
                    <Play className="h-3 w-3 mr-1.5 fill-current" />
                    Start
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearMessages}
                  disabled={messages.length === 0}
                  className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                  title="Clear Messages"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 rounded-xl border border-border overflow-hidden backdrop-blur-sm">
            <LiveStream
              messages={messages}
              isConnected={isConnected}
              error={streamError}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
