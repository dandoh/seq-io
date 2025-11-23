import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Zap,
  Activity,
  ShieldCheck,
  Radio,
  Database,
  GitCompare,
  CheckCircle2,
  Wand2,
  Video,
  Filter,
  Bot,
  Search,
  Eye,
  Sparkles,
  Terminal,
  X,
  XCircle,
  Wrench,
  Download,
  Share2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ArchitectureDiagram } from '@/components/architecture-diagram'

import {
  SiMysql,
  SiPostgresql,
  SiMongodb,
  SiRedis,
  SiApachekafka,
  SiClickhouse,
  SiSnowflake,
  SiElasticsearch,
  SiGithub,
  SiX,
} from 'react-icons/si'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/landing')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div
      className={cn(
        'min-h-screen bg-background font-sans selection:bg-primary/10 text-foreground overflow-x-hidden',
      )}
    >
      {/* Header */}
      <div className="relative z-10 container mx-auto max-w-7xl px-6 py-8">
        <header className="flex items-center justify-between mb-12 md:mb-16">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 text-primary-foreground">
              <Zap className="h-6 w-6 fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                SeqDB
              </h1>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={(e) => {
                e.preventDefault()
              }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Documentation
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
              }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              GitHub
            </button>
          </nav>
        </header>

        {/* Hero Section - Centered */}
        <section className="relative flex flex-col items-center justify-center text-center py-16 max-w-7xl px-6">
          {/* Streaming Background Animation - Horizontal Diff Streams */}
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none flex flex-col justify-center gap-16 md:gap-24 opacity-30">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="relative w-full h-px bg-linear-to-r from-transparent via-border to-transparent"
              >
                {/* Multiple data packets per stream line */}
                {[...Array(3)].map((_, j) => {
                  // Randomize packet type: 0=Update (Orange/Yellow), 1=Add (Green), 2=Delete (Red)
                  const type = (i + j) % 3
                  const color =
                    type === 0
                      ? 'bg-amber-500'
                      : type === 1
                        ? 'bg-emerald-500'
                        : 'bg-rose-500'
                  const width = Math.random() * 80 + 40 // Random width for code-like blocks

                  return (
                    <motion.div
                      key={j}
                      className={cn(
                        'absolute top-1/2 -translate-y-1/2 h-0.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]',
                        color,
                      )}
                      style={{ width }}
                      initial={{ x: '-20vw', opacity: 0 }}
                      animate={{ x: '105vw', opacity: [0, 0.8, 0.8, 0] }}
                      transition={{
                        duration: 15 + Math.random() * 10, // Slow, steady stream
                        repeat: Infinity,
                        ease: 'linear',
                        delay: Math.random() * 10, // Stagger start times
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="max-w-4xl space-y-8 relative z-10"
          >
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
              Data streaming with <br />
              <span className="text-primary">mechanical precision.</span>
            </h2>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light">
              Spin up a database change capture pipeline on your machine in
              seconds. Visualize database changes in real-time, debug with
              confidence, and ship faster.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button
                size="lg"
                className="h-14 text-lg"
                onClick={(e) => {
                  e.preventDefault()
                }}
              >
                Start Streaming
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 text-lg"
                onClick={(e) => {
                  e.preventDefault()
                }}
              >
                Go to GitHub
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Instant Setup
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Docker-based infrastructure that spins up in one click. No
                complex configuration files or managed services required. Get
                Kafka, Kafka Connect, and all dependencies running in seconds
                with a single command.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Visual Debugging
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                See every INSERT, UPDATE, and DELETE as it happens. Inspect
                payloads and debug your event-driven architecture visually.
                Filter by table, operation type, or timestamp to find exactly
                what you're looking for.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Radio className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Real-Time Streaming
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Capture database changes with sub-second latency. Stream events
                as they happen, ensuring your downstream systems stay in sync.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Database className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Multi-Database Support
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Connect to PostgreSQL, MySQL, and more. Unified interface for
                change capture across different database systems. Switch between
                databases without changing your workflow or tooling.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="space-y-4"
            >
              <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                <GitCompare className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Change Diff Visualization
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                See exactly what changed with side-by-side diffs. Compare before
                and after values to understand data transformations instantly.
                Color-coded additions, updates, and deletions make changes
                immediately obvious.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="space-y-4"
            >
              <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Reliable Delivery
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Guaranteed message delivery with Kafka-backed persistence. Never
                lose a change event, even during system restarts or network
                interruptions. Built-in retry logic and offset management ensure
                data integrity.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Architecture Section */}
        <section className="max-w-7xl px-6 py-20">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              See Your Changes in Git Diff Style
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Monitor your database evolution with a familiar git-style
              interface. Track data modifications and schema changes in
              real-time, giving you complete visibility into how your system
              behaves and evolves—perfect for reverse engineering and debugging
              complex applications.
            </p>
          </div>
        </section>
      </div>

      {/* Architecture Diagram - Full Width */}
      <div className="w-full">
        <ArchitectureDiagram />
      </div>

      {/* Continue container */}
      <div className="relative z-10 container mx-auto max-w-7xl px-6">
        {/* Supported Data Sources Section */}
        <section className="max-w-7xl px-6 py-20">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Supported Data Sources
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect to your favorite databases and stream changes instantly.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {/* PostgreSQL */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card border border-border shadow-xs hover:shadow-md transition-shadow space-y-4"
            >
              <SiPostgresql className="w-12 h-12 text-[#336791]" />
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">PostgreSQL</h3>
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-200/50"
                >
                  Supported
                </Badge>
              </div>
            </motion.div>

            {/* MySQL */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card border border-border shadow-xs hover:shadow-md transition-shadow space-y-4"
            >
              <SiMysql className="w-12 h-12 text-[#00758F]" />
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">MySQL</h3>
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-200/50"
                >
                  Supported
                </Badge>
              </div>
            </motion.div>

            {/* MongoDB */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card/50 border border-border/50 shadow-xs space-y-4 opacity-70 hover:opacity-100 transition-opacity"
            >
              <SiMongodb className="w-12 h-12 text-[#47A248] grayscale opacity-70" />
              <div className="space-y-1">
                <h3 className="font-semibold text-muted-foreground">MongoDB</h3>
                <Badge
                  variant="outline"
                  className="text-muted-foreground border-border"
                >
                  Coming Soon
                </Badge>
              </div>
            </motion.div>

            {/* Redis */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card/50 border border-border/50 shadow-xs space-y-4 opacity-70 hover:opacity-100 transition-opacity"
            >
              <SiRedis className="w-12 h-12 text-[#DC382D] grayscale opacity-70" />
              <div className="space-y-1">
                <h3 className="font-semibold text-muted-foreground">Redis</h3>
                <Badge
                  variant="outline"
                  className="text-muted-foreground border-border"
                >
                  Coming Soon
                </Badge>
              </div>
            </motion.div>

            {/* Kafka */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card/50 border border-border/50 shadow-xs space-y-4 opacity-70 hover:opacity-100 transition-opacity"
            >
              <SiApachekafka className="w-12 h-12 text-foreground grayscale opacity-70" />
              <div className="space-y-1">
                <h3 className="font-semibold text-muted-foreground">Kafka</h3>
                <Badge
                  variant="outline"
                  className="text-muted-foreground border-border"
                >
                  Coming Soon
                </Badge>
              </div>
            </motion.div>

            {/* ClickHouse */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card/50 border border-border/50 shadow-xs space-y-4 opacity-70 hover:opacity-100 transition-opacity"
            >
              <SiClickhouse className="w-12 h-12 text-[#FFCC00] grayscale opacity-70" />
              <div className="space-y-1">
                <h3 className="font-semibold text-muted-foreground">
                  ClickHouse
                </h3>
                <Badge
                  variant="outline"
                  className="text-muted-foreground border-border"
                >
                  Coming Soon
                </Badge>
              </div>
            </motion.div>

            {/* Snowflake */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7 }}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card/50 border border-border/50 shadow-xs space-y-4 opacity-70 hover:opacity-100 transition-opacity"
            >
              <SiSnowflake className="w-12 h-12 text-[#29B5E8] grayscale opacity-70" />
              <div className="space-y-1">
                <h3 className="font-semibold text-muted-foreground">
                  Snowflake
                </h3>
                <Badge
                  variant="outline"
                  className="text-muted-foreground border-border"
                >
                  Coming Soon
                </Badge>
              </div>
            </motion.div>

            {/* Elasticsearch */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card/50 border border-border/50 shadow-xs space-y-4 opacity-70 hover:opacity-100 transition-opacity"
            >
              <SiElasticsearch className="w-12 h-12 text-[#005571] grayscale opacity-70" />
              <div className="space-y-1">
                <h3 className="font-semibold text-muted-foreground">
                  Elasticsearch
                </h3>
                <Badge
                  variant="outline"
                  className="text-muted-foreground border-border"
                >
                  Coming Soon
                </Badge>
              </div>
            </motion.div>
          </div>
        </section>

        {/* New Features List Section */}
        <section className="max-w-7xl px-6 py-20">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Advanced Capabilities
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to master your database workflows.
            </p>
          </div>

          <div className="space-y-24">
            {/* Feature 1: Auto-Setup */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex flex-col lg:flex-row lg:items-center gap-12 lg:gap-20"
            >
              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="text-3xl font-bold text-foreground mb-2">
                    Auto-Setup
                  </h3>
                  <p className="text-sm font-mono text-muted-foreground tracking-wider uppercase">
                    Zero-config connections for localhost
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 flex items-center justify-center rounded bg-primary/10 text-primary">
                      <Wand2 className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-muted-foreground">
                      Automatically detects running Docker containers
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 flex items-center justify-center rounded bg-primary/10 text-primary">
                      <Database className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-muted-foreground">
                      Configures CDC pipelines for PostgreSQL & MySQL
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 flex items-center justify-center rounded bg-primary/10 text-primary">
                      <Zap className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-muted-foreground">
                      Ready to stream in seconds, not hours
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full">
                <div className="rounded-xl border border-border bg-background shadow-xl aspect-video flex items-center justify-center p-6">
                  {/* DatabaseValidationStatus Mockup */}
                  <div className="rounded-xl border border-destructive/20 bg-card overflow-hidden shadow-sm w-full max-w-[380px]">
                    <div className="p-4 flex items-center gap-3 border-b border-border bg-destructive/5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive shrink-0">
                        <X className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">
                        Configuration Issues Detected
                      </h4>
                    </div>

                    <div className="p-4 space-y-4">
                      <div className="space-y-3">
                        {/* Step 1: Success */}
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          <div className="space-y-0.5">
                            <span className="text-xs font-medium text-foreground">
                              Database Connection
                            </span>
                            <p className="text-xs text-muted-foreground">
                              Connected to postgres:5432
                            </p>
                          </div>
                        </div>

                        {/* Step 2: Error */}
                        <div className="flex items-start gap-3">
                          <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                          <div className="space-y-0.5">
                            <span className="text-xs font-medium text-foreground">
                              CDC Configuration
                            </span>
                            <p className="text-xs text-muted-foreground">
                              WAL level is not set to 'logical'
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Fix Action */}
                      <div className="rounded-lg border border-border bg-muted/50 p-3 flex items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground block mb-0.5">
                            Auto-Fix Available
                          </span>
                          Configure Postgres automatically
                        </div>
                        <div className="bg-background hover:bg-accent border border-border shadow-xs px-3 py-1.5 rounded-md text-xs font-medium flex items-center cursor-pointer transition-colors">
                          <Wrench className="h-3.5 w-3.5 mr-2" />
                          Apply Fixes
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Feature 2: Session Recording */}
            <div className="w-full h-px bg-border/50" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-col lg:flex-row-reverse lg:items-center gap-12 lg:gap-20"
            >
              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="text-3xl font-bold text-foreground mb-2">
                    Session Recording
                  </h3>
                  <p className="text-sm font-mono text-muted-foreground tracking-wider uppercase">
                    Capture, save, and share database sessions
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 flex items-center justify-center rounded bg-primary/10 text-primary">
                      <Video className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-muted-foreground">
                      Record database activity with a simple start/stop interface
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 flex items-center justify-center rounded bg-primary/10 text-primary">
                      <Download className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-muted-foreground">
                      Export recordings to share with your team
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 flex items-center justify-center rounded bg-primary/10 text-primary">
                      <Share2 className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-muted-foreground">
                      View past sessions anytime without database impact
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full">
                <div className="rounded-xl border border-border bg-background shadow-xl aspect-video flex flex-col overflow-hidden">
                  <div className="bg-muted/30 border-b border-border px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs font-medium">Recording... 00:42</span>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs px-3"
                    >
                      Stop
                    </Button>
                  </div>

                  <div className="flex-1 p-6 flex flex-col justify-between">
                    {/* Active Recording Visualization */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Activity className="h-3 w-3" />
                        <span>Capturing events...</span>
                      </div>
                      <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-2/3" />
                      </div>
                      <div className="space-y-1.5 mt-2">
                        <div className="h-1.5 w-3/4 bg-muted rounded-full" />
                        <div className="h-1.5 w-1/2 bg-muted rounded-full" />
                      </div>
                    </div>

                    {/* Saved Sessions List */}
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                        Recent Saves
                      </h4>
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                            <Video className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              auth-bug-repro.json
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              124 events • 2 mins ago
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Feature 3: Smart Filtering */}
            <div className="w-full h-px bg-border/50" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex flex-col lg:flex-row lg:items-center gap-12 lg:gap-20"
            >
              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="text-3xl font-bold text-foreground mb-2">
                    Smart Filtering
                  </h3>
                  <p className="text-sm font-mono text-muted-foreground tracking-wider uppercase">
                    Find the needle in the haystack
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 flex items-center justify-center rounded bg-primary/10 text-primary">
                      <Filter className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-muted-foreground">
                      Filter by table, operation type, or timestamp
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 flex items-center justify-center rounded bg-primary/10 text-primary">
                      <Search className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-muted-foreground">
                      Deep search within JSON payloads
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 flex items-center justify-center rounded bg-primary/10 text-primary">
                      <Eye className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-muted-foreground">
                      Save custom views for recurring debugging tasks
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full">
                <div className="rounded-xl border border-border bg-background shadow-xl aspect-video flex flex-col p-6 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <div className="px-2.5 py-1.5 rounded-md bg-primary/10 border border-primary/20 text-xs text-primary font-medium flex items-center gap-1.5">
                      <span>table: orders</span>
                      <span className="opacity-50 cursor-pointer hover:opacity-100">
                        ×
                      </span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 font-medium flex items-center gap-1.5">
                      <span>amount {'>'} 1000</span>
                      <span className="opacity-50 cursor-pointer hover:opacity-100">
                        ×
                      </span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-md bg-muted border border-border text-xs text-muted-foreground flex items-center gap-1.5 hover:bg-muted/80 cursor-pointer">
                      <span>+ Add filter</span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="w-full h-10 rounded-lg bg-muted/30 border border-border pl-10 pr-4 flex items-center text-sm text-muted-foreground">
                      Search payload content...
                    </div>
                  </div>
                  <div className="space-y-2 mt-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg border border-border/50 flex items-center justify-between hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                          <div className="h-2 w-24 rounded bg-muted" />
                        </div>
                        <div className="h-2 w-12 rounded bg-muted/50" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border mt-12">
          <div className="container mx-auto max-w-7xl px-6 py-12">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20 text-primary-foreground">
                  <Zap className="h-5 w-5 fill-current" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">
                  SeqDB
                </span>
              </div>

              <p className="text-muted-foreground max-w-sm">
                Headless database streaming for modern developers.
              </p>

              <div className="flex items-center gap-5">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <SiGithub className="h-5 w-5" />
                  <span className="sr-only">GitHub</span>
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <SiX className="h-5 w-5" />
                  <span className="sr-only">X (Twitter)</span>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
