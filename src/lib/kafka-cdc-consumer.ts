import { Kafka, Consumer, EachMessagePayload } from 'kafkajs'
import { z } from 'zod'

/**
 * Debezium CDC Consumer for Kafka
 *
 * This module provides idiomatic Kafka consumer functionality for Debezium CDC events.
 *
 * Official Debezium Documentation:
 * - Event Structure: https://debezium.io/documentation/reference/stable/tutorial.html
 * - MySQL Connector: https://debezium.io/documentation/reference/stable/connectors/mysql.html
 * - PostgreSQL Connector: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
 * - Configuration: https://debezium.io/documentation/reference/stable/configuration/avro.html
 */

/**
 * Debezium CDC event structure with schema + payload
 *
 * @example Typical Debezium message structure (JSON serialization)
 * ```json
 * // Key message:
 * {
 *   "schema": {
 *     "type": "struct",
 *     "fields": [{"type": "int32", "optional": false, "field": "id"}],
 *     "optional": false,
 *     "name": "dbserver1.mydb.users.Key"
 *   },
 *   "payload": {"id": 123}
 * }
 *
 * // Value message:
 * {
 *   "schema": {
 *     "type": "struct",
 *     "fields": [...],
 *     "optional": false,
 *     "name": "dbserver1.mydb.users.Envelope"
 *   },
 *   "payload": {
 *     "before": null,  // or previous values for UPDATE/DELETE
 *     "after": {"id": 123, "name": "John", "email": "john@example.com"},
 *     "source": {
 *       "version": "2.1.0.Final",
 *       "connector": "mysql",
 *       "name": "dbserver1",
 *       "ts_ms": 1699564800000,
 *       "db": "mydb",
 *       "table": "users",
 *       "server_id": 1,
 *       "file": "mysql-bin.000003",
 *       "pos": 12345,
 *       "row": 0
 *     },
 *     "op": "c",  // 'c'=create, 'u'=update, 'd'=delete, 'r'=read/snapshot
 *     "ts_ms": 1699564800123,
 *     "transaction": null
 *   }
 * }
 * ```
 */
export interface DebeziumSchemaPayload<T = any> {
  schema: {
    type: string
    fields?: Array<{
      type: string
      optional?: boolean
      field: string
    }>
    optional?: boolean
    name?: string
  }
  payload: T
}

// Note: DebeziumValuePayload type is inferred from Zod schema below
// See DebeziumValuePayloadSchema for the source of truth

/**
 * Base CDC event metadata (common to all event types)
 */
interface CDCEventBase {
  topic: string
  partition: number
  offset: string
  timestamp: string
  headers: Record<string, string | Buffer | undefined>
}

/**
 * Successfully parsed CDC data change event matching Debezium schema
 */
export interface CDCEventParsed extends CDCEventBase {
  type: 'parsed'
  key: DebeziumSchemaPayload | null
  value: DebeziumSchemaPayload<DebeziumValuePayload>
}

/**
 * Successfully parsed CDC schema change event (DDL events)
 */
export interface CDCEventSchemaChange extends CDCEventBase {
  type: 'schema-change'
  key: DebeziumSchemaPayload<z.infer<typeof DebeziumSchemaChangeKeyPayloadSchema>>
  value: DebeziumSchemaPayload<DebeziumSchemaChangePayload>
}

/**
 * Unknown/unparsed CDC event (doesn't match expected schema)
 */
export interface CDCEventUnknown extends CDCEventBase {
  type: 'unknown'
  keyRaw: string | null
  valueRaw: string | null
  parseError?: string
}

/**
 * CDC event discriminated union
 * - 'parsed': Successfully validated against Debezium data change schema
 * - 'schema-change': Successfully validated against Debezium schema change schema
 * - 'unknown': Doesn't match expected schema, raw strings provided
 */
export type CDCEvent = CDCEventParsed | CDCEventSchemaChange | CDCEventUnknown

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

/**
 * Zod schema for Debezium source metadata (simplified)
 * Only validates the essential fields that are commonly used
 * Used in both data change events and schema change events
 */
export const DebeziumSourceSchema = z
  .object({
    // Core fields (always present)
    version: z.string(),
    connector: z.string(),
    name: z.string(),
    ts_ms: z.number(),
    db: z.string(),
    table: z.string().optional(), // Optional in schema change events

    // Optional common fields
    snapshot: z.union([z.string(), z.boolean(), z.null()]).optional(),
    schema: z.string().optional(),

    // MySQL binlog position (useful for debugging)
    file: z.string().nullish(),
    pos: z.number().nullish(),

    // PostgreSQL LSN (useful for debugging)
    lsn: z.number().nullish(),

    // Allow any other fields without validation
  })
  .passthrough()

/**
 * Zod schema for Debezium transaction metadata
 */
export const DebeziumTransactionSchema = z
  .object({
    id: z.string(),
    total_order: z.number(),
    data_collection_order: z.number(),
  })
  .nullable()
  .optional()

/**
 * Zod schema for Debezium value payload (data change events)
 * Use this to validate CDC event payloads at runtime
 */
export const DebeziumValuePayloadSchema = z.object({
  before: z.record(z.string(), z.any()).nullable(),
  after: z.record(z.string(), z.any()).nullable(),
  source: DebeziumSourceSchema,
  // Operation type:
  // 'c' = create (insert) - new row added
  // 'u' = update - existing row modified
  // 'd' = delete - row removed
  // 'r' = read - initial snapshot read
  // 't' = truncate - table truncated
  op: z.enum(['c', 'u', 'd', 'r', 't']),
  ts_ms: z.number(),
  transaction: DebeziumTransactionSchema,
})

/**
 * Zod schema for individual table change in Debezium schema change events
 */
export const DebeziumTableChangeSchema = z.object({
  type: z.enum(['CREATE', 'ALTER', 'DROP']),
  id: z.string(), // e.g., "\"nhan_starter_dev\".\"test_cdc13\""
  table: z.any().optional(), // Complex nested structure with columns, etc.
})

/**
 * Zod schema for Debezium schema change payload
 * Used when Debezium captures DDL events (CREATE TABLE, ALTER TABLE, etc.)
 * Reuses DebeziumSourceSchema since the source structure is the same
 */
export const DebeziumSchemaChangePayloadSchema = z.object({
  source: DebeziumSourceSchema,
  ts_ms: z.number(),
  databaseName: z.string().nullable().optional(),
  schemaName: z.string().nullable().optional(),
  ddl: z.string().nullable().optional(),
  tableChanges: z.array(DebeziumTableChangeSchema).optional(),
})

/**
 * Zod schema for Debezium schema metadata
 * Note: We don't actually validate the schema structure since it's not used,
 * and it can be complex with nested structs
 */
export const DebeziumSchemaMetadataSchema = z.any()

/**
 * Zod schema for complete Debezium message (schema + payload)
 *
 * @example
 * ```typescript
 * const valueSchema = DebeziumSchemaPayloadSchema(DebeziumValuePayloadSchema)
 * const parsed = valueSchema.parse(JSON.parse(message))
 * ```
 */
export function DebeziumSchemaPayloadSchema<T extends z.ZodTypeAny>(
  payloadSchema: T,
) {
  return z.object({
    schema: DebeziumSchemaMetadataSchema,
    payload: payloadSchema,
  })
}

/**
 * Complete Debezium value message schema (schema + value payload)
 */
export const DebeziumValueMessageSchema = DebeziumSchemaPayloadSchema(
  DebeziumValuePayloadSchema,
)

/**
 * Complete Debezium schema change value message schema
 */
export const DebeziumSchemaChangeValueMessageSchema = DebeziumSchemaPayloadSchema(
  DebeziumSchemaChangePayloadSchema,
)

export const DebeziumKeyPayloadSchema = z.any()

export const DebeziumKeyMessageSchema = DebeziumSchemaPayloadSchema(
  DebeziumKeyPayloadSchema,
)

/**
 * Schema change key payload (contains databaseName)
 */
export const DebeziumSchemaChangeKeyPayloadSchema = z.any()

export const DebeziumSchemaChangeKeyMessageSchema = DebeziumSchemaPayloadSchema(
  DebeziumSchemaChangeKeyPayloadSchema,
)

/**
 * Union schemas for parsing either data change OR schema change messages
 * This allows us to parse both message types with a single safeParse call
 */
export const DebeziumKeyUnionSchema = z.union([
  DebeziumKeyMessageSchema,
  DebeziumSchemaChangeKeyMessageSchema,
])

export const DebeziumValueUnionSchema = z.union([
  DebeziumValueMessageSchema,
  DebeziumSchemaChangeValueMessageSchema,
])

/**
 * Infer TypeScript types from Zod schemas (single source of truth)
 *
 * Based on official Debezium documentation:
 * - Event Structure: https://debezium.io/documentation/reference/stable/tutorial.html
 * - MySQL Connector: https://debezium.io/documentation/reference/stable/connectors/mysql.html
 */
export type DebeziumValuePayload = z.infer<typeof DebeziumValuePayloadSchema>
export type DebeziumSchemaChangePayload = z.infer<typeof DebeziumSchemaChangePayloadSchema>
export type DebeziumSource = z.infer<typeof DebeziumSourceSchema>
export type DebeziumTransaction = z.infer<typeof DebeziumTransactionSchema>

export interface CDCConsumerOptions {
  broker?: string
  groupId?: string
  fromBeginning?: boolean
  topicPattern?: RegExp
}

export interface CDCConsumer {
  disconnect: () => Promise<void>
}

/**
 * Helper function to parse Debezium JSON message
 *
 * @param message Raw JSON string from Kafka message
 * @param validate If true, validates the message against Zod schema (default: false)
 * @returns Parsed Debezium message with schema + payload, or null if parsing/validation fails
 *
 * @remarks
 * Note: The schema can be excluded from messages by setting:
 * - `key.converter.schemas.enable=false`
 * - `value.converter.schemas.enable=false`
 *
 * In this case, the message will only contain the payload without the schema field.
 * See: https://debezium.io/documentation/reference/stable/configuration/avro.html
 *
 * @example
 * ```typescript
 * // Parse without validation (faster, no type guarantees)
 * const parsed = parseDebeziumMessage(rawMessage)
 *
 * // Parse with validation (safer, ensures correct structure)
 * const validated = parseDebeziumMessage(rawMessage, true)
 * ```
 */
export function parseDebeziumMessage<T = any>(
  message: string | null,
): DebeziumSchemaPayload<T> | null {
  if (!message) return null
  try {
    const parsed = JSON.parse(message)

    // Validate against Zod schema
    const result = DebeziumValueMessageSchema.safeParse(parsed)
    if (!result.success) {
      console.error(
        'Debezium message validation failed:',
        result.error.format(),
      )
      return null
    }
    return result.data as DebeziumSchemaPayload<T>
  } catch (error) {
    console.error('Failed to parse Debezium message:', error)
    return null
  }
}

/**
 * Parse and validate Debezium value message with full type safety
 *
 * @param message Raw JSON string from Kafka message
 * @returns Validated Debezium message or null if validation fails
 *
 * @example
 * ```typescript
 * const validated = parseDebeziumValueMessage(rawMessage)
 * if (validated) {
 *   // TypeScript knows the exact structure now
 *   console.log(validated.payload.op)  // 'c' | 'u' | 'd' | 'r' | 't'
 *   console.log(validated.payload.after)  // Record<string, any> | null
 * }
 * ```
 */
export function parseDebeziumValueMessage(
  message: string | null,
): DebeziumSchemaPayload<DebeziumValuePayload> | null {
  if (!message) return null
  try {
    const parsed = JSON.parse(message)
    const result = DebeziumValueMessageSchema.safeParse(parsed)

    if (!result.success) {
      console.error(
        'Debezium value message validation failed:',
        result.error.format(),
      )
      return null
    }

    return result.data
  } catch (error) {
    console.error('Failed to parse Debezium value message:', error)
    return null
  }
}

/**
 * Helper to extract just the payload from a Debezium message
 */
export function extractPayload<T = any>(
  message: DebeziumSchemaPayload<T> | null,
): T | null {
  return message?.payload ?? null
}

/**
 * Parses headers from Kafka message into a Record
 */
function parseHeaders(
  headers?: EachMessagePayload['message']['headers'],
): Record<string, string | Buffer | undefined> {
  const result: Record<string, string | Buffer | undefined> = {}

  if (!headers) return result

  for (const [key, value] of Object.entries(headers)) {
    if (!value) {
      result[key] = undefined
    } else if (Array.isArray(value)) {
      // Convert array to comma-separated string
      result[key] = value
        .map((v) => (Buffer.isBuffer(v) ? v.toString() : String(v)))
        .join(',')
    } else if (Buffer.isBuffer(value)) {
      result[key] = value.toString()
    } else {
      result[key] = String(value)
    }
  }

  return result
}

/**
 * Creates a CDC consumer with automatic parsing and type discrimination
 *
 * The consumer automatically parses and validates CDC events:
 * - If the event matches Debezium data change schema: returns CDCEventParsed (type: 'parsed')
 * - If the event matches Debezium schema change schema: returns CDCEventSchemaChange (type: 'schema-change')
 * - If the event doesn't match either: returns CDCEventUnknown (type: 'unknown')
 *
 * @param onMessage Callback function called for each CDC event
 * @param options Configuration options for the Kafka consumer
 * @returns Promise resolving to a CDCConsumer instance with disconnect method
 *
 * @example
 * ```typescript
 * const consumer = await createCDCConsumer(async (event) => {
 *   if (event.type === 'parsed') {
 *     // Data change event (INSERT, UPDATE, DELETE)
 *     console.log('Operation:', event.value.payload.op)
 *     console.log('Table:', event.value.payload.source.table)
 *     console.log('After:', event.value.payload.after)
 *   } else if (event.type === 'schema-change') {
 *     // Schema change event (DDL)
 *     console.log('Database:', event.value.payload.databaseName)
 *     console.log('DDL:', event.value.payload.ddl)
 *     console.log('Table changes:', event.value.payload.tableChanges)
 *   } else {
 *     // Unknown event
 *     console.log('Unknown event:', event.valueRaw)
 *     console.log('Parse error:', event.parseError)
 *   }
 * }, { broker: 'localhost:9092', groupId: 'my-consumer' })
 *
 * // Later, to disconnect:
 * await consumer.disconnect()
 * ```
 */
export async function createCDCConsumer(
  onMessage: (event: CDCEvent) => void | Promise<void>,
  options: CDCConsumerOptions = {},
): Promise<CDCConsumer> {
  const {
    broker = 'localhost:9092',
    groupId = 'cdc-consumer',
    fromBeginning = false,
    // Match schema changes (dbserver1) and all table changes (dbserver1.all-changes)
    topicPattern = /^dbserver1($|\.all-changes$)/,
  } = options

  const kafka = new Kafka({
    clientId: 'cdc-client',
    brokers: [broker],
  })

  const consumer: Consumer = kafka.consumer({
    groupId,
  })

  await consumer.connect()

  await consumer.subscribe({
    topic: topicPattern,
    fromBeginning,
  })

  // Start consuming messages
  await consumer.run({
    eachMessage: async (payload: EachMessagePayload) => {
      // console.log('payload', payload)
      const keyRaw = payload.message.key?.toString() || null
      const valueRaw = payload.message.value?.toString() || null
      const headers = parseHeaders(payload.message.headers)

      const baseEvent = {
        topic: payload.topic,
        partition: payload.partition,
        offset: payload.message.offset,
        timestamp: payload.message.timestamp,
        headers,
      }

      // Try to parse as Debezium CDC event
      try {
        if (!valueRaw) {
          throw new Error('Empty value')
        }
        if (!keyRaw) {
          throw new Error('Empty key')
        }

        const parsedValue = JSON.parse(valueRaw)
        const parsedKey = JSON.parse(keyRaw)

        // Use union schemas to parse both formats at once
        const valueResult = DebeziumValueUnionSchema.safeParse(parsedValue)
        const keyResult = DebeziumKeyUnionSchema.safeParse(parsedKey)

        if (valueResult.success && keyResult.success) {
          // Discriminate event type based on payload structure
          const value = valueResult.data
          const key = keyResult.data

          // Check if it's a schema change event by presence of 'ddl' or 'databaseName' in key
          if ('databaseName' in key.payload && typeof key.payload.databaseName === 'string') {
            // Schema change event
            const event: CDCEventSchemaChange = {
              type: 'schema-change',
              ...baseEvent,
              key: key as z.infer<typeof DebeziumSchemaChangeKeyMessageSchema>,
              value: value as z.infer<typeof DebeziumSchemaChangeValueMessageSchema>,
            }
            await onMessage(event)
          } else if ('op' in value.payload) {
            // Data change event
            const event: CDCEventParsed = {
              type: 'parsed',
              ...baseEvent,
              key,
              value: value as z.infer<typeof DebeziumValueMessageSchema>,
            }
            await onMessage(event)
          } else {
            // Unexpected format
            throw new Error('Unknown message format')
          }
        } else {
          // Validation failed - return unknown event
          const event: CDCEventUnknown = {
            type: 'unknown',
            ...baseEvent,
            keyRaw,
            valueRaw,
            parseError: `Validation failed: ${valueResult.error?.message || ''} ${keyResult.error?.message || ''}`,
          }


          // await onMessage(event)
        }
      } catch (error) {
        // Parse error - return unknown event
        const event: CDCEventUnknown = {
          type: 'unknown',
          ...baseEvent,
          keyRaw,
          valueRaw,
          parseError: error instanceof Error ? error.message : String(error),
        }

        // await onMessage(event)
      }
    },
  })

  return {
    disconnect: async () => {
      await consumer.disconnect()
    },
  }
}
