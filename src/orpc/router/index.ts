// Example router - replace with your own routes
import { os, withEventMeta } from '@orpc/server'
import { createCDCConsumer, type CDCEvent } from '@/lib/kafka-cdc-consumer'
import {
  getInfrastructureStatus,
  startInfrastructure,
  stopInfrastructure,
  restartInfrastructure,
  loadConfig,
  updateConfig,
  saveConfigAndRestart,
  listConnectors,
  getConnector,
  saveConnector,
  deleteConnector,
} from '@/lib/infrastructure'
import { cdcConfigSchema, connectionSchema } from '@/lib/schemas'
import { getDatabaseHandler } from '@/lib/handlers'
import { z } from 'zod'

// SSE Stream endpoint - streams CDC events from Kafka
export const stream = os
  .input(z.object({ 
    topicPrefix: z.string()
  }))
  .handler(async function* ({ input }) {
    let eventCount = 0
    let consumer: Awaited<ReturnType<typeof createCDCConsumer>> | null = null

    try {
      // Determine broker based on environment
      // When running in Docker, use service name; otherwise localhost
      const broker =
        process.env.KAFKA_BROKER || 'localhost:9092'

      // Build topic pattern based on topicPrefix
      const topicPrefix = input.topicPrefix
      const topicPattern = new RegExp(`^${topicPrefix}($|\\.all-changes$)`)

      console.log(
        `Starting CDC stream (broker: ${broker}, topic pattern: ${topicPattern})`
      )

      // Create unique consumer group per user session
      const groupId = `cdc-stream-${Date.now()}`

      // Queue for buffering messages between Kafka callback and generator
      const messageQueue: CDCEvent[] = []
      let messageResolver: ((value: CDCEvent | null) => void) | null = null
      let streamError: Error | null = null

      // Create consumer with callback
      consumer = await createCDCConsumer(
        async (event) => {
          // If there's a waiting resolver, resolve it immediately
          if (messageResolver) {
            messageResolver(event)
            messageResolver = null
          } else {
            // Otherwise, queue the message
            messageQueue.push(event)
          }
        },
        {
          broker,
          groupId,
          fromBeginning: false,
          topicPattern,
        }
      )

      // Yield messages as they arrive
      while (true) {
        // Check for errors
        if (streamError) {
          throw streamError
        }

        // Yield queued messages first
        if (messageQueue.length > 0) {
          const event = messageQueue.shift()!
          eventCount++

          // Yield event with metadata for resume support
          yield withEventMeta(event, {
            id: `cdc-event-${eventCount}-${event.offset}`,
          })
          continue
        }

        // Wait for next message with a timeout to allow generator to be cancelled
        const message = await Promise.race<CDCEvent | null>([
          new Promise<CDCEvent | null>((resolve) => {
            messageResolver = resolve
          }),
          new Promise<null>((resolve) => {
            setTimeout(() => {
              if (messageResolver) {
                messageResolver(null)
                messageResolver = null
              }
              resolve(null)
            }, 100)
          }),
        ])

        if (message) {
          eventCount++

          // Yield event with metadata for resume support
          yield withEventMeta(message, {
            id: `cdc-event-${eventCount}-${message.offset}`,
          })
        }
      }
    } catch (error) {
      throw error
    } finally {
      // Clean up consumer
      if (consumer) {
        await consumer.disconnect()
      }
    }
  })

// Infrastructure status check
export const infrastructureStatus = os.handler(async () => {
  const status = await getInfrastructureStatus()
  return status
})

// Start CDC infrastructure
export const infrastructureStart = os.handler(async () => {
  await startInfrastructure()
  return { success: true, message: 'Infrastructure started successfully' }
})

// Stop CDC infrastructure
export const infrastructureStop = os.handler(async () => {
  stopInfrastructure()
  return { success: true, message: 'Infrastructure stopped successfully' }
})

// Restart CDC infrastructure
export const infrastructureRestart = os.handler(async () => {
  await restartInfrastructure()
  return { success: true, message: 'Infrastructure restarted successfully' }
})

// Get CDC configuration
export const getConfig = os.handler(() => {
  const config = loadConfig()
  return config
})

// Update CDC configuration (without restart)
export const setConfig = os
  .input(cdcConfigSchema)
  .handler(({ input }) => {
    updateConfig(input)
    return { success: true, message: 'Configuration updated successfully' }
  })

// Save configuration and restart infrastructure
// Handles project name changes properly
export const saveConfigAndRestartInfra = os
  .input(cdcConfigSchema)
  .handler(async ({ input }) => {
    await saveConfigAndRestart(input)
    return { success: true, message: 'Configuration saved and infrastructure restarted' }
  })

// List all connectors
export const listAllConnectors = os.handler(() => {
  try {
    const connectors = listConnectors()
    return connectors
  } catch (error) {
    console.error('❌ Error in listAllConnectors:', error)
    throw error
  }
})

// Get a single connector
export const getConnectorById = os
  .input(z.object({ id: z.string() }))
  .handler(({ input }) => {
    const connector = getConnector(input.id)
    return connector
  })

// Create/Update a connector
export const saveConnectorData = os
  .input(connectionSchema)
  .handler(async ({ input }) => {
    // Prepare database for CDC connector (e.g., set REPLICA IDENTITY for PostgreSQL)
    console.log(`🔧 Preparing ${input.dbType} database for CDC...`)
    const handler = getDatabaseHandler(input.dbType)
    
    try {
      await handler.prepareForConnector({
        host: input.host,
        port: input.port,
        username: input.username,
        password: input.password,
        database: input.database,
      })
    } catch (error) {
      console.error('⚠️  Failed to prepare database for connector:', error)
      // Continue anyway - preparation might not always be necessary
    }
    
    const connector = await saveConnector(input)
    return connector
  })

// Delete a connector
export const deleteConnectorById = os
  .input(z.object({ id: z.string() }))
  .handler(async ({ input }) => {
    await deleteConnector(input.id)
    return { success: true, message: 'Connector deleted successfully' }
  })

// Validate database configuration for Debezium (generic for all database types)
export const validateConnection = os
  .input(z.object({
    dbType: z.string(),
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
    username: z.string().min(1),
    password: z.string().min(1),
    database: z.string().min(1),
  }))
  .handler(async ({ input }) => {
    const handler = getDatabaseHandler(input.dbType)
    const report = await handler.validate({
      host: input.host,
      port: input.port,
      username: input.username,
      password: input.password,
      database: input.database,
    })
    return report
  })

// Validate and attempt to fix database configuration (generic for all database types)
export const fixConnectionConfig = os
  .input(z.object({
    dbType: z.string(),
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
    username: z.string().min(1),
    password: z.string().min(1),
    database: z.string().min(1),
  }))
  .handler(async ({ input }) => {
    const handler = getDatabaseHandler(input.dbType)
    const report = await handler.fix({
      host: input.host,
      port: input.port,
      username: input.username,
      password: input.password,
      database: input.database,
    })
    return report
  })

export default {
  stream,
  infrastructureStatus,
  infrastructureStart,
  infrastructureStop,
  infrastructureRestart,
  getConfig,
  setConfig,
  saveConfigAndRestartInfra,
  listAllConnectors,
  getConnectorById,
  saveConnectorData,
  deleteConnectorById,
  validateConnection,
  fixConnectionConfig,
}
