.PHONY: help install build run

# Detect package manager
PM := $(shell command -v bun 2> /dev/null && echo bun || echo npm)

help:
	@echo "Available targets:"
	@echo "  make install  - Install dependencies"
	@echo "  make build    - Build the project"
	@echo "  make run      - Build and run the TUI"
	@echo ""
	@echo "Using package manager: $(PM)"

install:
	$(PM) install
	@$(MAKE) run

build:
	$(PM) run build

run: build
	$(PM) run start
