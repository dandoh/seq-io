import {
  Globe,
  Smartphone,
  Server,
  Database,
  FileJson,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface LogEntry {
  id: string
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  timestamp: number
}

export function ArchitectureDiagram() {
  // Define layout constants
  const WIDTH = 1000
  const HEIGHT = 600

  // Node positions (x, y)
  const node1 = { x: 100, y: 100 }
  const node2 = { x: 100, y: 300 }
  const node3 = { x: 100, y: 500 }
  const database = { x: 450, y: 300 }
  const diffView = { x: 800, y: 300 }

  // Node sizes
  const circleRadius = 40
  const databaseWidth = 130
  const databaseHeight = 110
  const diffViewWidth = 280
  const diffViewHeight = 360

  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', type: 'INSERT', table: 'users', timestamp: Date.now() },
    { id: '2', type: 'UPDATE', table: 'orders', timestamp: Date.now() - 1000 },
    {
      id: '3',
      type: 'DELETE',
      table: 'sessions',
      timestamp: Date.now() - 2000,
    },
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      const types: ('INSERT' | 'UPDATE' | 'DELETE')[] = [
        'INSERT',
        'UPDATE',
        'DELETE',
      ]
      const tables = ['users', 'orders', 'products', 'inventory', 'events']

      const type = types[Math.floor(Math.random() * types.length)]
      const table = tables[Math.floor(Math.random() * tables.length)]

      const newLog = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        table,
        timestamp: Date.now(),
      }

      setLogs((prev) => [newLog, ...prev].slice(0, 4))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  // Helper to get styles based on operation type
  const getOpStyles = (type: string) => {
    if (type === 'INSERT')
      return 'bg-diff-addition text-diff-addition-foreground border-diff-addition-border'
    if (type === 'UPDATE')
      return 'bg-diff-update text-diff-update-foreground border-diff-update-border'
    if (type === 'DELETE')
      return 'bg-diff-deletion text-diff-deletion-foreground border-diff-deletion-border'
    return 'bg-muted text-muted-foreground'
  }

  const renderDiffContent = (log: LogEntry) => {
    if (log.type === 'INSERT') {
      return (
        <div className="mt-2 space-y-0.5 font-mono text-[9px]">
          <div className="bg-diff-addition/20 text-diff-addition-foreground px-1 rounded flex gap-2">
            <span className="select-none opacity-50">+</span>
            <span>"id": {Math.floor(Math.random() * 1000)}</span>
          </div>
          <div className="bg-diff-addition/20 text-diff-addition-foreground px-1 rounded flex gap-2">
            <span className="select-none opacity-50">+</span>
            <span>"status": "active"</span>
          </div>
        </div>
      )
    }
    if (log.type === 'UPDATE') {
      return (
        <div className="mt-2 space-y-0.5 font-mono text-[9px]">
          <div className="bg-diff-deletion/20 text-diff-deletion-foreground px-1 rounded flex gap-2">
            <span className="select-none opacity-50">-</span>
            <span>"status": "pending"</span>
          </div>
          <div className="bg-diff-addition/20 text-diff-addition-foreground px-1 rounded flex gap-2">
            <span className="select-none opacity-50">+</span>
            <span>"status": "completed"</span>
          </div>
        </div>
      )
    }
    if (log.type === 'DELETE') {
      return (
        <div className="mt-2 space-y-0.5 font-mono text-[9px]">
          <div className="bg-diff-deletion/20 text-diff-deletion-foreground px-1 rounded flex gap-2">
            <span className="select-none opacity-50">-</span>
            <span>"id": {Math.floor(Math.random() * 1000)}</span>
          </div>
        </div>
      )
    }
    return null
  }

  // Create curved path (Bezier curve)
  const createCurvePath = (x1: number, y1: number, x2: number, y2: number) => {
    const midX = x1 + (x2 - x1) * 0.5
    return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
  }

  // Create straight path
  const createStraightPath = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) => {
    return `M ${x1} ${y1} L ${x2} ${y2}`
  }

  const path1 = createCurvePath(node1.x, node1.y, database.x, database.y)
  const path2 = createStraightPath(node2.x, node2.y, database.x, database.y)
  const path3 = createCurvePath(node3.x, node3.y, database.x, database.y)
  const path4 = createStraightPath(
    database.x,
    database.y,
    diffView.x,
    diffView.y,
  )

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        style={{ maxHeight: '600px' }}
      >
        {/* Background Grid */}
        <defs>
          <pattern
            id="grid-pattern"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
            x="-1"
            y="-1"
          >
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              className="stroke-muted-foreground/20"
              strokeWidth="1"
            />
          </pattern>
          <mask id="grid-mask">
            <rect width="100%" height="100%" fill="url(#grid-gradient)" />
          </mask>
          <radialGradient id="grid-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="80%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="url(#grid-pattern)"
          mask="url(#grid-mask)"
        />

        {/* Connection lines */}
        <path d={path1} className="stroke-border" strokeWidth="2" fill="none" />
        <path d={path2} className="stroke-border" strokeWidth="2" fill="none" />
        <path d={path3} className="stroke-border" strokeWidth="2" fill="none" />
        <path d={path4} className="stroke-border" strokeWidth="2" fill="none" />

        {/* Animated packages traveling along paths */}
        {/* Package on path 1 */}
        <circle r="4" className="fill-primary ">
          <animateMotion dur="3s" repeatCount="indefinite" path={path1} />
        </circle>

        {/* Package on path 2 */}
        <circle r="4" className="fill-primary ">
          <animateMotion
            dur="3s"
            repeatCount="indefinite"
            path={path2}
            begin="0.5s"
          />
        </circle>

        {/* Package on path 3 */}
        <circle r="4" className="fill-primary ">
          <animateMotion
            dur="3s"
            repeatCount="indefinite"
            path={path3}
            begin="1s"
          />
        </circle>

        {/* Package on path 4 */}
        <circle r="4" className="fill-primary ">
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={path4}
            begin="1.5s"
          />
        </circle>

        {/* Nodes (on top) */}
        {/* Left Node 1: Web */}
        <foreignObject
          x={node1.x - 65}
          y={node1.y - 20}
          width={110}
          height={40}
        >
          <div className="flex items-center gap-2.5 h-full px-3 rounded-xl bg-card border border-border shadow-sm">
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-medium text-foreground">
              Web App
            </span>
          </div>
        </foreignObject>

        {/* Left Node 2: App */}
        <foreignObject
          x={node2.x - 65}
          y={node2.y - 20}
          width={110}
          height={40}
        >
          <div className="flex items-center gap-2.5 h-full px-3 rounded-xl bg-card border border-border shadow-sm">
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-medium text-foreground">
              Mobile
            </span>
          </div>
        </foreignObject>

        {/* Left Node 3: Service */}
        <foreignObject
          x={node3.x - 65}
          y={node3.y - 20}
          width={110}
          height={40}
        >
          <div className="flex items-center gap-2.5 h-full px-3 rounded-xl bg-card border border-border shadow-sm">
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <Server className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-medium text-foreground">
              Service
            </span>
          </div>
        </foreignObject>

        {/* Database Box */}
        <foreignObject
          x={database.x - databaseWidth / 2}
          y={database.y - databaseHeight / 2}
          width={databaseWidth}
          height={databaseHeight}
        >
          <div className="w-full h-full rounded-xl bg-card border border-border flex flex-col items-center justify-center gap-3 ">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Database className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-sm font-semibold text-foreground">
                Primary DB
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                postgres:5432
              </span>
            </div>
          </div>
        </foreignObject>

        {/* Diff View Box */}
        <foreignObject
          x={diffView.x - diffViewWidth / 2}
          y={diffView.y - diffViewHeight / 2}
          width={diffViewWidth}
          height={diffViewHeight}
        >
          <div className="w-full h-full rounded-xl bg-card border border-border overflow-hidden flex flex-col ">
            <div className="bg-muted/30 px-3 py-2 border-b border-border flex items-center justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500/20" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
                <div className="w-2 h-2 rounded-full bg-green-500/20" />
              </div>
            </div>
            <div className="flex-1 p-2 bg-background/50 overflow-hidden relative">
              <AnimatePresence initial={false} mode="popLayout">
                {logs.map((log, index) => (
                  <motion.div
                    key={log.id}
                    layout
                    // initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    // animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      'mb-2 rounded border border-border bg-card p-2 ',
                      index === 0
                        ? 'border-primary/20 ring-1 ring-primary/10'
                        : 'opacity-70',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="transition-transform duration-300">
                        {index === 0 ? (
                          <ChevronDown className="w-3 h-3 text-primary shrink-0" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border',
                          getOpStyles(log.type),
                        )}
                      >
                        {log.type}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] font-mono h-4 px-1 bg-accent/50 border-border"
                      >
                        {log.table}
                      </Badge>
                      <span className="text-[9px] font-mono text-muted-foreground/50 ml-auto">
                        {index === 0 ? 'Just now' : `${index * 2}s ago`}
                      </span>
                    </div>

                    <div className="border-t border-border mt-2 pt-2">
                      {renderDiffContent(log)}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Fade out gradient at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background/50 to-transparent pointer-events-none" />
            </div>
          </div>
        </foreignObject>
      </svg>
    </div>
  )
}
