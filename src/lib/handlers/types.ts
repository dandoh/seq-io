/**
 * Generic types for database handler abstraction
 */

import type { Connection } from '../schemas'

/**
 * Result of a single validation step
 */
export interface ValidationResult {
  step: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: string
}

/**
 * Complete validation report
 */
export interface ValidationReport {
  isReady: boolean
  results: ValidationResult[]
}

/**
 * Connection configuration for validation
 */
export interface ConnectionConfig {
  host: string
  port: number
  username: string
  password: string
  database: string
}

/**
 * Generic database handler interface
 * Each database type (MySQL, PostgreSQL, etc.) implements this interface
 */
export interface DatabaseHandler {
  /**
   * Validate database configuration for CDC
   */
  validate(config: ConnectionConfig): Promise<ValidationReport>

  /**
   * Attempt to fix database configuration issues
   */
  fix(config: ConnectionConfig): Promise<ValidationReport>

  /**
   * Prepare database for CDC connector (e.g., set REPLICA IDENTITY for PostgreSQL)
   * Called automatically before creating the connector
   */
  prepareForConnector(config: ConnectionConfig): Promise<void>

  /**
   * Generate Debezium connector configuration for this database type
   */
  getDebeziumConfig(connector: Connection): Promise<any>
}

