/**
 * Database Handler Factory
 * Returns the appropriate handler based on database type
 */

import type { DatabaseHandler } from './types'
import { MySQLHandler } from './mysql-handler'
import { PostgreSQLHandler } from './postgres-handler'

/**
 * Get the appropriate database handler for the given database type
 * @param dbType The database type (mysql, postgresql, etc.)
 * @returns DatabaseHandler instance
 * @throws Error if database type is not supported
 */
export function getDatabaseHandler(dbType: string): DatabaseHandler {
  switch (dbType.toLowerCase()) {
    case 'mysql':
      return new MySQLHandler()
    case 'postgresql':
    case 'postgres':
      return new PostgreSQLHandler()
    // Future database handlers can be added here:
    // case 'mongodb':
    //   return new MongoDBHandler()
    default:
      throw new Error(`Unsupported database type: ${dbType}`)
  }
}

// Re-export types for convenience
export type { DatabaseHandler, ConnectionConfig, ValidationResult, ValidationReport } from './types'

