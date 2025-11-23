# SeqDB

Stream database changes in real-time with git diff-style visualization. Supports multiple databases (currently PostgreSQL and MySQL).

![Demo](./demo-video/demo.gif)

## Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** (v8 or higher)
- **Docker** and **Docker Compose**

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Start the development server:
```bash
pnpm run dev
```

The application will be available at `http://localhost:3000`.

## How It Works

1. Create a connector for your database (PostgreSQL or MySQL supported)
2. Watch database changes stream in real-time
3. View changes in git diff-style format showing what was inserted, updated, or deleted

## Technical Details

SeqDB uses Change Data Capture (CDC) with Kafka and Debezium to stream database changes. The infrastructure is managed automatically via Docker Compose.

## Configuration

Configuration is stored in `data/config.json`. The application will create a default configuration on first run if none exists.


