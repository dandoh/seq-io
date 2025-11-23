/**
 * PostgreSQL Database Handler
 * Handles validation, fixing, and Debezium configuration for PostgreSQL databases
 */

import { Client } from 'pg'
import type { Connection } from '../schemas'
import type { DatabaseHandler, ConnectionConfig, ValidationResult, ValidationReport } from './types'

export class PostgreSQLHandler implements DatabaseHandler {
  /**
   * Check if WAL level is set to logical
   */
  private async checkWalLevel(client: Client): Promise<ValidationResult> {
    try {
      const result = await client.query("SHOW wal_level")
      const walLevel = result.rows[0]?.wal_level
      
      if (walLevel !== 'logical') {
        return {
          step: 'WAL Level',
          status: 'error',
          message: `WAL level is ${walLevel}, must be logical`,
          details: 'Run: ALTER SYSTEM SET wal_level = \'logical\'; then restart PostgreSQL'
        }
      }
      
      return {
        step: 'WAL Level',
        status: 'success',
        message: 'WAL level is logical ✓'
      }
    } catch (error) {
      return {
        step: 'WAL Level',
        status: 'error',
        message: 'Failed to check WAL level',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Check if max_wal_senders is sufficient
   */
  private async checkMaxWalSenders(client: Client): Promise<ValidationResult> {
    try {
      const result = await client.query("SHOW max_wal_senders")
      const maxWalSenders = parseInt(result.rows[0]?.max_wal_senders || '0')
      
      if (maxWalSenders < 1) {
        return {
          step: 'Max WAL Senders',
          status: 'error',
          message: `max_wal_senders is ${maxWalSenders}, must be at least 1`,
          details: 'Run: ALTER SYSTEM SET max_wal_senders = 10; then restart PostgreSQL'
        }
      }
      
      return {
        step: 'Max WAL Senders',
        status: 'success',
        message: `Max WAL senders is ${maxWalSenders} ✓`
      }
    } catch (error) {
      return {
        step: 'Max WAL Senders',
        status: 'error',
        message: 'Failed to check max_wal_senders',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Check if max_replication_slots is sufficient
   */
  private async checkMaxReplicationSlots(client: Client): Promise<ValidationResult> {
    try {
      const result = await client.query("SHOW max_replication_slots")
      const maxReplicationSlots = parseInt(result.rows[0]?.max_replication_slots || '0')
      
      if (maxReplicationSlots < 1) {
        return {
          step: 'Max Replication Slots',
          status: 'error',
          message: `max_replication_slots is ${maxReplicationSlots}, must be at least 1`,
          details: 'Run: ALTER SYSTEM SET max_replication_slots = 10; then restart PostgreSQL'
        }
      }
      
      return {
        step: 'Max Replication Slots',
        status: 'success',
        message: `Max replication slots is ${maxReplicationSlots} ✓`
      }
    } catch (error) {
      return {
        step: 'Max Replication Slots',
        status: 'error',
        message: 'Failed to check max_replication_slots',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Check user has superuser privileges (required for CDC setup)
   */
  private async checkUserPermissions(client: Client, username: string): Promise<ValidationResult> {
    try {
      const result = await client.query(
        `SELECT rolsuper FROM pg_roles WHERE rolname = $1`,
        [username]
      )
      
      if (result.rows.length === 0) {
        return {
          step: 'User Permissions',
          status: 'error',
          message: `User '${username}' not found`,
          details: 'Ensure the user exists in PostgreSQL'
        }
      }
      
      const isSuperuser = result.rows[0].rolsuper
      
      if (!isSuperuser) {
        return {
          step: 'User Permissions',
          status: 'error',
          message: `User '${username}' must be a SUPERUSER for CDC setup`,
          details: `Use 'postgres' user or another SUPERUSER account. SUPERUSER automatically includes REPLICATION privileges.`
        }
      }
      
      return {
        step: 'User Permissions',
        status: 'success',
        message: 'User is SUPERUSER (has all privileges including REPLICATION) ✓'
      }
    } catch (error) {
      return {
        step: 'User Permissions',
        status: 'error',
        message: 'Failed to check user permissions',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }



  /**
   * Attempt to set WAL level to logical
   */
  private async fixWalLevel(client: Client): Promise<ValidationResult> {
    try {
      await client.query("ALTER SYSTEM SET wal_level = 'logical'")
      return {
        step: 'Fix WAL Level',
        status: 'warning',
        message: 'Set wal_level to logical - RESTART REQUIRED',
        details: 'PostgreSQL must be restarted for this change to take effect'
      }
    } catch (error) {
      return {
        step: 'Fix WAL Level',
        status: 'error',
        message: 'Failed to set wal_level',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Attempt to set max_wal_senders
   */
  private async fixMaxWalSenders(client: Client): Promise<ValidationResult> {
    try {
      await client.query("ALTER SYSTEM SET max_wal_senders = 10")
      return {
        step: 'Fix Max WAL Senders',
        status: 'warning',
        message: 'Set max_wal_senders to 10 - RESTART REQUIRED',
        details: 'PostgreSQL must be restarted for this change to take effect'
      }
    } catch (error) {
      return {
        step: 'Fix Max WAL Senders',
        status: 'error',
        message: 'Failed to set max_wal_senders',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Attempt to set max_replication_slots
   */
  private async fixMaxReplicationSlots(client: Client): Promise<ValidationResult> {
    try {
      await client.query("ALTER SYSTEM SET max_replication_slots = 10")
      return {
        step: 'Fix Max Replication Slots',
        status: 'warning',
        message: 'Set max_replication_slots to 10 - RESTART REQUIRED',
        details: 'PostgreSQL must be restarted for this change to take effect'
      }
    } catch (error) {
      return {
        step: 'Fix Max Replication Slots',
        status: 'error',
        message: 'Failed to set max_replication_slots',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }


  /**
   * Prepare PostgreSQL database for CDC connector
   * Sets REPLICA IDENTITY FULL on all user tables
   */
  async prepareForConnector(config: ConnectionConfig): Promise<void> {
    let client: Client | null = null
    
    try {
      client = new Client({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
      })
      
      await client.connect()
      
      // Select all user tables from the current database (excluding system schemas)
      const result = await client.query(`
        SELECT t.schemaname, t.tablename 
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND t.schemaname NOT IN ('pg_catalog', 'information_schema')
      `)
      
      if (result.rows.length === 0) {
        console.log('⚠️  No user tables found to set REPLICA IDENTITY')
        return
      }
      
      console.log(`📋 Setting REPLICA IDENTITY FULL on ${result.rows.length} table(s)...`)
      
      for (const row of result.rows) {
        const qualifiedName = `"${row.schemaname}"."${row.tablename}"`
        const displayName = `${row.schemaname}.${row.tablename}`
        
        try {
          await client.query(`ALTER TABLE ${qualifiedName} REPLICA IDENTITY FULL`)
          console.log(`  ✓ ${displayName}`)
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          console.error(`  ✗ ${displayName}: ${errMsg}`)
          // Don't throw, continue with other tables
        }
      }
      
      console.log('✅ REPLICA IDENTITY setup complete')
    } finally {
      if (client) {
        await client.end()
      }
    }
  }

  /**
   * Validate PostgreSQL configuration for Debezium
   */
  async validate(config: ConnectionConfig): Promise<ValidationReport> {
    let client: Client | null = null
    const results: ValidationResult[] = []
    
    try {
      // Test connection
      results.push({
        step: 'Database Connection',
        status: 'success',
        message: 'Attempting to connect...'
      })
      
      client = new Client({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
      })
      
      await client.connect()
      
      results[0] = {
        step: 'Database Connection',
        status: 'success',
        message: 'Successfully connected to PostgreSQL ✓'
      }
      
      // Check WAL level
      const walLevelResult = await this.checkWalLevel(client)
      results.push(walLevelResult)
      
      // Check max_wal_senders
      const walSendersResult = await this.checkMaxWalSenders(client)
      results.push(walSendersResult)
      
      // Check max_replication_slots
      const replicationSlotsResult = await this.checkMaxReplicationSlots(client)
      results.push(replicationSlotsResult)
      
      // Check user permissions
      const permissionsResult = await this.checkUserPermissions(client, config.username)
      results.push(permissionsResult)
      
      // Note: REPLICA IDENTITY will be set automatically when creating connector
      
      // Determine if PostgreSQL is ready
      const hasErrors = results.some(r => r.status === 'error')
      
      return {
        isReady: !hasErrors,
        results
      }
    } catch (error) {
      results[0] = {
        step: 'Database Connection',
        status: 'error',
        message: 'Failed to connect to PostgreSQL',
        details: error instanceof Error ? error.message : String(error)
      }
      
      return {
        isReady: false,
        results
      }
    } finally {
      if (client) {
        await client.end()
      }
    }
  }

  /**
   * Validate and attempt to fix PostgreSQL configuration
   */
  async fix(config: ConnectionConfig): Promise<ValidationReport> {
    let client: Client | null = null
    const results: ValidationResult[] = []
    let needsRestart = false
    
    try {
      // Test connection
      results.push({
        step: 'Database Connection',
        status: 'success',
        message: 'Attempting to connect...'
      })
      
      client = new Client({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
      })
      
      await client.connect()
      
      results[0] = {
        step: 'Database Connection',
        status: 'success',
        message: 'Successfully connected to PostgreSQL ✓'
      }
      
      // Check and fix WAL level
      const walLevelResult = await this.checkWalLevel(client)
      results.push(walLevelResult)
      
      if (walLevelResult.status === 'error') {
        const fixResult = await this.fixWalLevel(client)
        results.push(fixResult)
        if (fixResult.status === 'warning') needsRestart = true
      }
      
      // Check and fix max_wal_senders
      const walSendersResult = await this.checkMaxWalSenders(client)
      results.push(walSendersResult)
      
      if (walSendersResult.status === 'error') {
        const fixResult = await this.fixMaxWalSenders(client)
        results.push(fixResult)
        if (fixResult.status === 'warning') needsRestart = true
      }
      
      // Check and fix max_replication_slots
      const replicationSlotsResult = await this.checkMaxReplicationSlots(client)
      results.push(replicationSlotsResult)
      
      if (replicationSlotsResult.status === 'error') {
        const fixResult = await this.fixMaxReplicationSlots(client)
        results.push(fixResult)
        if (fixResult.status === 'warning') needsRestart = true
      }
      
      // Check user permissions (cannot be auto-fixed - must use SUPERUSER)
      const permissionsResult = await this.checkUserPermissions(client, config.username)
      results.push(permissionsResult)
      
      // Add restart warning if needed
      if (needsRestart) {
        results.push({
          step: 'Restart Required',
          status: 'warning',
          message: '⚠️  PostgreSQL restart required for configuration changes',
          details: 'Some settings require a server restart to take effect'
        })
      }
      
      // Wait a moment for changes to settle
      if (results.some(r => r.status === 'success' && r.step.startsWith('Fix'))) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      
      // Final validation check
      const finalPermissions = await this.checkUserPermissions(client, config.username)
      
      // Consider it ready if no errors
      const hasBlockingErrors = finalPermissions.status === 'error'
      
      return {
        isReady: !hasBlockingErrors,
        results
      }
    } catch (error) {
      if (results.length === 0 || results[0].step === 'Database Connection') {
        results[0] = {
          step: 'Database Connection',
          status: 'error',
          message: 'Failed to connect to PostgreSQL',
          details: error instanceof Error ? error.message : String(error)
        }
      } else {
        results.push({
          step: 'Validation',
          status: 'error',
          message: 'Unexpected error during validation',
          details: error instanceof Error ? error.message : String(error)
        })
      }
      
      return {
        isReady: false,
        results
      }
    } finally {
      if (client) {
        await client.end()
      }
    }
  }

  /**
   * Generate Debezium connector configuration for PostgreSQL
   */
  async getDebeziumConfig(connector: Connection): Promise<any> {
    // Translate localhost for Docker containers
    let dbHostname = connector.host
    
    if (connector.host === 'localhost' || connector.host === '127.0.0.1') {
      dbHostname = 'host.docker.internal'
      console.log(`⚠️  Converting ${connector.host} to ${dbHostname} for Docker networking`)
      console.log(`   If connection fails, your PostgreSQL may need to listen on 0.0.0.0 instead of 127.0.0.1`)
    }

    return {
      'connector.class': 'io.debezium.connector.postgresql.PostgresConnector',
      'tasks.max': '1',
      'database.hostname': dbHostname,
      'database.port': connector.port.toString(),
      'database.user': connector.username,
      'database.password': connector.password,
      'database.dbname': connector.database,
      'database.server.name': connector.database,
      'plugin.name': 'pgoutput',
      'publication.autocreate.mode': 'filtered',
      'schema.exclude.list': 'pg_catalog,information_schema',
      'slot.name': `debezium_${connector.database}`,
      
      // Data type handling - convert decimals to numbers
      'decimal.handling.mode': 'double',
      'time.precision.mode': 'adaptive_time_microseconds',
    }
  }
}

