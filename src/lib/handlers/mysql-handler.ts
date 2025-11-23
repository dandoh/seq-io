/**
 * MySQL Database Handler
 * Handles validation, fixing, and Debezium configuration for MySQL databases
 */

import * as mysql from 'mysql2/promise'
import type { Connection } from '../schemas'
import type { DatabaseHandler, ConnectionConfig, ValidationResult, ValidationReport } from './types'

export class MySQLHandler implements DatabaseHandler {
  /**
   * Check if MySQL binlog format is set to ROW
   */
  private async checkBinlogFormat(connection: mysql.Connection): Promise<ValidationResult> {
    try {
      const [rows] = await connection.query<mysql.RowDataPacket[]>(
        "SHOW VARIABLES LIKE 'binlog_format'"
      )
      
      if (rows.length === 0) {
        return {
          step: 'Binlog Format',
          status: 'error',
          message: 'Binary logging is not enabled',
          details: 'MySQL must have binary logging enabled for CDC'
        }
      }
      
      const value = rows[0].Value
      if (value !== 'ROW') {
        return {
          step: 'Binlog Format',
          status: 'error',
          message: `Binlog format is ${value}, must be ROW`,
          details: 'Run: SET GLOBAL binlog_format = \'ROW\';'
        }
      }
      
      return {
        step: 'Binlog Format',
        status: 'success',
        message: 'Binlog format is ROW ✓'
      }
    } catch (error) {
      return {
        step: 'Binlog Format',
        status: 'error',
        message: 'Failed to check binlog format',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Check if binlog_row_image is set to FULL
   */
  private async checkBinlogRowImage(connection: mysql.Connection): Promise<ValidationResult> {
    try {
      const [rows] = await connection.query<mysql.RowDataPacket[]>(
        "SHOW VARIABLES LIKE 'binlog_row_image'"
      )
      
      if (rows.length === 0) {
        return {
          step: 'Binlog Row Image',
          status: 'warning',
          message: 'binlog_row_image not found (may not be supported)',
          details: 'This is optional but recommended'
        }
      }
      
      const value = rows[0].Value
      if (value !== 'FULL') {
        return {
          step: 'Binlog Row Image',
          status: 'error',
          message: `Binlog row image is ${value}, should be FULL`,
          details: 'Run: SET GLOBAL binlog_row_image = \'FULL\';'
        }
      }
      
      return {
        step: 'Binlog Row Image',
        status: 'success',
        message: 'Binlog row image is FULL ✓'
      }
    } catch (error) {
      return {
        step: 'Binlog Row Image',
        status: 'error',
        message: 'Failed to check binlog row image',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Check user permissions for Debezium
   */
  private async checkUserPermissions(
    connection: mysql.Connection, 
    username: string
  ): Promise<ValidationResult> {
    try {
      const [rows] = await connection.query<mysql.RowDataPacket[]>(
        'SHOW GRANTS FOR CURRENT_USER()'
      )
      
      const grants = rows.map(row => Object.values(row)[0] as string).join(' ')
      
      const requiredPermissions = [
        'SELECT',
        'RELOAD',
        'SHOW DATABASES',
        'REPLICATION SLAVE',
        'REPLICATION CLIENT'
      ]
      
      const missingPermissions = requiredPermissions.filter(
        perm => !grants.toUpperCase().includes(perm)
      )
      
      if (missingPermissions.length > 0) {
        return {
          step: 'User Permissions',
          status: 'error',
          message: `Missing permissions: ${missingPermissions.join(', ')}`,
          details: `Run: GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO '${username}'@'%'; FLUSH PRIVILEGES;`
        }
      }
      
      return {
        step: 'User Permissions',
        status: 'success',
        message: 'User has all required permissions ✓'
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
   * Attempt to fix binlog format
   */
  private async fixBinlogFormat(connection: mysql.Connection): Promise<ValidationResult> {
    try {
      await connection.query("SET GLOBAL binlog_format = 'ROW'")
      return {
        step: 'Fix Binlog Format',
        status: 'success',
        message: 'Successfully set binlog_format to ROW ✓'
      }
    } catch (error) {
      return {
        step: 'Fix Binlog Format',
        status: 'error',
        message: 'Failed to set binlog format',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Attempt to fix binlog row image
   */
  private async fixBinlogRowImage(connection: mysql.Connection): Promise<ValidationResult> {
    try {
      await connection.query("SET GLOBAL binlog_row_image = 'FULL'")
      return {
        step: 'Fix Binlog Row Image',
        status: 'success',
        message: 'Successfully set binlog_row_image to FULL ✓'
      }
    } catch (error) {
      return {
        step: 'Fix Binlog Row Image',
        status: 'error',
        message: 'Failed to set binlog row image',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Attempt to grant required permissions
   */
  private async fixUserPermissions(
    connection: mysql.Connection,
    username: string
  ): Promise<ValidationResult> {
    try {
      await connection.query(
        `GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO '${username}'@'%'`
      )
      await connection.query('FLUSH PRIVILEGES')
      return {
        step: 'Fix User Permissions',
        status: 'success',
        message: 'Successfully granted required permissions ✓'
      }
    } catch (error) {
      return {
        step: 'Fix User Permissions',
        status: 'error',
        message: 'Failed to grant permissions',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Validate MySQL configuration for Debezium
   */
  async validate(config: ConnectionConfig): Promise<ValidationReport> {
    let connection: mysql.Connection | null = null
    const results: ValidationResult[] = []
    
    try {
      // Test connection
      results.push({
        step: 'Database Connection',
        status: 'success',
        message: 'Attempting to connect...'
      })
      
      connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
      })
      
      results[0] = {
        step: 'Database Connection',
        status: 'success',
        message: 'Successfully connected to MySQL ✓'
      }
      
      // Check binlog format
      const binlogFormatResult = await this.checkBinlogFormat(connection)
      results.push(binlogFormatResult)
      
      // Check binlog row image
      const binlogRowImageResult = await this.checkBinlogRowImage(connection)
      results.push(binlogRowImageResult)
      
      // Check user permissions
      const permissionsResult = await this.checkUserPermissions(connection, config.username)
      results.push(permissionsResult)
      
      // Determine if MySQL is ready
      const hasErrors = results.some(r => r.status === 'error')
      
      return {
        isReady: !hasErrors,
        results
      }
    } catch (error) {
      results[0] = {
        step: 'Database Connection',
        status: 'error',
        message: 'Failed to connect to MySQL',
        details: error instanceof Error ? error.message : String(error)
      }
      
      return {
        isReady: false,
        results
      }
    } finally {
      if (connection) {
        await connection.end()
      }
    }
  }

  /**
   * Validate and attempt to fix MySQL configuration
   */
  async fix(config: ConnectionConfig): Promise<ValidationReport> {
    let connection: mysql.Connection | null = null
    const results: ValidationResult[] = []
    
    try {
      // Test connection
      results.push({
        step: 'Database Connection',
        status: 'success',
        message: 'Attempting to connect...'
      })
      
      connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
      })
      
      results[0] = {
        step: 'Database Connection',
        status: 'success',
        message: 'Successfully connected to MySQL ✓'
      }
      
      // Check and fix binlog format
      const binlogFormatResult = await this.checkBinlogFormat(connection)
      results.push(binlogFormatResult)
      
      if (binlogFormatResult.status === 'error') {
        const fixResult = await this.fixBinlogFormat(connection)
        results.push(fixResult)
      }
      
      // Check and fix binlog row image
      const binlogRowImageResult = await this.checkBinlogRowImage(connection)
      results.push(binlogRowImageResult)
      
      if (binlogRowImageResult.status === 'error') {
        const fixResult = await this.fixBinlogRowImage(connection)
        results.push(fixResult)
      }
      
      // Check and fix user permissions
      const permissionsResult = await this.checkUserPermissions(connection, config.username)
      results.push(permissionsResult)
      
      if (permissionsResult.status === 'error') {
        const fixResult = await this.fixUserPermissions(connection, config.username)
        results.push(fixResult)
      }

      // If everything is successful, wait for 10 seconds
      if (results.every(r => r.status === 'success')) {
        await new Promise(resolve => setTimeout(resolve, 10000))
      }
      
      // Final validation check
      const finalBinlogFormat = await this.checkBinlogFormat(connection)
      const finalBinlogRowImage = await this.checkBinlogRowImage(connection)
      const finalPermissions = await this.checkUserPermissions(connection, config.username)
      
      const hasErrors = [finalBinlogFormat, finalBinlogRowImage, finalPermissions].some(
        r => r.status === 'error'
      )
      
      return {
        isReady: !hasErrors,
        results
      }
    } catch (error) {
      if (results.length === 0 || results[0].step === 'Database Connection') {
        results[0] = {
          step: 'Database Connection',
          status: 'error',
          message: 'Failed to connect to MySQL',
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
      if (connection) {
        await connection.end()
      }
    }
  }

  /**
   * Prepare MySQL database for CDC connector
   * MySQL doesn't require any preparation - binlog settings are already validated
   */
  async prepareForConnector(_config: ConnectionConfig): Promise<void> {
    // No preparation needed for MySQL
    console.log('✅ MySQL connector ready (no preparation needed)')
  }

  /**
   * Generate Debezium connector configuration for MySQL
   */
  async getDebeziumConfig(connector: Connection): Promise<any> {
    // Translate localhost for Docker containers
    let dbHostname = connector.host
    
    if (connector.host === 'localhost' || connector.host === '127.0.0.1') {
      dbHostname = 'host.docker.internal'
      console.log(`⚠️  Converting ${connector.host} to ${dbHostname} for Docker networking`)
      console.log(`   If connection fails, your MySQL may need to listen on 0.0.0.0 instead of 127.0.0.1`)
    }

    return {
      'connector.class': 'io.debezium.connector.mysql.MySqlConnector',
      'tasks.max': '1',
      'database.hostname': dbHostname,
      'database.port': connector.port.toString(),
      'database.user': connector.username,
      'database.password': connector.password,
      'database.server.id': Math.floor(Math.random() * 1000000).toString(),
      'database.include.list': connector.database,
      'table.include.list': `${connector.database}.*`,
      'schema.history.internal.kafka.bootstrap.servers': 'kafka:29092',
      'schema.history.internal.kafka.topic': `schemahistory.${connector.database}`,
      'include.schema.changes': 'true',
      
      // Data type handling - convert decimals to numbers
      'decimal.handling.mode': 'double',
      'time.precision.mode': 'adaptive_time_microseconds',
    }
  }
}

