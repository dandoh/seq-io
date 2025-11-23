/**
 * Infrastructure management utilities
 * Handles checking and managing Kafka/Kafka Connect services
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { cdcConfigSchema, type CDCConfig, type Connection, getConnectorName, getTopicPrefix } from './schemas'
import { getDatabaseHandler } from './handlers'

const CONFIG_FILE = join(process.cwd(), 'data', 'config.json')
const DATA_DIR = join(process.cwd(), 'data')
const CONNECTORS_DIR = join(process.cwd(), 'data', 'connectors')

/**
 * Ensure data directories exist
 */
function ensureDataDirectories(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!existsSync(CONNECTORS_DIR)) {
    mkdirSync(CONNECTORS_DIR, { recursive: true })
  }
}

/**
 * Get default CDC configuration
 */
function getDefaultConfig(): CDCConfig {
  return {
    projectName: 'cdc-streamer',
    kafka: {
      version: '3.3',
      containerName: 'cdc-kafka',
      port: 9092,
      clusterId: 'MkU3OEVBNTcwNTJENDM2Qk',
      dataDir: './docker-data/kafka',
    },
    kafkaConnect: {
      version: '3.3',
      containerName: 'cdc-kafka-connect',
      port: 8083,
      groupId: '1',
      topics: {
        config: 'cdc_connect_configs',
        offset: 'cdc_connect_offsets',
        status: 'cdc_connect_statuses',
      },
      dataDir: './docker-data/kafka-connect',
    },
  }
}

/**
 * Load CDC configuration from file
 * Creates default config if none exists
 */
export function loadConfig(): CDCConfig {
  ensureDataDirectories()
  
  // If config file doesn't exist, create default
  if (!existsSync(CONFIG_FILE)) {
    const defaultConfig = getDefaultConfig()
    writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf-8')
    console.log('📝 Created default CDC configuration')
    return defaultConfig
  }

  // Read and validate config
  const configContent = readFileSync(CONFIG_FILE, 'utf-8')
  const config = JSON.parse(configContent)
  
  // Validate with Zod schema
  const validated = cdcConfigSchema.parse(config)
  
  return validated
}

/**
 * Update CDC configuration file
 */
export function updateConfig(newConfig: CDCConfig): void {
  ensureDataDirectories()
  
  // Validate with Zod schema
  const validated = cdcConfigSchema.parse(newConfig)
  
  // Write to file
  writeFileSync(CONFIG_FILE, JSON.stringify(validated, null, 2), 'utf-8')
  
  console.log('✅ CDC configuration updated')
}

/**
 * Get Kafka Connect URL from config
 */
function getKafkaConnectURL(): string {
  const config = loadConfig()
  return `http://localhost:${config.kafkaConnect.port}`
}

/**
 * Get Kafka Connect port from config
 */
function getKafkaConnectPort(): string {
  const config = loadConfig()
  return config.kafkaConnect.port.toString()
}

/**
 * Check if Kafka Connect is running and healthy
 */
export async function isKafkaConnectHealthy(): Promise<boolean> {
  try {
    const url = getKafkaConnectURL()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)

    const response = await fetch(url, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    return response.ok
  } catch (error) {
    return false
  }
}

/**
 * Check if Docker is installed and running
 */
export function isDockerAvailable(): boolean {
  try {
    execSync('docker info', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * Check if docker-compose is available
 */
export function isDockerComposeAvailable(): boolean {
  try {
    execSync('docker-compose version', { stdio: 'ignore' })
    return true
  } catch {
    // Try docker compose (v2 syntax)
    try {
      execSync('docker compose version', { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }
}

/**
 * Get the docker-compose command (handles v1 vs v2)
 */
function getDockerComposeCommand(): string {
  try {
    execSync('docker-compose version', { stdio: 'ignore' })
    return 'docker-compose'
  } catch {
    return 'docker compose'
  }
}

/**
 * Get environment variables from config for docker-compose
 */
function getDockerComposeEnv(): Record<string, string> {
  const config = loadConfig()
  
  return {
    // Kafka configuration
    KAFKA_VERSION: config.kafka.version,
    KAFKA_CONTAINER_NAME: config.kafka.containerName,
    KAFKA_PORT: config.kafka.port.toString(),
    KAFKA_CLUSTER_ID: config.kafka.clusterId,
    KAFKA_DATA_DIR: config.kafka.dataDir,
    
    // Kafka Connect configuration
    KAFKA_CONNECT_VERSION: config.kafkaConnect.version,
    KAFKA_CONNECT_CONTAINER_NAME: config.kafkaConnect.containerName,
    KAFKA_CONNECT_PORT: config.kafkaConnect.port.toString(),
    KAFKA_CONNECT_GROUP_ID: config.kafkaConnect.groupId,
    KAFKA_CONNECT_CONFIG_TOPIC: config.kafkaConnect.topics.config,
    KAFKA_CONNECT_OFFSET_TOPIC: config.kafkaConnect.topics.offset,
    KAFKA_CONNECT_STATUS_TOPIC: config.kafkaConnect.topics.status,
    KAFKA_CONNECT_DATA_DIR: config.kafkaConnect.dataDir,
  }
}

/**
 * Start CDC infrastructure (Kafka + Kafka Connect)
 */
export async function startInfrastructure(): Promise<void> {
  if (!isDockerAvailable()) {
    throw new Error('Docker is not running. Please start Docker first.')
  }

  if (!isDockerComposeAvailable()) {
    throw new Error('docker-compose is not installed.')
  }

  const config = loadConfig()
  const composeCmd = getDockerComposeCommand()
  const projectRoot = process.cwd()

  console.log(`🚀 Starting CDC infrastructure for project: ${config.projectName}`)

  // Start only kafka and kafka-connect services with config from file
  // Use -p flag to set project name (affects network and volume names)
  execSync(`${composeCmd} -p ${config.projectName} up -d kafka kafka-connect`, {
    cwd: projectRoot,
    stdio: 'inherit', // Suppress docker-compose output
    env: {
      ...process.env,
      ...getDockerComposeEnv(),
    },
  })

  console.log('⏳ Waiting for Kafka Connect to be ready...')

  // Wait for Kafka Connect to be healthy
  await waitForKafkaConnect(60) // 60 retries = ~2 minutes

  console.log('✅ CDC infrastructure is ready!')
}

/**
 * Stop CDC infrastructure
 */
export function stopInfrastructure(projectName?: string): void {
  const config = loadConfig()
  const nameToUse = projectName || config.projectName
  const composeCmd = getDockerComposeCommand()
  const projectRoot = process.cwd()

  console.log(`🛑 Stopping CDC infrastructure for project: ${nameToUse}`)

  execSync(`${composeCmd} -p ${nameToUse} stop kafka kafka-connect`, {
    cwd: projectRoot,
    stdio: 'ignore', // Suppress docker-compose output
    env: {
      ...process.env,
      ...getDockerComposeEnv(),
    },
  })

  console.log('✅ CDC infrastructure stopped')
}

/**
 * Restart CDC infrastructure
 */
export async function restartInfrastructure(): Promise<void> {
  stopInfrastructure()
  await startInfrastructure()
}

/**
 * Save config and restart infrastructure
 * Handles project name changes properly by using old name to stop
 */
export async function saveConfigAndRestart(newConfig: CDCConfig): Promise<void> {
  // Load the old config to get the old project name
  const oldConfig = loadConfig()
  const projectNameChanged = oldConfig.projectName !== newConfig.projectName

  if (projectNameChanged) {
    console.log(
      `📝 Project name changed from "${oldConfig.projectName}" to "${newConfig.projectName}"`,
    )
  }

  // Stop using the OLD project name
  stopInfrastructure(oldConfig.projectName)

  // Save the new config
  updateConfig(newConfig)

  // Start using the NEW project name
  await startInfrastructure()

  if (projectNameChanged) {
    console.log(
      `✅ Infrastructure migrated to new project name: ${newConfig.projectName}`,
    )
  }
}

/**
 * Wait for Kafka Connect to become healthy
 */
async function waitForKafkaConnect(maxRetries: number = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    const healthy = await isKafkaConnectHealthy()
    if (healthy) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error('Kafka Connect failed to start within the timeout period')
}

/**
 * Get detailed infrastructure status
 */
export async function getInfrastructureStatus() {
  const config = loadConfig()
  const dockerAvailable = isDockerAvailable()
  const dockerComposeAvailable = isDockerComposeAvailable()
  const kafkaConnectHealthy = await isKafkaConnectHealthy()
  const url = getKafkaConnectURL()
  const port = getKafkaConnectPort()

  return {
    docker: {
      available: dockerAvailable,
    },
    dockerCompose: {
      available: dockerComposeAvailable,
    },
    kafkaConnect: {
      healthy: kafkaConnectHealthy,
      url,
      port,
    },
    config: {
      projectName: config.projectName,
      kafka: {
        port: config.kafka.port,
        containerName: config.kafka.containerName,
      },
      kafkaConnect: {
        port: config.kafkaConnect.port,
        containerName: config.kafkaConnect.containerName,
      },
    },
    ready: dockerAvailable && dockerComposeAvailable && kafkaConnectHealthy,
  }
}

/**
 * Migrate old connector format to new format
 * Old format had connectorName and topicPrefix fields
 * New format uses id for both
 */
function migrateConnectorIfNeeded(connector: any): Connection {
  // If it has the old fields, remove them (they're now derived from id)
  if ('connectorName' in connector) {
    delete connector.connectorName
  }
  if ('topicPrefix' in connector) {
    delete connector.topicPrefix
  }
  return connector as Connection
}

/**
 * List all connectors from the connectors directory
 */
export function listConnectors(): Connection[] {
  ensureDataDirectories()
  
  const files = existsSync(CONNECTORS_DIR) 
    ? readdirSync(CONNECTORS_DIR).filter((f: string) => f.endsWith('.json'))
    : []
  
  const connectors: Connection[] = []
  
  for (const file of files) {
    try {
      const content = readFileSync(join(CONNECTORS_DIR, file), 'utf-8')
      const connector = JSON.parse(content)
      // Migrate old format if needed
      const migratedConnector = migrateConnectorIfNeeded(connector)
      connectors.push(migratedConnector)
    } catch (error) {
      console.error(`❌ Error loading connector file ${file}:`, error)
      // Skip malformed files and continue
    }
  }
  
  return connectors
}

/**
 * Get a single connector by ID
 */
export function getConnector(id: string): Connection {
  ensureDataDirectories()
  
  const filePath = join(CONNECTORS_DIR, `${id}.json`)
  if (!existsSync(filePath)) {
    console.error(`❌ Connector ${id} not found at ${filePath}`)
    throw new Error(`Connector ${id} not found`)
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8')
    const connector = JSON.parse(content)
    // Migrate old format if needed
    return migrateConnectorIfNeeded(connector)
  } catch (error) {
    console.error(`❌ Error parsing connector file ${id}.json:`, error)
    throw new Error(`Failed to parse connector ${id}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Setup or update Debezium connector in Kafka Connect
 */
async function setupDebeziumConnector(connector: Connection): Promise<void> {
  const kafkaConnectUrl = getKafkaConnectURL()
  const connectorName = getConnectorName(connector)
  const topicPrefix = getTopicPrefix(connector)
  
  // Get the appropriate handler for this database type
  const handler = getDatabaseHandler(connector.dbType)
  
  // Get database-specific configuration from handler
  const dbSpecificConfig = await handler.getDebeziumConfig(connector)
  
  // Build Debezium connector configuration
  const debeziumConfig: any = {
    name: connectorName,
    config: {
      ...dbSpecificConfig,
      'topic.prefix': topicPrefix,
      // Route all table changes into a single topic
      'transforms': 'route',
      'transforms.route.type': 'org.apache.kafka.connect.transforms.RegexRouter',
      'transforms.route.regex': '([^.]+)\\.([^.]+)\\.([^.]+)',
      'transforms.route.replacement': '$1.all-changes',
    },
  }
  
  try {
    console.log(`🔌 Setting up Debezium connector: ${connectorName}`)
    
    // Check if connector already exists
    const checkResponse = await fetch(`${kafkaConnectUrl}/connectors/${connectorName}`)
    
    if (checkResponse.ok) {
      // Connector exists - update it
      console.log(`📝 Updating existing Debezium connector: ${connectorName}`)
      
      const updateResponse = await fetch(
        `${kafkaConnectUrl}/connectors/${connectorName}/config`,
        {
          method: 'PUT',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(debeziumConfig.config),
        }
      )
      
      if (!updateResponse.ok) {
        const errorData = await updateResponse.text()
        console.error(`❌ Failed to update Debezium connector: ${updateResponse.status} ${updateResponse.statusText}`)
        console.error(errorData)
        
        // Parse error for better user messaging
        let errorMessage = 'Failed to update Debezium connector'
        try {
          const errorJson = JSON.parse(errorData)
          if (errorJson.message) {
            // Extract the key part of the error message
            if (errorJson.message.includes('Communications link failure')) {
              errorMessage = 'Cannot connect to database. Please verify:\n' +
                '- Database is running and accessible\n' +
                '- Host, port, username, and password are correct\n' +
                '- Database is accessible from Docker containers'
            } else if (errorJson.message.includes('Access denied')) {
              errorMessage = 'Database access denied. Please check username and password.'
            } else {
              errorMessage = errorJson.message
            }
          }
        } catch {
          errorMessage = errorData
        }
        
        throw new Error(errorMessage)
      }
      
      console.log(`✅ Debezium connector updated successfully: ${connectorName}`)
    } else if (checkResponse.status === 404) {
      // Connector doesn't exist - create it
      console.log(`🆕 Creating new Debezium connector: ${connectorName}`)
      
      const createResponse = await fetch(`${kafkaConnectUrl}/connectors/`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(debeziumConfig),
      })
      
      if (!createResponse.ok) {
        const errorData = await createResponse.text()
        console.error(`❌ Failed to create Debezium connector: ${createResponse.status} ${createResponse.statusText}`)
        console.error(errorData)
        
        // Parse error for better user messaging
        let errorMessage = 'Failed to create Debezium connector'
        try {
          const errorJson = JSON.parse(errorData)
          if (errorJson.message) {
            // Extract the key part of the error message
            if (errorJson.message.includes('Communications link failure')) {
              errorMessage = 'Cannot connect to database. Please verify:\n' +
                '- Database is running and accessible\n' +
                '- Host, port, username, and password are correct\n' +
                '- Database is accessible from Docker containers'
            } else if (errorJson.message.includes('Access denied')) {
              errorMessage = 'Database access denied. Please check username and password.'
            } else {
              errorMessage = errorJson.message
            }
          }
        } catch {
          errorMessage = errorData
        }
        
        throw new Error(errorMessage)
      }
      
      console.log(`✅ Debezium connector created successfully: ${connectorName}`)
    } else {
      const errorData = await checkResponse.text()
      console.error(`❌ Error checking connector: ${checkResponse.status} ${checkResponse.statusText}`)
      console.error(errorData)
      throw new Error(`Error checking connector: ${errorData}`)
    }
  } catch (error) {
    console.error('❌ Error setting up Debezium connector:', error)
    throw error
  }
}

/**
 * Save a connector to file and setup Debezium connector
 * Only saves if database validation and Debezium connector are successfully created
 */
export async function saveConnector(connector: Connection): Promise<Connection> {
  ensureDataDirectories()
  
  // Step 1: Validate database configuration using the appropriate handler
  console.log(`🔍 Validating ${connector.dbType} configuration for Debezium...`)
  
  const handler = getDatabaseHandler(connector.dbType)
  const validationReport = await handler.validate({
    host: connector.host,
    port: connector.port,
    username: connector.username,
    password: connector.password,
    database: connector.database,
  })
  
  if (!validationReport.isReady) {
    const errorMessages = validationReport.results
      .filter(r => r.status === 'error')
      .map(r => `${r.step}: ${r.message}${r.details ? '\n  ' + r.details : ''}`)
      .join('\n')
    
    throw new Error(
      `${connector.dbType} is not properly configured for Debezium CDC:\n\n${errorMessages}\n\n` +
      'Please fix these issues using the "Apply Fixes Automatically" button and try again.'
    )
  }
  
  console.log(`✅ ${connector.dbType} validation passed`)
  
  // Step 2: Try to setup Debezium connector
  // If this fails, we don't save the connector file
  await setupDebeziumConnector(connector)
  
  // Step 3: Only save the connector file if everything succeeded
  const filePath = join(CONNECTORS_DIR, `${connector.id}.json`)
  writeFileSync(filePath, JSON.stringify(connector, null, 2), 'utf-8')
  
  console.log(`✅ Connector ${connector.name} saved`)
  
  return connector
}

/**
 * Delete Debezium connector from Kafka Connect
 */
async function deleteDebeziumConnector(connectorName: string): Promise<void> {
  const kafkaConnectUrl = getKafkaConnectURL()
  
  try {
    console.log(`🗑️  Deleting Debezium connector: ${connectorName}`)
    
    // Check if connector exists
    const checkResponse = await fetch(`${kafkaConnectUrl}/connectors/${connectorName}`)
    
    if (checkResponse.ok) {
      // Connector exists - delete it
      const deleteResponse = await fetch(
        `${kafkaConnectUrl}/connectors/${connectorName}`,
        {
          method: 'DELETE',
        }
      )
      
      if (deleteResponse.status === 204 || deleteResponse.ok) {
        console.log(`✅ Debezium connector deleted successfully: ${connectorName}`)
      } else {
        const errorData = await deleteResponse.text()
        console.error(`❌ Failed to delete Debezium connector: ${deleteResponse.status} ${deleteResponse.statusText}`)
        console.error(errorData)
        throw new Error(`Failed to delete Debezium connector: ${errorData}`)
      }
    } else if (checkResponse.status === 404) {
      console.log(`ℹ️  Debezium connector does not exist: ${connectorName}`)
    } else {
      const errorData = await checkResponse.text()
      console.error(`❌ Error checking connector: ${checkResponse.status} ${checkResponse.statusText}`)
      console.error(errorData)
      throw new Error(`Error checking connector: ${errorData}`)
    }
  } catch (error) {
    console.error('❌ Error deleting Debezium connector:', error)
    throw error
  }
}

/**
 * Delete a connector by ID
 */
export async function deleteConnector(id: string) {
  ensureDataDirectories()
  
  const filePath = join(CONNECTORS_DIR, `${id}.json`)
  if (!existsSync(filePath)) {
    throw new Error(`Connector ${id} not found`)
  }
  
  // Read connector to get the connector name for Debezium cleanup
  let connectorName: string | undefined
  try {
    const content = readFileSync(filePath, 'utf-8')
    const connector = JSON.parse(content)
    connectorName = getConnectorName(connector)
  } catch (error) {
    console.error('⚠️  Could not read connector name for Debezium cleanup:', error)
  }
  
  // Delete the connector file
  unlinkSync(filePath)
  console.log(`✅ Connector ${id} deleted`)
  
  // Try to delete the Debezium connector
  if (connectorName) {
    try {
      await deleteDebeziumConnector(connectorName)
    } catch (error) {
      console.error('⚠️  Connector deleted but Debezium cleanup failed:', error)
      // Don't throw - connector is deleted, Debezium cleanup can be done manually
    }
  }
}

