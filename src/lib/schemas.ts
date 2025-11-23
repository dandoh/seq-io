import { z } from 'zod'

/**
 * CDC Configuration Schema
 */
export const cdcConfigSchema = z.object({
  projectName: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Must be lowercase alphanumeric with hyphens'),
  kafka: z.object({
    version: z.string().min(1),
    containerName: z.string().min(1),
    port: z.number().int().min(1024).max(65535),
    clusterId: z.string().min(1),
    dataDir: z.string().min(1),
  }),
  kafkaConnect: z.object({
    version: z.string().min(1),
    containerName: z.string().min(1),
    port: z.number().int().min(1024).max(65535),
    groupId: z.string().min(1),
    topics: z.object({
      config: z.string().min(1),
      offset: z.string().min(1),
      status: z.string().min(1),
    }),
    dataDir: z.string().min(1),
  }),
})

export type CDCConfig = z.infer<typeof cdcConfigSchema>

/**
 * Database Connection Schema
 * Note: connectorName and topicPrefix are derived from the id
 */
export const connectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  dbType: z.enum(['mysql', 'postgres']),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  username: z.string().min(1),
  password: z.string().min(1),
  database: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type Connection = z.infer<typeof connectionSchema>
export type NewConnection = Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Helper functions to derive connector name and topic prefix from connection
 */
export function getConnectorName(connection: Connection): string {
  return connection.id
}

export function getTopicPrefix(connection: Connection): string {
  return connection.id
}

