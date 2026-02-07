---
name: makefile
description: Generates a Makefile with common commands (run, test, docs, clean, deps, build, lint, format) based on the detected project type. Use when setting up a new project or adding a Makefile to an existing one.
---

# Makefile Generator

This skill creates a Makefile with important commands tailored to the project type.

## Instructions

When this skill is invoked:

1. **Detect project type** by checking for these files:

   | File | Project Type |
   |------|--------------|
   | `package.json` | Node.js / JavaScript |
   | `tsconfig.json` | TypeScript |
   | `Cargo.toml` | Rust |
   | `go.mod` | Go |
   | `requirements.txt` / `pyproject.toml` / `setup.py` | Python |
   | `pom.xml` | Java (Maven) |
   | `build.gradle` / `build.gradle.kts` | Java/Kotlin (Gradle) |
   | `deps.edn` / `project.clj` | Clojure |
   | `dune-project` / `*.opam` | OCaml |
   | `Gemfile` | Ruby |
   | `mix.exs` | Elixir |
   | `CMakeLists.txt` | C/C++ (CMake) |
   | `*.csproj` / `*.sln` | .NET / C# |

2. **Check for existing Makefile**: If one exists, ask user whether to overwrite or merge.

3. **Analyze project specifics**:
   ```bash
   # For Node.js - check package.json scripts
   cat package.json | grep -A 20 '"scripts"'
   
   # For Python - check for common tools
   ls pyproject.toml setup.py setup.cfg tox.ini .flake8 2>/dev/null
   
   # For Go - check module name
   head -1 go.mod
   ```

4. **Generate Makefile** with these standard targets:

   ### Required Targets (all projects)

   ```makefile
   .PHONY: help run test clean deps build lint format docs
   
   help:           ## Show this help message
   run:            ## Run the application
   test:           ## Run tests
   clean:          ## Clean build artifacts
   deps:           ## Install dependencies
   build:          ## Build the project
   lint:           ## Run linter
   format:         ## Format code
   docs:           ## Generate documentation
   ```

   ### Project-Specific Commands

   **Node.js / TypeScript:**
   ```makefile
   deps:
   	npm install
   
   run:
   	npm start
   
   test:
   	npm test
   
   build:
   	npm run build
   
   lint:
   	npm run lint
   
   format:
   	npm run format || npx prettier --write .
   
   clean:
   	rm -rf node_modules dist build coverage .next
   
   docs:
   	npm run docs || npx typedoc
   ```

   **Python:**
   ```makefile
   VENV := .venv
   PYTHON := $(VENV)/bin/python
   PIP := $(VENV)/bin/pip
   
   deps:
   	python -m venv $(VENV)
   	$(PIP) install -r requirements.txt
   
   run:
   	$(PYTHON) -m <module_name>
   
   test:
   	$(PYTHON) -m pytest
   
   build:
   	$(PYTHON) -m build
   
   lint:
   	$(PYTHON) -m flake8 . || $(PYTHON) -m ruff check .
   
   format:
   	$(PYTHON) -m black .
   
   clean:
   	rm -rf $(VENV) __pycache__ .pytest_cache dist build *.egg-info .ruff_cache
   
   docs:
   	$(PYTHON) -m sphinx docs docs/_build
   ```

   **Rust:**
   ```makefile
   deps:
   	cargo fetch
   
   run:
   	cargo run
   
   test:
   	cargo test
   
   build:
   	cargo build --release
   
   lint:
   	cargo clippy -- -D warnings
   
   format:
   	cargo fmt
   
   clean:
   	cargo clean
   
   docs:
   	cargo doc --open
   ```

   **Go:**
   ```makefile
   BINARY := <binary_name>
   
   deps:
   	go mod download
   
   run:
   	go run .
   
   test:
   	go test ./...
   
   build:
   	go build -o $(BINARY) .
   
   lint:
   	golangci-lint run
   
   format:
   	go fmt ./...
   
   clean:
   	rm -f $(BINARY)
   	go clean
   
   docs:
   	godoc -http=:6060
   ```

   **Java (Maven):**
   ```makefile
   deps:
   	mvn dependency:resolve
   
   run:
   	mvn exec:java
   
   test:
   	mvn test
   
   build:
   	mvn package -DskipTests
   
   lint:
   	mvn checkstyle:check
   
   format:
   	mvn spotless:apply
   
   clean:
   	mvn clean
   
   docs:
   	mvn javadoc:javadoc
   ```

   **Java/Kotlin (Gradle):**
   ```makefile
   deps:
   	./gradlew dependencies
   
   run:
   	./gradlew run
   
   test:
   	./gradlew test
   
   build:
   	./gradlew build
   
   lint:
   	./gradlew check
   
   format:
   	./gradlew spotlessApply
   
   clean:
   	./gradlew clean
   
   docs:
   	./gradlew javadoc
   ```

   **TypeScript:**
   ```makefile
   deps:
   	npm install
   
   run:
   	npx ts-node src/index.ts
   
   test:
   	npm test
   
   build:
   	npx tsc
   
   lint:
   	npx eslint src/
   
   format:
   	npx prettier --write src/
   
   clean:
   	rm -rf node_modules dist build coverage .tsbuildinfo
   
   docs:
   	npx typedoc src/
   
   typecheck:        ## Run type checking without emitting
   	npx tsc --noEmit
   ```

   **Clojure (deps.edn):**
   ```makefile
   deps:
   	clojure -P
   
   run:
   	clojure -M -m <main-namespace>
   
   test:
   	clojure -M:test
   
   build:
   	clojure -T:build uber
   
   lint:
   	clojure -M:clj-kondo --lint src/
   
   format:
   	clojure -M:cljfmt fix
   
   clean:
   	rm -rf target .cpcache
   
   docs:
   	clojure -M:codox
   
   repl:             ## Start a REPL
   	clojure -M:repl
   ```

   **Clojure (Leiningen):**
   ```makefile
   deps:
   	lein deps
   
   run:
   	lein run
   
   test:
   	lein test
   
   build:
   	lein uberjar
   
   lint:
   	lein clj-kondo --lint src/
   
   format:
   	lein cljfmt fix
   
   clean:
   	lein clean
   
   docs:
   	lein codox
   
   repl:             ## Start a REPL
   	lein repl
   ```

   **OCaml (Dune):**
   ```makefile
   deps:
   	opam install . --deps-only
   
   run:
   	dune exec <binary_name>
   
   test:
   	dune runtest
   
   build:
   	dune build
   
   lint:
   	opam exec -- ocamlformat --check .
   
   format:
   	dune fmt
   
   clean:
   	dune clean
   
   docs:
   	dune build @doc
   
   watch:            ## Build with file watching
   	dune build --watch
   
   utop:             ## Start utop REPL
   	dune utop
   ```

5. **Always include help target** (self-documenting):
   ```makefile
   .DEFAULT_GOAL := help
   
   help:
   	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'
   ```

6. **Add useful extras** based on project:
   - `watch` - for projects with file watching capability
   - `docker` - if Dockerfile exists
   - `deploy` - placeholder if deployment configs exist
   - `check` - run all validation (lint + test)
   - `dev` - development mode with hot reload

7. **Write the Makefile** and confirm with user.

## Output Format

```makefile
# Makefile for <project_name>
# Generated by makefile-gen skill
#
# Usage: make [target]
# Run 'make help' to see all available targets.

.DEFAULT_GOAL := help
.PHONY: help deps run test build lint format clean docs check dev

# ... targets ...
```

## Notes

- Use tabs (not spaces) for Makefile indentation
- Include `.PHONY` declarations for all non-file targets
- Add `## description` comments for help target to pick up
- If project uses multiple languages, include targets for all
- Respect existing tooling choices (e.g., if project uses pnpm, use pnpm not npm)
