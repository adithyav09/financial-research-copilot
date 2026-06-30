# Contributing

Thank you for your interest in contributing to Financial Research Copilot!

## Getting Started

1. **Fork** the repository and clone your fork
2. Create a **feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. Set up the dev environment:
   ```bash
   # Backend
   cd backend && python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env  # fill in your keys

   # Frontend
   cd frontend && npm install
   cp .env.example .env
   ```
4. Make your changes, add tests where applicable
5. Run tests before submitting:
   ```bash
   cd backend && pytest tests/ -v
   ```
6. Open a **Pull Request** against `main` with a clear description

## Code Style

- **Python**: follow PEP 8; use `black` for formatting, `ruff` for linting
  ```bash
  black backend/app/
  ruff check backend/app/
  ```
- **TypeScript/React**: follow existing patterns; `npm run lint` in `frontend/`
- Keep functions small and focused — single responsibility
- Add docstrings to all new Python functions/classes

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add 10-Q ingestion support
fix: bypass ingestion check for live questions
docs: update architecture diagram
refactor: extract citation builder into helper
test: add unit tests for rag_service routing
```

## Pull Request Guidelines

- One feature or fix per PR
- Include a summary of what changed and why
- Reference any related issues with `Closes #123`
- Ensure TypeScript compiles without errors (`npx tsc --noEmit`)
- Do **not** commit `.env` files, `.venv/`, or `chroma_db/`

## Project Structure

See [`docs/architecture.md`](docs/architecture.md) for a full breakdown of how the system works before making changes to the core RAG pipeline.
