import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Wrench,
  Check,
  X,
  AlertCircle
} from 'lucide-react'


interface ValidationResult {
  step: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: string
}

interface DatabaseValidationStatusProps {
  isValidating: boolean
  validationResults: ValidationResult[] | null
  isReady: boolean
  onRunFixes: () => void
  canRunFixes: boolean
  databaseType?: string
}

export function DatabaseValidationStatus({
  isValidating,
  validationResults,
  isReady,
  onRunFixes,
  canRunFixes,
  databaseType = 'Database',
}: DatabaseValidationStatusProps) {
  const dbName = databaseType.charAt(0).toUpperCase() + databaseType.slice(1)

  if (isValidating) {
    return (
      <div className="rounded-xl border border-info/20 bg-info/5 overflow-hidden">
        <div className="p-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info/10 text-info shrink-0">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold text-foreground">
              {validationResults ? 'Applying fixes...' : 'Testing connection...'}
            </h4>
          </div>
        </div>
      </div>
    )
  }

  if (!validationResults) {
    return null
  }

  const hasErrors = validationResults.some((r) => r.status === 'error')
  const hasWarnings = validationResults.some((r) => r.status === 'warning')
  const errorSteps = validationResults.filter((r) => r.status === 'error')
  const warningSteps = validationResults.filter((r) => r.status === 'warning')
  const hasFixableErrors = errorSteps.some((r) => r.details)

  // Success State
  if (isReady && !hasWarnings) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 overflow-hidden">
        <div className="p-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success shrink-0">
            <Check className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">
            Connection Verified
          </h4>
        </div>
      </div>
    )
  }

  // Warning State
  if (isReady && hasWarnings) {
    return (
      <div className="rounded-xl border border-warning/30 bg-warning/5 overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b border-warning/20">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/10 text-warning shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">
            Connection Verified with Warnings
          </h4>
        </div>
        
        <div className="p-4 bg-warning/5 space-y-3">
           {/* Validation Steps List */}
           <div className="space-y-2">
            {validationResults.map((result, index) => (
              <ValidationStep
                key={index}
                step={result.step}
                status={result.status}
                message={result.message}
                details={result.details}
              />
            ))}
          </div>

          {warningSteps.length > 0 && canRunFixes && (
             <div className="pt-3 mt-3 border-t border-warning/30">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-foreground font-medium">
                    Recommended fixes available
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRunFixes}
                    className="bg-card border-warning/30 text-foreground hover:bg-warning/10 hover:text-foreground h-8 text-xs"
                  >
                    <Wrench className="h-3.5 w-3.5 mr-2" />
                    Apply Fixes
                  </Button>
                </div>
             </div>
          )}
        </div>
      </div>
    )
  }

  // Error State
  return (
    <div className="rounded-xl border border-destructive/20 bg-card overflow-hidden shadow-sm">
      <div className="p-4 flex items-center gap-3 border-b border-border bg-destructive/5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive shrink-0">
          <X className="h-4 w-4" />
        </div>
        <h4 className="text-sm font-semibold text-foreground">
          Connection Test Failed
        </h4>
      </div>

      <div className="p-4 space-y-4">
         {/* Validation Steps List */}
        <div className="space-y-1">
          {validationResults.map((result, index) => (
            <ValidationStep
              key={index}
              step={result.step}
              status={result.status}
              message={result.message}
              details={result.details}
            />
          ))}
        </div>

        {/* Fix Action Area */}
        {hasErrors && hasFixableErrors && canRunFixes && (
          <div className="rounded-lg border border-border bg-muted p-3 flex items-center justify-between gap-3">
             <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground block mb-0.5">Auto-Fix Available</span>
                We can attempt to configure {dbName} automatically.
             </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onRunFixes}
                className="bg-card hover:bg-muted border-border text-foreground h-8 text-xs whitespace-nowrap"
              >
                <Wrench className="h-3.5 w-3.5 mr-2" />
                Apply Fixes
              </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Keep backward compatibility
export const MySQLValidationStatus = DatabaseValidationStatus

interface ValidationStepProps {
  step: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: string
}

function ValidationStep({ step, status, message, details }: ValidationStepProps) {
  const icon = {
    success: <CheckCircle2 className="h-4 w-4 text-success shrink-0" />,
    error: <XCircle className="h-4 w-4 text-destructive shrink-0" />,
    warning: <AlertCircle className="h-4 w-4 text-warning shrink-0" />,
  }[status]

  return (
    <div className="flex items-start gap-3 py-2 text-left group">
      <div className="mt-0.5 transition-transform group-hover:scale-110">{icon}</div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
           <span className="text-xs font-medium text-foreground">{step}</span>
           {status === 'error' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive tracking-wide">
                Failed
              </span>
           )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {message}
        </p>
        
        {details && (
          <div className="mt-2 p-2 rounded bg-muted border border-border text-[10px] font-mono text-muted-foreground overflow-x-auto">
            {details}
          </div>
        )}
      </div>
    </div>
  )
}

