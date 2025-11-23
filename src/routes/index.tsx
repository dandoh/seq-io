import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Settings,
  Plus,
  Trash2,
  Loader2,
  ArrowRight,
  Database,
  Zap,
} from 'lucide-react'
import { InfrastructureStatusWidget } from '@/components/infrastructure-status-widget'
import { orpcQuery } from '@/orpc/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppForm } from '@/hooks/use-app-form'
import { connectionSchema, type Connection } from '@/lib/schemas'
import { Badge } from '@/components/ui/badge'
import { DatabaseValidationStatus } from '@/components/database-validation-status'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs))
}

function HomePage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: connectors = [], isLoading } = useQuery(
    orpcQuery.listAllConnectors.queryOptions(),
  )

  const deleteMutation = useMutation(
    orpcQuery.deleteConnectorById.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpcQuery.listAllConnectors.queryKey(),
        })
      },
    }),
  )

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this connector?')) {
      await deleteMutation.mutateAsync({ id })
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/10 flex flex-col">
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
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm shadow-primary/20 text-primary-foreground">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              SeqDB
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <InfrastructureStatusWidget />
            <div className="h-5 w-px bg-border" />
            <Link to="/config">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto max-w-7xl px-6 py-8 flex-1 space-y-8">
        {/* Connectors Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              Active Connectors
              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-mono">
                {connectors.length}
              </span>
            </h3>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="font-medium h-9"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Connector
            </Button>
          </div>

            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
              </div>
            ) : connectors.length === 0 ? (
              <EmptyState onCreate={() => setIsCreateDialogOpen(true)} />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {connectors.map((connector: Connection, idx: number) => (
                    <ConnectorCard
                      key={connector.id}
                      connector={connector}
                      index={idx}
                      onDelete={handleDelete}
                      onView={() =>
                        navigate({
                          to: '/connector/$id',
                          params: { id: connector.id },
                        })
                      }
                    />
                  ))}

                  {/* Create New Card (Ghost) */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: connectors.length * 0.05 }}
                  >
                    <button
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="group relative h-full w-full min-h-[220px] rounded-xl border border-dashed border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/50 transition-all duration-300 flex flex-col items-center justify-center gap-4 p-6"
                    >
                      <div className="h-10 w-10 rounded-full bg-background shadow-sm border border-border flex items-center justify-center group-hover:scale-110 group-hover:border-primary/50 group-hover:text-primary transition-all duration-300">
                        <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <p className="font-medium text-sm text-muted-foreground group-hover:text-primary">
                        Add Connector
                      </p>
                    </button>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </section>
        </main>

        <CreateConnectorDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />
    </div>
  )
}

function ConnectorCard({
  connector,
  index,
  onDelete,
  onView,
}: {
  connector: Connection
  index: number
  onDelete: (id: string) => void
  onView: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="group relative overflow-hidden bg-card border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary/0 group-hover:bg-primary transition-all duration-300" />

        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold text-card-foreground group-hover:text-primary transition-colors">
                {connector.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'font-mono text-[10px] uppercase tracking-wider border-border',
                    connector.dbType === 'postgres'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-secondary-foreground',
                  )}
                >
                  {connector.dbType}
                </Badge>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-chart-2" />
                  ONLINE
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(connector.id)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div className="text-muted-foreground text-xs">Host</div>
            <div
              className="font-mono text-card-foreground text-xs text-right truncate"
              title={connector.host}
            >
              {connector.host}
            </div>

            <div className="text-muted-foreground text-xs">Database</div>
            <div
              className="font-mono text-card-foreground text-xs text-right truncate"
              title={connector.database}
            >
              {connector.database}
            </div>

            <div className="text-muted-foreground text-xs">Port</div>
            <div className="font-mono text-card-foreground text-xs text-right">
              {connector.port}
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full font-medium"
              size="sm"
              onClick={onView}
            >
              Open Stream
              <ArrowRight className="h-3.5 w-3.5 ml-2 opacity-50 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-12 flex flex-col items-center justify-center text-center">
      <div className="h-16 w-16 bg-card rounded-2xl shadow-sm border border-border flex items-center justify-center mb-6">
        <Database className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No active connectors
      </h3>
      <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed text-sm">
        Configure a database source to begin streaming change events to your
        destination.
      </p>
      <Button onClick={onCreate}>
        <Plus className="h-4 w-4 mr-2" />
        Create First Connector
      </Button>
    </div>
  )
}

// ----------------------------------------------------------------------
// Dialog Component (Kept mostly same logic but restyled)
// ----------------------------------------------------------------------

interface CreateConnectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CreateConnectorDialog({
  open,
  onOpenChange,
}: CreateConnectorDialogProps) {
  const queryClient = useQueryClient()
  const [connectionTested, setConnectionTested] = useState(false)
  const [validationResults, setValidationResults] = useState<any>(null)
  const [isApplyingFixes, setIsApplyingFixes] = useState(false)

  const saveMutation = useMutation(
    orpcQuery.saveConnectorData.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpcQuery.listAllConnectors.queryKey(),
        })
        handleDialogOpenChange(false)
        form.reset()
      },
    }),
  )

  const validateMutation = useMutation(
    orpcQuery.validateConnection.mutationOptions({
      onSuccess: (data) => {
        setValidationResults(data)
        setConnectionTested(true)
      },
      onError: (error) => {
        setValidationResults({
          isReady: false,
          results: [
            {
              step: 'Connection',
              status: 'error',
              message: String(error),
            },
          ],
        })
        setConnectionTested(true)
      },
    }),
  )

  const fixMutation = useMutation(
    orpcQuery.fixConnectionConfig.mutationOptions({
      onSuccess: (data) => {
        // Keep applying state for smooth transition
        setTimeout(() => {
          setValidationResults(data)
          setConnectionTested(true)
          setIsApplyingFixes(false)
        }, 400)
      },
      onError: () => {
        setIsApplyingFixes(false)
      },
    }),
  )

  const form = useAppForm({
    defaultValues: {
      id: crypto.randomUUID(),
      name: '',
      dbType: 'postgres' as const,
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '',
      database: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Connection,
    validators: {
      onChange: connectionSchema,
    },
    listeners: {
      onChange: () => {
        // Reset test connection status when form changes
        if (connectionTested || validationResults) {
          setConnectionTested(false)
          setValidationResults(null)
          setIsApplyingFixes(false)
        }
      },
    },
    onSubmit: async ({ value }) => {
      const cleanedValue = connectionSchema.parse(value)
      await saveMutation.mutateAsync(cleanedValue)
    },
  })

  const handleTestConnection = () => {
    const values = form.state.values
    setConnectionTested(false)
    setValidationResults(null)

    validateMutation.mutate({
      dbType: values.dbType,
      host: values.host,
      port: values.port,
      username: values.username,
      password: values.password,
      database: values.database,
    })
  }

  const handleRunFixes = () => {
    const values = form.state.values
    setIsApplyingFixes(true)
    fixMutation.mutate({
      dbType: values.dbType,
      host: values.host,
      port: values.port,
      username: values.username,
      password: values.password,
      database: values.database,
    })
  }

  const isConnectionReady = connectionTested && validationResults?.isReady

  const handleDialogOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      form.setFieldValue('id', crypto.randomUUID())
    } else {
      setConnectionTested(false)
      setValidationResults(null)
      setIsApplyingFixes(false)
      validateMutation.reset()
      fixMutation.reset()
      form.reset()
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <div className="p-6 bg-muted border-b border-border shrink-0 rounded-t-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              New Connection
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Configure a new database connector for streaming
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 overflow-y-auto flex-1 rounded-b-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-4 gap-6">
              <div className="col-span-4">
                <form.AppField
                  name="name"
                  children={(field) => (
                    <field.TextField
                      label="Connector Name"
                      placeholder="e.g. Production DB"
                      description="A friendly name for this connector"
                    />
                  )}
                />
              </div>

              <div className="col-span-2">
                <form.AppField
                  name="dbType"
                  children={(field) => (
                    <field.Select
                      label="Database Type"
                      values={[
                        { value: 'postgres', label: 'PostgreSQL' },
                        { value: 'mysql', label: 'MySQL' },
                      ]}
                    />
                  )}
                />
              </div>

              <div className="col-span-2">
                <form.AppField
                  name="host"
                  children={(field) => (
                    <field.TextField
                      label="Host"
                      placeholder="localhost"
                      className="font-mono"
                    />
                  )}
                />
              </div>

              <div className="col-span-2">
                <form.AppField
                  name="port"
                  children={(field) => (
                    <field.NumberField
                      label="Port"
                      min={1}
                      max={65535}
                      className="font-mono"
                    />
                  )}
                />
              </div>

              <div className="col-span-2">
                <form.AppField
                  name="database"
                  children={(field) => (
                    <field.TextField
                      label="Database Name"
                      placeholder="mydb"
                      className="font-mono"
                    />
                  )}
                />
              </div>

              <div className="col-span-2">
                <form.AppField
                  name="username"
                  children={(field) => (
                    <field.TextField
                      label="Username"
                      placeholder="postgres"
                      className="font-mono"
                    />
                  )}
                />
              </div>

              <div className="col-span-2">
                <form.AppField
                  name="password"
                  children={(field) => (
                    <field.TextField
                      label="Password"
                      type="password"
                      placeholder="••••••••"
                      className="font-mono"
                    />
                  )}
                />
              </div>
            </div>

            {/* Validation Results */}
            {(validateMutation.isPending ||
              isApplyingFixes ||
              validationResults) && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                <DatabaseValidationStatus
                  isValidating={validateMutation.isPending || isApplyingFixes}
                  validationResults={validationResults?.results || null}
                  isReady={validationResults?.isReady || false}
                  onRunFixes={handleRunFixes}
                  canRunFixes={!isApplyingFixes}
                  databaseType={form.state.values.dbType}
                />
              </div>
            )}

            {/* Actions */}
            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
              })}
            >
              {({ canSubmit }) => (
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-border mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDialogOpenChange(false)}
                  >
                    Cancel
                  </Button>

                  {!isConnectionReady ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={
                        validateMutation.isPending || fixMutation.isPending
                      }
                    >
                      {validateMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Test Connection
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      type="submit"
                      disabled={!canSubmit || saveMutation.isPending}
                    >
                      {saveMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Connector
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </form.Subscribe>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
