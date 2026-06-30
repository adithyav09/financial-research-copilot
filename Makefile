.PHONY: help dev-backend dev-frontend dev test lint format check-env reset-chroma docker-up docker-down

help:
	@echo ""
	@echo "Financial Research Copilot — Dev Commands"
	@echo ""
	@echo "  make dev-backend      Start backend with hot reload"
	@echo "  make dev-frontend     Start frontend dev server"
	@echo "  make test             Run backend test suite"
	@echo "  make lint             Run ruff linter on backend"
	@echo "  make format           Run black formatter on backend"
	@echo "  make check-env        Verify all required env vars are set"
	@echo "  make reset-chroma     Wipe all ChromaDB collections (interactive)"
	@echo "  make docker-up        Build and start all services via Docker Compose"
	@echo "  make docker-down      Stop Docker Compose services"
	@echo ""

dev-backend:
	cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

test:
	cd backend && source .venv/bin/activate && pytest tests/ -v

lint:
	cd backend && source .venv/bin/activate && ruff check app/

format:
	cd backend && source .venv/bin/activate && black app/

check-env:
	python scripts/check_env.py

reset-chroma:
	cd backend && source .venv/bin/activate && python ../scripts/reset_chroma.py

docker-up:
	docker-compose up --build

docker-down:
	docker-compose down
