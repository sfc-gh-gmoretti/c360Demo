#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Customer 360 Config App - Local Setup${NC}"
echo -e "${GREEN}========================================${NC}"

if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

mkdir -p config

ACTION=${1:-up}

case $ACTION in
    up|start)
        echo -e "${GREEN}Starting config-app container...${NC}"
        docker compose up -d --build
        echo ""
        echo -e "${GREEN}Config app is running at: http://localhost:3001${NC}"
        echo -e "${YELLOW}To view logs: ./run-local.sh logs${NC}"
        echo -e "${YELLOW}To stop: ./run-local.sh stop${NC}"
        ;;
    down|stop)
        echo -e "${YELLOW}Stopping config-app container...${NC}"
        docker compose down
        echo -e "${GREEN}Config app stopped.${NC}"
        ;;
    logs)
        docker compose logs -f
        ;;
    restart)
        echo -e "${YELLOW}Restarting config-app container...${NC}"
        docker compose down
        docker compose up -d --build
        echo -e "${GREEN}Config app restarted at: http://localhost:3001${NC}"
        ;;
    build)
        echo -e "${GREEN}Building config-app container...${NC}"
        docker compose build --no-cache
        echo -e "${GREEN}Build complete.${NC}"
        ;;
    *)
        echo "Usage: $0 {up|start|down|stop|logs|restart|build}"
        echo ""
        echo "Commands:"
        echo "  up, start  - Start the config app container"
        echo "  down, stop - Stop the config app container"
        echo "  logs       - Follow container logs"
        echo "  restart    - Restart the container"
        echo "  build      - Rebuild the container image"
        exit 1
        ;;
esac
