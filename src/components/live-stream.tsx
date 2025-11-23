import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { formatDistance } from 'date-fns'
import { diffJson, Change } from 'diff'
import type { CDCEvent } from '@/lib/kafka-cdc-consumer'
import { Badge } from '@/components/ui/badge'

export interface LiveStreamProps {
  messages: CDCEvent[]
  isConnected: boolean
  error: string | null
}

export function LiveStream({ messages, isConnected, error }: LiveStreamProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set(),
  )

  const toggleExpand = (messageId: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }

  const formatJson = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
  }

  const renderDiff = (msg: CDCEvent) => {
    // Check if this is a parsed CDC event with value payload
    if (msg.type === 'parsed' && msg.value?.payload) {
      const payload = msg.value.payload
      // Treat null as empty object for diffing
      const before = payload.before ?? ''
      const after = payload.after ?? ''

      // Use diffJson for structural JSON comparison
      const diff = diffJson(before, after)

      return (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            Changes:
          </div>
          <div className="rounded border border-border bg-background font-mono text-xs overflow-auto max-h-96">
            {diff.map((part: Change, index: number) => {
              // GitHub-style colors using theme variables
              const bgColor = part.added
                ? 'bg-diff-addition text-diff-addition-foreground'
                : part.removed
                  ? 'bg-diff-deletion text-diff-deletion-foreground'
                  : 'bg-background text-foreground'

              const borderColor = part.added
                ? 'border-l-diff-addition-border'
                : part.removed
                  ? 'border-l-diff-deletion-border'
                  : 'border-l-transparent'

              const prefix = part.added ? '+' : part.removed ? '-' : ' '

              return (
                <div
                  key={index}
                  className={`${bgColor} border-l-2 ${borderColor}`}
                >
                  {part.value.split('\n').map((line, lineIndex) => {
                    // Skip the last empty line
                    if (
                      lineIndex === part.value.split('\n').length - 1 &&
                      line === ''
                    ) {
                      return null
                    }
                    return (
                      <div key={lineIndex} className="flex py-0.5">
                        <span className="select-none opacity-50 w-8 shrink-0 text-center">
                          {prefix}
                        </span>
                        <span className="flex-1 whitespace-pre">{line}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    // Check if this is a schema change event
    if (msg.type === 'schema-change' && msg.value?.payload) {
      const payload = msg.value.payload
      return (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            DDL Statement:
          </div>
          <div className="rounded border border-border bg-background p-3">
            {payload.ddl ? (
              <pre className="text-xs font-mono whitespace-pre-wrap wrap-break-word text-foreground">
                {payload.ddl}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground">No DDL statement</p>
            )}
          </div>
        </div>
      )
    }

    // Fallback: show the entire message as JSON
    return (
      <pre className="text-xs font-mono overflow-auto max-h-96">
        {formatJson(msg)}
      </pre>
    )
  }

  return (
    <div className="flex h-full flex-col bg-card w-full">
      {/* Messages List */}
      <div className="flex-1 min-h-0 bg-background h-full overflow-y-auto">
        <div className="space-y-1.5 p-4 w-full max-w-full">
          {error ? (
            <div className="flex h-32 items-center justify-center text-center">
              <div className="space-y-2">
                <p className="text-sm font-medium font-mono text-destructive">
                  Stream Error
                </p>
                <p className="text-xs font-mono text-muted-foreground">{error}</p>
                <p className="text-xs font-mono text-muted-foreground">
                  Please refresh the page to reconnect
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-center">
              <div className="space-y-2">
                <div className={`h-3 w-3 rounded-full mx-auto ${isConnected ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
                <p className="text-sm font-mono text-muted-foreground">
                  {isConnected
                    ? 'Waiting for changes...'
                    : 'Connecting to stream...'}
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const messageId = `${msg.topic}-${msg.offset}`
              const isExpanded = expandedMessages.has(messageId)

              // Get operation type
              let opLabel = null
              let opBadgeClass = 'bg-muted text-muted-foreground'
              
              if (msg.type === 'parsed' && msg.value?.payload?.op) {
                const op = msg.value.payload.op

                if (op === 'c') {
                  opLabel = 'CREATE'
                  opBadgeClass =
                    'bg-diff-addition text-diff-addition-foreground border-diff-addition-border'
                } else if (op === 'u') {
                  opLabel = 'UPDATE'
                  opBadgeClass =
                    'bg-diff-update text-diff-update-foreground border-diff-update-border'
                } else if (op === 'd') {
                  opLabel = 'DELETE'
                  opBadgeClass =
                    'bg-diff-deletion text-diff-deletion-foreground border-diff-deletion-border'
                } else if (op === 'r') {
                  opLabel = 'READ'
                  opBadgeClass =
                    'bg-secondary/20 text-secondary border-secondary/40'
                }
              } else if (msg.type === 'schema-change' && msg.value?.payload) {
                const tableChange = msg.value.payload.tableChanges?.[0]
                if (tableChange) {
                  const changeType = tableChange.type
                  if (changeType === 'CREATE') {
                    opLabel = 'CREATE TABLE'
                    opBadgeClass =
                      'bg-diff-addition text-diff-addition-foreground border-diff-addition-border'
                  } else if (changeType === 'DROP') {
                    opLabel = 'DROP TABLE'
                    opBadgeClass =
                      'bg-diff-deletion text-diff-deletion-foreground border-diff-deletion-border'
                  } else if (changeType === 'ALTER') {
                    opLabel = 'ALTER TABLE'
                    opBadgeClass =
                      'bg-diff-update text-diff-update-foreground border-diff-update-border'
                  }
                } else {
                  opLabel = 'DDL'
                  opBadgeClass =
                    'bg-primary/20 text-primary border-primary/40'
                }
              }

              return (
                <div
                  key={messageId}
                  className="rounded border border-border bg-card transition-colors hover:bg-muted/50 hover:border-primary/50"
                >
                  <button
                    onClick={() => toggleExpand(messageId)}
                    className="w-full p-2 text-left"
                  >
                    <div className="flex items-start gap-1.5">
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          {opLabel && (
                            <span
                              className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border ${opBadgeClass}`}
                            >
                              {opLabel}
                            </span>
                          )}
                          {msg.type === 'parsed' &&
                            msg.value?.payload?.source?.table && (
                              <Badge variant="outline" className="text-[10px] font-mono h-5 bg-accent/50">
                                {msg.value.payload.source.table}
                              </Badge>
                            )}
                          {msg.type === 'schema-change' &&
                            msg.value?.payload?.tableChanges?.[0] && (
                              <Badge variant="outline" className="text-[10px] font-mono h-5 bg-accent/50">
                                {msg.value.payload.tableChanges[0].id.split('.').pop()?.replace(/["']/g, '') || 'unknown'}
                              </Badge>
                            )}
                          <span className="text-[10px] font-mono text-muted-foreground opacity-50 ml-auto">
                            {formatDistance(
                              new Date(Number(msg.timestamp)),
                              Date.now(),
                              {
                                addSuffix: true,
                              },
                            )}
                          </span>
                        </div>
                        {/* <pre className="text-[11px] text-muted-foreground font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                          {preview}
                        </pre> */}
                      </div>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border p-2 bg-muted/10">
                      {renderDiff(msg)}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
