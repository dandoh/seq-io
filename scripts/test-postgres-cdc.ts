#!/usr/bin/env tsx

/**
 * Test PostgreSQL CDC Script
 * 
 * This script:
 * 1. Starts a PostgreSQL container with CDC-ready configuration
 * 2. Creates test tables with sample data
 * 3. Continuously performs random INSERT/UPDATE/DELETE operations
 * 4. Outputs credentials for connecting via CDC connector
 */

import { execSync } from 'child_process'
import * as crypto from 'crypto'
import { Client } from 'pg'

// Generate random configuration
function generateRandomString(length: number = 16): string {
  return crypto.randomBytes(length).toString('hex').substring(0, length)
}

function getRandomPort(): number {
  // Random port between 15432 and 19999
  return Math.floor(Math.random() * (19999 - 15432 + 1)) + 15432
}

// PostgreSQL Container Configuration (randomized)
const CONTAINER_NAME = `cdc-test-postgres-${generateRandomString(8)}`
const POSTGRES_PASSWORD = "postgres"
const POSTGRES_DB = 'test_cdc_db'
const POSTGRES_PORT = getRandomPort()

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
}

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

/**
 * Check if container is running
 */
function isContainerRunning(): boolean {
  try {
    const result = execSync(`docker ps -q -f name=${CONTAINER_NAME}`, { encoding: 'utf-8' })
    return result.trim().length > 0
  } catch {
    return false
  }
}

/**
 * Check if container exists (running or stopped)
 */
function containerExists(): boolean {
  try {
    const result = execSync(`docker ps -aq -f name=${CONTAINER_NAME}`, { encoding: 'utf-8' })
    return result.trim().length > 0
  } catch {
    return false
  }
}

/**
 * Clean up container and volumes
 */
async function cleanup(): Promise<void> {
  log('\n\n🧹 Cleaning up...', colors.yellow)
  
  try {
    // Stop container
    if (isContainerRunning()) {
      log('⏹️  Stopping container...', colors.yellow)
      execSync(`docker stop ${CONTAINER_NAME}`, { stdio: 'ignore' })
    }
    
    // Remove container and its volumes
    if (containerExists()) {
      log('🗑️  Removing container and volumes...', colors.yellow)
      execSync(`docker rm -v ${CONTAINER_NAME}`, { stdio: 'ignore' })
    }
    
    log('✅ Cleanup complete', colors.green)
  } catch (error) {
    log(`⚠️  Cleanup warning: ${error}`, colors.yellow)
  }
}

/**
 * Start PostgreSQL container with CDC configuration
 */
async function startPostgreSQLContainer(): Promise<void> {
  log('\n📦 Setting up PostgreSQL container...', colors.bright)

  log('🚀 Starting new PostgreSQL container...', colors.green)
  
  // Start PostgreSQL with CDC-ready configuration (logical replication)
  const dockerCommand = `docker run -d \
    --name ${CONTAINER_NAME} \
    -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
    -e POSTGRES_DB=${POSTGRES_DB} \
    -p ${POSTGRES_PORT}:5432 \
    postgres:15 \
    -c wal_level=logical \
    -c max_wal_senders=10 \
    -c max_replication_slots=10`

  execSync(dockerCommand, { stdio: 'inherit' })

  log('⏳ Waiting for PostgreSQL to be ready...', colors.yellow)
  
  // Wait for PostgreSQL to be healthy
  let retries = 30
  while (retries > 0) {
    try {
      const client = new Client({
        host: 'localhost',
        port: POSTGRES_PORT,
        user: 'postgres',
        password: POSTGRES_PASSWORD,
        database: POSTGRES_DB,
      })
      await client.connect()
      await client.query('SELECT 1')
      await client.end()
      break
    } catch {
      retries--
      if (retries === 0) {
        throw new Error('PostgreSQL failed to start')
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  log('✅ PostgreSQL container is ready!', colors.green)
}


/**
 * Create test tables
 */
async function createTables(): Promise<void> {
  log('\n📋 Creating test tables...', colors.bright)

  const client = new Client({
    host: 'localhost',
    port: POSTGRES_PORT,
    user: 'postgres',
    password: POSTGRES_PASSWORD,
    database: POSTGRES_DB,
  })

  await client.connect()

  // Users table
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL,
      email VARCHAR(100) NOT NULL,
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Products table
  await client.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      stock INTEGER DEFAULT 0,
      category VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Orders table
  await client.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      quantity INTEGER NOT NULL,
      total NUMERIC(10, 2) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Insert initial data
  await client.query(`
    INSERT INTO users (username, email, status) VALUES
    ('alice', 'alice@example.com', 'active'),
    ('bob', 'bob@example.com', 'active'),
    ('charlie', 'charlie@example.com', 'inactive')
  `)

  await client.query(`
    INSERT INTO products (name, price, stock, category) VALUES
    ('Laptop', 999.99, 10, 'Electronics'),
    ('Mouse', 29.99, 50, 'Electronics'),
    ('Desk Chair', 199.99, 15, 'Furniture'),
    ('Notebook', 5.99, 100, 'Stationery')
  `)

  await client.query(`
    INSERT INTO orders (user_id, product_id, quantity, total, status) VALUES
    (1, 1, 1, 999.99, 'completed'),
    (2, 2, 2, 59.98, 'pending')
  `)

  await client.end()

  log('✅ Test tables created with sample data', colors.green)
}

/**
 * Print connection credentials
 */
function printCredentials(): void {
  log('\n' + '='.repeat(60), colors.cyan)
  log('📋 PostgreSQL CDC Test Database Credentials', colors.bright + colors.cyan)
  log('='.repeat(60), colors.cyan)
  log(`Container:    ${CONTAINER_NAME}`, colors.cyan)
  log(`Host:         localhost`, colors.cyan)
  log(`Port:         ${POSTGRES_PORT}`, colors.cyan)
  log(`Database:     ${POSTGRES_DB}`, colors.cyan)
  log(`Username:     postgres`, colors.cyan)
  log(`Password:     ${POSTGRES_PASSWORD}`, colors.cyan)
  log('='.repeat(60), colors.cyan)
  log('\n💡 Use these credentials to create a CDC connector in the UI', colors.yellow)
  log('📝 Note: Using postgres superuser for simplified CDC setup', colors.yellow)
  log('⚠️  Container and data will be deleted when you exit (Ctrl+C)', colors.yellow)
  log('='.repeat(60) + '\n', colors.cyan)
}

/**
 * Perform random database operations
 */
async function performRandomOperations(): Promise<void> {
  const client = new Client({
    host: 'localhost',
    port: POSTGRES_PORT,
    user: 'postgres',
    password: POSTGRES_PASSWORD,
    database: POSTGRES_DB,
  })

  await client.connect()

  log('\n🔄 Starting continuous random operations...', colors.bright)
  log('Press Ctrl+C to stop\n', colors.yellow)

  let operationCount = 0

  const operations = [
    // Insert new user
    async () => {
      const username = `user_${Date.now()}`
      const email = `${username}@example.com`
      const status = ['active', 'inactive'][Math.floor(Math.random() * 2)]
      await client.query(
        'INSERT INTO users (username, email, status) VALUES ($1, $2, $3)',
        [username, email, status]
      )
      log(`✨ INSERT: New user "${username}"`, colors.green)
    },

    // Update user status
    async () => {
      const result = await client.query('SELECT id, username FROM users ORDER BY RANDOM() LIMIT 1')
      if (result.rows.length > 0) {
        const user = result.rows[0]
        const newStatus = ['active', 'inactive', 'suspended'][Math.floor(Math.random() * 3)]
        await client.query('UPDATE users SET status = $1 WHERE id = $2', [newStatus, user.id])
        log(`🔄 UPDATE: User "${user.username}" status -> ${newStatus}`, colors.blue)
      }
    },

    // Delete old user
    async () => {
      const result = await client.query(
        'SELECT id, username FROM users WHERE id > 3 ORDER BY RANDOM() LIMIT 1'
      )
      if (result.rows.length > 0) {
        const user = result.rows[0]
        await client.query('DELETE FROM users WHERE id = $1', [user.id])
        log(`🗑️  DELETE: Removed user "${user.username}"`, colors.red)
      }
    },

    // Insert new product
    async () => {
      const products = ['Monitor', 'Keyboard', 'Headphones', 'Webcam', 'USB Cable', 'Desk Lamp']
      const categories = ['Electronics', 'Furniture', 'Stationery']
      const name = products[Math.floor(Math.random() * products.length)] + ` ${Date.now()}`
      const price = (Math.random() * 500 + 10).toFixed(2)
      const stock = Math.floor(Math.random() * 100)
      const category = categories[Math.floor(Math.random() * categories.length)]
      
      await client.query(
        'INSERT INTO products (name, price, stock, category) VALUES ($1, $2, $3, $4)',
        [name, price, stock, category]
      )
      log(`✨ INSERT: New product "${name}" ($${price})`, colors.green)
    },

    // Update product stock
    async () => {
      const result = await client.query('SELECT id, name, stock FROM products ORDER BY RANDOM() LIMIT 1')
      if (result.rows.length > 0) {
        const product = result.rows[0]
        const newStock = Math.floor(Math.random() * 100)
        await client.query('UPDATE products SET stock = $1 WHERE id = $2', [newStock, product.id])
        log(`🔄 UPDATE: Product "${product.name}" stock: ${product.stock} -> ${newStock}`, colors.blue)
      }
    },

    // Create new order
    async () => {
      const userResult = await client.query('SELECT id FROM users ORDER BY RANDOM() LIMIT 1')
      const productResult = await client.query('SELECT id, price FROM products ORDER BY RANDOM() LIMIT 1')
      
      if (userResult.rows.length > 0 && productResult.rows.length > 0) {
        const quantity = Math.floor(Math.random() * 5) + 1
        const total = (parseFloat(productResult.rows[0].price) * quantity).toFixed(2)
        await client.query(
          'INSERT INTO orders (user_id, product_id, quantity, total, status) VALUES ($1, $2, $3, $4, $5)',
          [userResult.rows[0].id, productResult.rows[0].id, quantity, total, 'pending']
        )
        log(`✨ INSERT: New order (qty: ${quantity}, total: $${total})`, colors.green)
      }
    },

    // Update order status
    async () => {
      const result = await client.query('SELECT id, status FROM orders ORDER BY RANDOM() LIMIT 1')
      if (result.rows.length > 0) {
        const order = result.rows[0]
        const newStatus = ['pending', 'completed', 'cancelled'][Math.floor(Math.random() * 3)]
        await client.query('UPDATE orders SET status = $1 WHERE id = $2', [newStatus, order.id])
        log(`🔄 UPDATE: Order #${order.id} status: ${order.status} -> ${newStatus}`, colors.blue)
      }
    },
  ]

  // Run operations every 5 seconds
  const interval = setInterval(async () => {
    try {
      operationCount++
      const operation = operations[Math.floor(Math.random() * operations.length)]
      await operation()
      
      if (operationCount % 10 === 0) {
        log(`\n📊 Total operations: ${operationCount}\n`, colors.cyan)
      }
    } catch (error) {
      log(`❌ Error: ${error}`, colors.red)
    }
  }, 5000)

  // Handle cleanup on exit
  const handleExit = async () => {
    log('\n\n⏹️  Stopping operations...', colors.yellow)
    clearInterval(interval)
    try {
      await client.end()
      log('✅ Disconnected from database', colors.green)
    } catch {}
    log(`📊 Total operations performed: ${operationCount}`, colors.cyan)
    await cleanup()
    process.exit(0)
  }

  process.on('SIGINT', handleExit)
  process.on('SIGTERM', handleExit)
}

/**
 * Main function
 */
async function main() {
  try {
    log('\n🚀 PostgreSQL CDC Test Script', colors.bright + colors.cyan)
    log('='.repeat(60) + '\n', colors.cyan)

    // Register cleanup on unexpected exit
    process.on('uncaughtException', async (error) => {
      log(`\n❌ Uncaught Exception: ${error}`, colors.red)
      await cleanup()
      process.exit(1)
    })

    process.on('unhandledRejection', async (error) => {
      log(`\n❌ Unhandled Rejection: ${error}`, colors.red)
      await cleanup()
      process.exit(1)
    })

    await startPostgreSQLContainer()
    await createTables()
    printCredentials()
    await performRandomOperations()
  } catch (error) {
    log(`\n❌ Error: ${error}`, colors.red)
    await cleanup()
    process.exit(1)
  }
}

main()

