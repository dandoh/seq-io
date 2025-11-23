#!/usr/bin/env tsx

/**
 * Test MySQL CDC Script
 * 
 * This script:
 * 1. Starts a MySQL container with CDC-ready configuration
 * 2. Creates test tables with sample data
 * 3. Continuously performs random INSERT/UPDATE/DELETE operations
 * 4. Outputs credentials for connecting via CDC connector
 */

import { execSync, spawn } from 'child_process'
import * as mysql from 'mysql2/promise'
import * as crypto from 'crypto'

// Generate random configuration
function generateRandomString(length: number = 16): string {
  return crypto.randomBytes(length).toString('hex').substring(0, length)
}

function getRandomPort(): number {
  // Random port between 13306 and 19999
  return Math.floor(Math.random() * (19999 - 13306 + 1)) + 13306
}

// MySQL Container Configuration (randomized)
const CONTAINER_NAME = `cdc-test-mysql-${generateRandomString(8)}`
const MYSQL_ROOT_PASSWORD = generateRandomString(20)
const MYSQL_DATABASE = 'test_cdc_db'
const MYSQL_USER = 'cdc_user'
const MYSQL_PASSWORD = "cdc_password"
const MYSQL_PORT = getRandomPort()

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
 * Start MySQL container with CDC configuration
 */
async function startMySQLContainer(): Promise<void> {
  log('\n📦 Setting up MySQL container...', colors.bright)

  log('🚀 Starting new MySQL container...', colors.green)
  
  // Start MySQL with CDC-ready configuration
  const dockerCommand = `docker run -d \
    --name ${CONTAINER_NAME} \
    -e MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD} \
    -e MYSQL_DATABASE=${MYSQL_DATABASE} \
    -e MYSQL_USER=${MYSQL_USER} \
    -e MYSQL_PASSWORD=${MYSQL_PASSWORD} \
    -p ${MYSQL_PORT}:3306 \
    mysql:8.0 \
    --server-id=1 \
    --log-bin=mysql-bin \
    --binlog-format=MIXED \
    --binlog-row-image=FULL \
    --gtid-mode=ON \
    --enforce-gtid-consistency=ON`

  execSync(dockerCommand, { stdio: 'inherit' })

  log('⏳ Waiting for MySQL to be ready...', colors.yellow)
  
  // Wait for MySQL to be healthy
  let retries = 30
  while (retries > 0) {
    try {
      const connection = await mysql.createConnection({
        host: 'localhost',
        port: MYSQL_PORT,
        user: 'root',
        password: MYSQL_ROOT_PASSWORD,
        database: MYSQL_DATABASE,
      })
      await connection.ping()
      await connection.end()
      break
    } catch {
      retries--
      if (retries === 0) {
        throw new Error('MySQL failed to start')
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  log('✅ MySQL container is ready!', colors.green)
}

/**
 * Grant replication privileges to users
 */
async function grantReplicationPrivileges(): Promise<void> {
  log('\n🔐 Granting CDC privileges...', colors.bright)

  const connection = await mysql.createConnection({
    host: 'localhost',
    port: MYSQL_PORT,
    user: 'root',
    password: MYSQL_ROOT_PASSWORD,
  })

  // Grant privileges to root
  await connection.query(
    `GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'root'@'%'`
  )

  // Grant privileges to CDC user
  await connection.query(
    `GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO '${MYSQL_USER}'@'%'`
  )

  await connection.query('FLUSH PRIVILEGES')
  await connection.end()

  log('✅ CDC privileges granted', colors.green)
}

/**
 * Create test tables
 */
async function createTables(): Promise<void> {
  log('\n📋 Creating test tables...', colors.bright)

  const connection = await mysql.createConnection({
    host: 'localhost',
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
  })

  // Users table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL,
      email VARCHAR(100) NOT NULL,
      status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  // Products table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      stock INT DEFAULT 0,
      category VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  // Orders table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      product_id INT,
      quantity INT NOT NULL,
      total DECIMAL(10, 2) NOT NULL,
      status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `)

  // Insert initial data
  await connection.query(`
    INSERT INTO users (username, email, status) VALUES
    ('alice', 'alice@example.com', 'active'),
    ('bob', 'bob@example.com', 'active'),
    ('charlie', 'charlie@example.com', 'inactive')
  `)

  await connection.query(`
    INSERT INTO products (name, price, stock, category) VALUES
    ('Laptop', 999.99, 10, 'Electronics'),
    ('Mouse', 29.99, 50, 'Electronics'),
    ('Desk Chair', 199.99, 15, 'Furniture'),
    ('Notebook', 5.99, 100, 'Stationery')
  `)

  await connection.query(`
    INSERT INTO orders (user_id, product_id, quantity, total, status) VALUES
    (1, 1, 1, 999.99, 'completed'),
    (2, 2, 2, 59.98, 'pending')
  `)

  await connection.end()

  log('✅ Test tables created with sample data', colors.green)
}

/**
 * Print connection credentials
 */
function printCredentials(): void {
  log('\n' + '='.repeat(60), colors.cyan)
  log('📋 MySQL CDC Test Database Credentials', colors.bright + colors.cyan)
  log('='.repeat(60), colors.cyan)
  log(`Container:    ${CONTAINER_NAME}`, colors.cyan)
  log(`Host:         localhost`, colors.cyan)
  log(`Port:         ${MYSQL_PORT}`, colors.cyan)
  log(`Database:     ${MYSQL_DATABASE}`, colors.cyan)
  log(`Username:     ${MYSQL_USER}`, colors.cyan)
  log(`Password:     ${MYSQL_PASSWORD}`, colors.cyan)
  log(`Root User:    root`, colors.cyan)
  log(`Root Pass:    ${MYSQL_ROOT_PASSWORD}`, colors.cyan)
  log('='.repeat(60), colors.cyan)
  log('\n💡 Use these credentials to create a CDC connector in the UI', colors.yellow)
  log('⚠️  Container and data will be deleted when you exit (Ctrl+C)', colors.yellow)
  log('='.repeat(60) + '\n', colors.cyan)
}

/**
 * Perform random database operations
 */
async function performRandomOperations(): Promise<void> {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
  })

  log('\n🔄 Starting continuous random operations...', colors.bright)
  log('Press Ctrl+C to stop\n', colors.yellow)

  let operationCount = 0

  const operations = [
    // Insert new user
    async () => {
      const username = `user_${Date.now()}`
      const email = `${username}@example.com`
      await connection.query(
        'INSERT INTO users (username, email, status) VALUES (?, ?, ?)',
        [username, email, ['active', 'inactive'][Math.floor(Math.random() * 2)]]
      )
      log(`✨ INSERT: New user "${username}"`, colors.green)
    },

    // Update user status
    async () => {
      const [users] = await connection.query<mysql.RowDataPacket[]>('SELECT id, username FROM users ORDER BY RAND() LIMIT 1')
      if (users.length > 0) {
        const user = users[0]
        const newStatus = ['active', 'inactive', 'suspended'][Math.floor(Math.random() * 3)]
        await connection.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, user.id])
        log(`🔄 UPDATE: User "${user.username}" status -> ${newStatus}`, colors.blue)
      }
    },

    // Delete old user
    async () => {
      const [users] = await connection.query<mysql.RowDataPacket[]>(
        'SELECT id, username FROM users WHERE id > 3 ORDER BY RAND() LIMIT 1'
      )
      if (users.length > 0) {
        const user = users[0]
        await connection.query('DELETE FROM users WHERE id = ?', [user.id])
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
      
      await connection.query(
        'INSERT INTO products (name, price, stock, category) VALUES (?, ?, ?, ?)',
        [name, price, stock, category]
      )
      log(`✨ INSERT: New product "${name}" ($${price})`, colors.green)
    },

    // Update product stock
    async () => {
      const [products] = await connection.query<mysql.RowDataPacket[]>('SELECT id, name, stock FROM products ORDER BY RAND() LIMIT 1')
      if (products.length > 0) {
        const product = products[0]
        const newStock = Math.floor(Math.random() * 100)
        await connection.query('UPDATE products SET stock = ? WHERE id = ?', [newStock, product.id])
        log(`🔄 UPDATE: Product "${product.name}" stock: ${product.stock} -> ${newStock}`, colors.blue)
      }
    },

    // Create new order
    async () => {
      const [users] = await connection.query<mysql.RowDataPacket[]>('SELECT id FROM users ORDER BY RAND() LIMIT 1')
      const [products] = await connection.query<mysql.RowDataPacket[]>('SELECT id, price FROM products ORDER BY RAND() LIMIT 1')
      
      if (users.length > 0 && products.length > 0) {
        const quantity = Math.floor(Math.random() * 5) + 1
        const total = (parseFloat(products[0].price) * quantity).toFixed(2)
        await connection.query(
          'INSERT INTO orders (user_id, product_id, quantity, total, status) VALUES (?, ?, ?, ?, ?)',
          [users[0].id, products[0].id, quantity, total, 'pending']
        )
        log(`✨ INSERT: New order (qty: ${quantity}, total: $${total})`, colors.green)
      }
    },

    // Update order status
    async () => {
      const [orders] = await connection.query<mysql.RowDataPacket[]>('SELECT id, status FROM orders ORDER BY RAND() LIMIT 1')
      if (orders.length > 0) {
        const order = orders[0]
        const newStatus = ['pending', 'completed', 'cancelled'][Math.floor(Math.random() * 3)]
        await connection.query('UPDATE orders SET status = ? WHERE id = ?', [newStatus, order.id])
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
      await connection.end()
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
    log('\n🚀 MySQL CDC Test Script', colors.bright + colors.cyan)
    log('=' .repeat(60) + '\n', colors.cyan)

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

    await startMySQLContainer()
    await grantReplicationPrivileges()
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

