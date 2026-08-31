.PHONY: help dev-backend dev-frontend dev test lint format check-env reset-chroma docker-up docker-down eval eval-install eval-push eval-retrieval

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
	@echo "  make eval-install     Install the RAGAS eval harness deps (evals/)"
	@echo "  make eval             Run the RAGAS + LLM-judge eval over the golden set"
	@echo "  make eval-retrieval   Run the baseline retrieval eval (hit@k / recall@k / MRR)"
	@echo "  make eval-push FILE=… Publish an eval results JSON to Arize as an experiment"
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

eval-install:
	cd backend && source .venv/bin/activate && pip install -r requirements-eval.txt

eval:
	cd backend && source .venv/bin/activate && python -m evals.run_eval

eval-retrieval:
	cd backend && source .venv/bin/activate && python -m evals.retrieval_eval

eval-push:
	cd backend && source .venv/bin/activate && python -m evals.push_to_arize $(FILE)
