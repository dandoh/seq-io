import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Wrench,
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
      <div className="rounded-lg border border-blue-500/50 bg-blue-500/5 p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 shrink-0" />
          <div>
            <div className="font-medium text-sm">
              {validationResults ? 'Applying fixes...' : 'Testing connection...'}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {validationResults 
                ? `Attempting to fix ${dbName} configuration automatically` 
                : `Validating ${dbName} configuration for Debezium CDC`
              }
            </div>
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

  if (isReady && !hasWarnings) {
    return (
      <div className="rounded-lg border border-green-500/50 bg-green-500/5 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <div className="font-medium text-sm text-green-900 dark:text-green-100">
              Connection Verified
            </div>
            <div className="text-xs text-green-800 dark:text-green-200 mt-0.5">
              {dbName} is ready for streaming.
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isReady && hasWarnings) {
    return (
      <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/5 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
          <div>
            <div className="font-medium text-sm text-yellow-900 dark:text-yellow-100">
              Connection Verified with Warnings
            </div>
            <div className="text-xs text-yellow-800 dark:text-yellow-200 mt-0.5">
              {dbName} is connected but has configuration warnings.
            </div>
          </div>
        </div>

        {/* Validation Steps */}
        <div className="space-y-2 pl-7">
          {validationResults.map((result, index) => (
            <ValidationStep
              key={index}
              step={result.step}
              status={result.status}
              message={result.message}
            />
          ))}
        </div>

        {/* Warning Summary */}
        {warningSteps.length > 0 && (
          <div className="pl-7 pt-2 border-t border-yellow-500/20">
            <div className="text-xs font-medium text-yellow-900 dark:text-yellow-100 mb-2">
              Configuration Recommendations
            </div>
            <div className="text-xs text-muted-foreground space-y-1 mb-3">
              {warningSteps.map((warning, idx) => (
                <div key={idx}>• {warning.message}</div>
              ))}
            </div>
            {canRunFixes && (
              <>
                <div className="text-xs text-muted-foreground mb-2">
                  Click below to automatically apply recommended configuration fixes.
                </div>
                <Button
                  variant="outline"
                  type="button"
                  size="sm"
                  onClick={onRunFixes}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Apply Fixes Automatically
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2 text-destructive">
          <XCircle className="h-5 w-5 shrink-0" />
          <div className="font-semibold text-sm">Connection Test Failed</div>
        </div>

        {/* Validation Steps */}
        <div className="space-y-2 pl-7">
          {validationResults.map((result, index) => (
            <ValidationStep
              key={index}
              step={result.step}
              status={result.status}
              message={result.message}
            />
          ))}
        </div>

        {/* Error Summary with Fix Button */}
        {hasErrors && (
          <div className="pl-7 pt-2 border-t border-destructive/20">
            <div className="text-xs font-medium text-destructive mb-2">
              {dbName} requires configuration for CDC
            </div>
            <div className="text-xs text-muted-foreground space-y-1 mb-3">
              {errorSteps.map((error, idx) => (
                <div key={idx}>• {error.message}</div>
              ))}
            </div>
            {canRunFixes && hasFixableErrors && (
              <>
                <div className="text-xs text-muted-foreground mb-2">
                  Click below to automatically apply configuration fixes to your {dbName} database.
                </div>
                <Button
                  variant="outline"
                  type="button"
                  size="sm"
                  onClick={onRunFixes}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Apply Fixes Automatically
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// Keep backward compatibility
export const MySQLValidationStatus = DatabaseValidationStatus

interface ValidationStepProps {
  step: string
  status: 'success' | 'error' | 'warning'
  message: string
}

function ValidationStep({ step, status, message }: ValidationStepProps) {
  const icon = {
    success: <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />,
    error: <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />,
    warning: <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 shrink-0" />,
  }[status]

  const textColor = {
    success: 'text-green-900 dark:text-green-100',
    error: 'text-destructive',
    warning: 'text-yellow-900 dark:text-yellow-100',
  }[status]

  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs ${textColor}`}>
          <span className="font-medium">{step}:</span> {message}
        </div>
      </div>
    </div>
  )
}

