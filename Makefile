.PHONY: help build run

# Detect package manager
PM := $(shell command -v bun 2> /dev/null && echo bun || echo npm)

help:
	@echo "Available targets:"
	@echo "  make build    - Build the project"
	@echo "  make run      - Build and run the TUI"
	@echo ""
	@echo "Using package manager: $(PM)"

build:
	$(PM) run build

run: build
	$(PM) run start
