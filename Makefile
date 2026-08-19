# UNICAL ASSOCIATES — perintah operasional
# Catatan: resep Makefile wajib diawali TAB, bukan spasi.

SHELL := /bin/bash
COMPOSE := docker compose
BACKUP_DIR := $(HOME)/unical-backups
STAMP := $(shell date +%Y%m%d-%H%M%S)

.DEFAULT_GOAL := help
.PHONY: help up down restart ps logs health psql redis backup restore secrets

help: ## Tampilkan daftar perintah
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up: ## Bangun & jalankan seluruh stack
	$(COMPOSE) up -d --build

down: ## Hentikan stack (volume tetap aman)
	$(COMPOSE) down

restart: ## Restart seluruh service
	$(COMPOSE) restart

ps: ## Status container
	$(COMPOSE) ps

logs: ## Ikuti log seluruh service
	$(COMPOSE) logs -f --tail=100

health: ## Ringkasan status kesehatan tiap container
	@$(COMPOSE) ps --format 'table {{.Name}}\t{{.Status}}'

psql: ## Masuk ke shell PostgreSQL
	$(COMPOSE) exec postgres psql -U $${POSTGRES_USER:-unical} -d $${POSTGRES_DB:-unical}

redis: ## Masuk ke shell Redis
	$(COMPOSE) exec redis sh -c 'redis-cli -a "$$REDIS_PASSWORD" --no-auth-warning'

backup: ## Dump database ke ~/unical-backups
	@mkdir -p $(BACKUP_DIR)
	$(COMPOSE) exec -T postgres pg_dump -U $${POSTGRES_USER:-unical} -Fc $${POSTGRES_DB:-unical} \
		> $(BACKUP_DIR)/unical-$(STAMP).dump
	@echo "tersimpan: $(BACKUP_DIR)/unical-$(STAMP).dump"

restore: ## Pulihkan database, contoh: make restore FILE=~/unical-backups/xxx.dump
	@test -n "$(FILE)" || { echo "Isi FILE=<path dump>"; exit 1; }
	$(COMPOSE) exec -T postgres pg_restore -U $${POSTGRES_USER:-unical} \
		-d $${POSTGRES_DB:-unical} --clean --if-exists < $(FILE)

secrets: ## Buat nilai acak untuk diisikan ke .env
	@echo "POSTGRES_PASSWORD=$$(openssl rand -base64 36 | tr -d '/+=' | cut -c1-40)"
	@echo "REDIS_PASSWORD=$$(openssl rand -base64 36 | tr -d '/+=' | cut -c1-40)"
	@echo "MEILI_MASTER_KEY=$$(openssl rand -base64 36 | tr -d '/+=' | cut -c1-40)"
	@echo "MINIO_ROOT_PASSWORD=$$(openssl rand -base64 36 | tr -d '/+=' | cut -c1-40)"
