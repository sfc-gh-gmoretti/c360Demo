# Customer 360 Config App

A standalone configuration wizard for the Customer 360 Intelligence application.

## Quick Start (Docker)

```bash
./run-local.sh up
```

The config app will be available at **http://localhost:3001**

## Commands

| Command | Description |
|---------|-------------|
| `./run-local.sh up` | Start the config app |
| `./run-local.sh stop` | Stop the config app |
| `./run-local.sh logs` | View container logs |
| `./run-local.sh restart` | Restart the container |
| `./run-local.sh build` | Rebuild the image |

## Local Development (without Docker)

```bash
npm install
npm run dev
```

## Features

1. **Branding** - Customize logo and colors
2. **Snowflake Setup** - Configure connection and create required objects
3. **Data Generation** - Generate sample customer data
4. **Deployment** - Build and deploy the app to SPCS
5. **Testing** - Verify deployment and connectivity
