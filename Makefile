SHELL := /bin/bash
.DEFAULT_GOAL := help

DB_USER := $(shell grep -E '^POSTGRES_USER=' .env 2>/dev/null | cut -d= -f2-)
DB_NAME := $(shell grep -E '^POSTGRES_DB=' .env 2>/dev/null | cut -d= -f2-)
API := http://localhost:3000
PSQL := docker compose exec -T tcg-db psql -U $(DB_USER) -d $(DB_NAME)

.PHONY: help up stop down ps logs psql reset dev generate migrate status studio \
        users constraints migrations schema clean-users unit test test-db test-collection test-profile test-wishlist test-listings test-offers

help:
	@echo ""
	@echo "  PokeBox - comandos"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
	@echo ""

up: ## sobe o banco e espera ficar healthy
	@docker compose up -d tcg-db
	@printf "aguardando o banco"
	@for i in $$(seq 1 30); do \
		if docker compose ps tcg-db 2>/dev/null | grep -q healthy; then \
			echo " ok"; exit 0; \
		fi; \
		printf "."; sleep 1; \
	done; \
	echo " timeout"; exit 1

stop: ## para os containers (PRESERVA os dados)
	@docker compose stop

down: ## remove os containers (PRESERVA os dados)
	@docker compose down

ps: ## status dos containers
	@docker compose ps

logs: ## logs do banco (ctrl+c para sair)
	@docker compose logs -f --tail=50 tcg-db

psql: ## abre o psql interativo no container
	@docker compose exec tcg-db psql -U $(DB_USER) -d $(DB_NAME)

reset: ## APAGA o banco, recria e aplica as migrations
	@read -p "Isso apaga TODOS os dados do banco. Continuar? [s/N] " ok; \
	if [ "$$ok" != "s" ]; then echo "cancelado"; exit 1; fi
	@docker compose down -v
	@$(MAKE) --no-print-directory up
	@$(MAKE) --no-print-directory migrate

dev: ## sobe a API em modo watch
	@cd backend && npm run dev

unit: ## roda os testes unitarios (nao precisa de banco nem API)
	@cd backend && npm test

generate: ## regenera o client do prisma
	@cd backend && npm run db:generate

migrate: ## aplica as migrations pendentes
	@cd backend && npm run db:migrate

status: ## mostra o estado das migrations
	@cd backend && npx prisma migrate status

studio: ## abre o prisma studio no browser
	@cd backend && npx prisma studio

users: ## lista os usuarios cadastrados
	@$(PSQL) -c 'SELECT username, email, role, "accountStatus", left("passwordHash",7) AS hash, "lastLoginAt" FROM "User" ORDER BY "createdAt";'

constraints: ## lista as constraints da tabela User
	@$(PSQL) -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='\"User\"'::regclass ORDER BY contype;"

migrations: ## lista as migrations aplicadas no banco
	@$(PSQL) -c 'SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at;'

schema: ## descreve a tabela User
	@$(PSQL) -c '\d "User"'

clean-users: ## apaga os usuarios de teste (@teste.com)
	@$(PSQL) -c "DELETE FROM \"User\" WHERE email LIKE '%@teste.com';"

test-db: ## testa os CHECK constraints (os 3 primeiros devem FALHAR)
	@echo ""
	@echo "username 'AB' (espera: violates user_username_format_check)"
	@$(PSQL) -c "INSERT INTO \"User\" (id,username,name,email,\"passwordHash\",\"updatedAt\") VALUES (gen_random_uuid(),'AB','Nome Valido','ab@teste.com','x',now());" 2>&1 | grep -E 'ERROR|INSERT' || true
	@echo ""
	@echo "email sem arroba (espera: violates user_email_format_check)"
	@$(PSQL) -c "INSERT INTO \"User\" (id,username,name,email,\"passwordHash\",\"updatedAt\") VALUES (gen_random_uuid(),'teste_dois','Nome Valido','sem-arroba','x',now());" 2>&1 | grep -E 'ERROR|INSERT' || true
	@echo ""
	@echo "nome em branco (espera: violates user_name_not_blank_check)"
	@$(PSQL) -c "INSERT INTO \"User\" (id,username,name,email,\"passwordHash\",\"updatedAt\") VALUES (gen_random_uuid(),'teste_tres','   ','tres@teste.com','x',now());" 2>&1 | grep -E 'ERROR|INSERT' || true
	@echo ""
	@echo "insercao valida (espera: INSERT 0 1)"
	@$(PSQL) -c "INSERT INTO \"User\" (id,username,name,email,\"passwordHash\",\"updatedAt\") VALUES (gen_random_uuid(),'teste_ok','Usuario Teste','ok@teste.com','x',now());" 2>&1 | grep -E 'ERROR|INSERT' || true
	@$(MAKE) --no-print-directory clean-users
	@echo ""

test: ## roda o smoke test da API (precisa de 'make dev' em outro terminal)
	@if ! curl -s -m 3 $(API)/health > /dev/null; then \
		echo "API fora do ar. Rode 'make dev' em outro terminal."; exit 1; \
	fi
	@echo ""
	@$(MAKE) --no-print-directory clean-users > /dev/null 2>&1 || true
	@printf '%-34s' "health -> 200";              curl -s -o /dev/null -w 'HTTP %{http_code}\n' $(API)/health
	@printf '%-34s' "register valido -> 201";     curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $(API)/auth/register -H 'Content-Type: application/json' -d '{"username":"teste_api","name":"Usuario Teste","email":"api@teste.com","password":"senhaForte123"}'
	@printf '%-34s' "email duplicado -> 409";     curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $(API)/auth/register -H 'Content-Type: application/json' -d '{"username":"teste_api","name":"Usuario Teste","email":"api@teste.com","password":"senhaForte123"}'
	@printf '%-34s' "username duplicado -> 409";  curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $(API)/auth/register -H 'Content-Type: application/json' -d '{"username":"teste_api","name":"Outra Pessoa","email":"outro@teste.com","password":"senhaForte123"}'
	@printf '%-34s' "corpo invalido -> 400";      curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $(API)/auth/register -H 'Content-Type: application/json' -d '{"username":"AB","name":"x","email":"nao-eh-email","password":"123"}'
	@printf '%-34s' "login valido -> 200";        curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $(API)/auth/login -H 'Content-Type: application/json' -d '{"email":"api@teste.com","password":"senhaForte123"}'
	@printf '%-34s' "senha errada -> 401";        curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $(API)/auth/login -H 'Content-Type: application/json' -d '{"email":"api@teste.com","password":"senhaErrada"}'
	@printf '%-34s' "email inexistente -> 401";   curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $(API)/auth/login -H 'Content-Type: application/json' -d '{"email":"naoexiste@teste.com","password":"qualquer"}'
	@printf '%-34s' "rota inexistente -> 404";    curl -s -o /dev/null -w 'HTTP %{http_code}\n' $(API)/nao-existe
	@printf '%-34s' "me sem token -> 401";        curl -s -o /dev/null -w 'HTTP %{http_code}\n' $(API)/auth/me
	@printf '%-34s' "me token invalido -> 401";   curl -s -o /dev/null -w 'HTTP %{http_code}\n' $(API)/auth/me -H 'Authorization: Bearer token.invalido.aqui'
	@TOKEN=$$(curl -s -X POST $(API)/auth/login -H 'Content-Type: application/json' -d '{"email":"api@teste.com","password":"senhaForte123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["token"])'); \
	printf '%-34s' "me com token -> 200";         curl -s -o /dev/null -w 'HTTP %{http_code}\n' $(API)/auth/me -H "Authorization: Bearer $$TOKEN"; \
	printf '%-34s' "sem a palavra Bearer -> 401"; curl -s -o /dev/null -w 'HTTP %{http_code}\n' $(API)/auth/me -H "Authorization: $$TOKEN"; \
	printf '%-34s' "USER em rota admin -> 403";   curl -s -o /dev/null -w 'HTTP %{http_code}\n' $(API)/auth/admin-check -H "Authorization: Bearer $$TOKEN"
	@$(MAKE) --no-print-directory clean-users > /dev/null 2>&1 || true
	@$(MAKE) --no-print-directory test-collection
	@$(MAKE) --no-print-directory test-profile
	@$(MAKE) --no-print-directory test-wishlist
	@$(MAKE) --no-print-directory test-listings
	@$(MAKE) --no-print-directory test-offers

JSON = python3 -c 'import sys,json;d=json.load(sys.stdin);print(eval(sys.argv[1]))'
LOGIN = curl -s -X POST $(API)/auth/login -H 'Content-Type: application/json' -d

test-collection: ## smoke test da colecao (#9, #10, #11) com os usuarios do seed
	@echo ""
	@echo "colecao"
	@ASH=$$($(LOGIN) '{"email":"ash@pokebox.dev","password":"pokebox123"}' | $(JSON) 'd["data"]["token"]'); \
	MISTY=$$($(LOGIN) '{"email":"misty@pokebox.dev","password":"pokebox123"}' | $(JSON) 'd["data"]["token"]'); \
	ADMIN=$$($(LOGIN) '{"email":"admin@pokebox.dev","password":"pokebox123"}' | $(JSON) 'd["data"]["token"]'); \
	A="Authorization: Bearer $$ASH"; J='Content-Type: application/json'; C=$(API)/collection; \
	NEW='{"cardId":"sv01-001","quantity":2,"finish":"NORMAL","firstEdition":false}'; \
	printf '%-34s' "sem token -> 401";             curl -s -o /dev/null -w 'HTTP %{http_code}\n' $$C; \
	printf '%-34s' "listar (ash) -> 200";         curl -s -o /dev/null -w 'HTTP %{http_code}\n' $$C -H "$$A"; \
	ITEM=$$(curl -s -X POST $$C -H "$$A" -H "$$J" -d "$$NEW" | $(JSON) 'd["data"]["item"]["id"]'); \
	printf '%-34s' "adicionar -> 201";            echo "item $$ITEM"; \
	printf '%-34s' "repetir soma -> 201 qtd 4";   curl -s -X POST $$C -H "$$A" -H "$$J" -d "$$NEW" | $(JSON) 'd["data"]["item"]["quantity"]'; \
	printf '%-34s' "sem finish -> 400";           curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$C -H "$$A" -H "$$J" -d '{"cardId":"sv01-001","quantity":1,"firstEdition":false}'; \
	printf '%-34s' "carta inexistente -> 404";    curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$C -H "$$A" -H "$$J" -d '{"cardId":"nao-existe-999","quantity":1,"finish":"NORMAL","firstEdition":false}'; \
	printf '%-34s' "variante invalida -> 422";    curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$C -H "$$A" -H "$$J" -d '{"cardId":"base1-4","quantity":1,"finish":"REVERSE","firstEdition":false}'; \
	printf '%-34s' "quantidade 0 -> 200";         curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$C/$$ITEM -H "$$A" -H "$$J" -d '{"quantity":0}'; \
	printf '%-34s' "quantidade -1 -> 400";        curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$C/$$ITEM -H "$$A" -H "$$J" -d '{"quantity":-1}'; \
	$(PSQL) -c "UPDATE \"CollectionItem\" SET quantity = 3, \"reservedQuantity\" = 2 WHERE id = '$$ITEM';" > /dev/null; \
	printf '%-34s' "abaixo da reservada -> 422";  curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$C/$$ITEM -H "$$A" -H "$$J" -d '{"quantity":1}'; \
	printf '%-34s' "apagar com reserva -> 409";   curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X DELETE $$C/$$ITEM -H "$$A"; \
	$(PSQL) -c "UPDATE \"CollectionItem\" SET \"reservedQuantity\" = 0 WHERE id = '$$ITEM';" > /dev/null; \
	printf '%-34s' "misty altera do ash -> 403";  curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$C/$$ITEM -H "Authorization: Bearer $$MISTY" -H "$$J" -d '{"quantity":9}'; \
	printf '%-34s' "admin altera do ash -> 403";  curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$C/$$ITEM -H "Authorization: Bearer $$ADMIN" -H "$$J" -d '{"quantity":9}'; \
	printf '%-34s' "misty apaga do ash -> 403";   curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X DELETE $$C/$$ITEM -H "Authorization: Bearer $$MISTY"; \
	printf '%-34s' "item inexistente -> 404";     curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$C/00000000-0000-4000-8000-000000000000 -H "$$A" -H "$$J" -d '{"quantity":1}'; \
	LISTED=$$($(PSQL) -tAc "SELECT \"collectionItemId\" FROM \"Listing\" l JOIN \"CollectionItem\" ci ON ci.id = l.\"collectionItemId\" JOIN \"User\" u ON u.id = ci.\"userId\" WHERE u.username = 'ash' LIMIT 1;"); \
	printf '%-34s' "apagar item com anuncio -> 409"; curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X DELETE $$C/$$LISTED -H "$$A"; \
	printf '%-34s' "apagar -> 204";               curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X DELETE $$C/$$ITEM -H "$$A"; \
	printf '%-34s' "apagar de novo -> 404";       curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X DELETE $$C/$$ITEM -H "$$A"
	@echo ""

COUNT = python3 -c 'import sys,json;print(len(json.load(sys.stdin)["data"]["items"]))'

test-profile: ## smoke test do perfil publico (#12) com os usuarios do seed
	@echo ""
	@echo "perfil publico"
	@ASH=$$($(LOGIN) '{"email":"ash@pokebox.dev","password":"pokebox123"}' | $(JSON) 'd["data"]["token"]'); \
	A="Authorization: Bearer $$ASH"; J='Content-Type: application/json'; P=$(API)/users/ash/collection; \
	PUBLIC=$$($(PSQL) -tAc "SELECT count(*) FROM \"CollectionItem\" ci JOIN \"User\" u ON u.id = ci.\"userId\" WHERE u.username = 'ash' AND ci.\"isPublic\" AND ci.quantity > 0;"); \
	printf '%-34s' "ash sem token -> 200";         curl -s -o /dev/null -w 'HTTP %{http_code}\n' $$P; \
	printf '%-34s' "so itens publicos -> $$PUBLIC"; curl -s $$P | $(COUNT); \
	printf '%-34s' "sem campos internos -> []";   curl -s $$P | $(JSON) '[k for i in d["data"]["items"] for k in ("userId","reservedQuantity","isPublic","available") if k in i]'; \
	printf '%-34s' "sem email no user -> False";  curl -s $$P | $(JSON) '"email" in d["data"]["user"]'; \
	printf '%-34s' "misty -> 200";                curl -s -o /dev/null -w 'HTTP %{http_code}\n' $(API)/users/misty/collection; \
	printf '%-34s' "inexistente -> 404";          curl -s -o /dev/null -w 'HTTP %{http_code}\n' $(API)/users/naoexiste/collection; \
	printf '%-34s' "username invalido -> 400";    curl -s -o /dev/null -w 'HTTP %{http_code}\n' $(API)/users/AB/collection; \
	ITEM=$$($(PSQL) -tAc "SELECT ci.id FROM \"CollectionItem\" ci JOIN \"User\" u ON u.id = ci.\"userId\" WHERE u.username = 'ash' AND ci.\"isPublic\" AND ci.quantity > 0 AND NOT EXISTS (SELECT 1 FROM \"Listing\" l WHERE l.\"collectionItemId\" = ci.id AND l.status IN ('ACTIVE', 'PAUSED')) ORDER BY ci.id LIMIT 1;"); \
	QTD=$$(curl -s $(API)/collection -H "$$A" | $(JSON) '[i for i in d["data"]["items"] if i["id"] == "'$$ITEM'"][0]["quantity"]'); \
	curl -s -o /dev/null -X PATCH $(API)/collection/$$ITEM -H "$$A" -H "$$J" -d '{"quantity":0}'; \
	printf '%-34s' "quantidade 0 some -> $$((PUBLIC-1))"; curl -s $$P | $(COUNT); \
	curl -s -o /dev/null -X PATCH $(API)/collection/$$ITEM -H "$$A" -H "$$J" -d '{"quantity":'$$QTD'}'; \
	curl -s -o /dev/null -X PATCH $(API)/collection/$$ITEM -H "$$A" -H "$$J" -d '{"isPublic":false}'; \
	printf '%-34s' "privado some -> $$((PUBLIC-1))"; curl -s $$P | $(COUNT); \
	curl -s -o /dev/null -X PATCH $(API)/collection/$$ITEM -H "$$A" -H "$$J" -d '{"isPublic":true}'; \
	printf '%-34s' "restaurado -> $$PUBLIC";      curl -s $$P | $(COUNT); \
	curl -s -o /dev/null -X POST $(API)/auth/register -H "$$J" -d '{"username":"perfil_off","name":"Perfil Off","email":"perfil@teste.com","password":"senhaForte123"}'; \
	OFF=$$($(LOGIN) '{"email":"perfil@teste.com","password":"senhaForte123"}' | $(JSON) 'd["data"]["token"]'); \
	printf '%-34s' "conta nova -> 200";           curl -s -o /dev/null -w 'HTTP %{http_code}\n' $(API)/users/perfil_off/collection; \
	curl -s -o /dev/null -X DELETE $(API)/user/me -H "Authorization: Bearer $$OFF"; \
	printf '%-34s' "conta desativada -> 404";     curl -s -o /dev/null -w 'HTTP %{http_code}\n' $(API)/users/perfil_off/collection; \
	$(PSQL) -c "DELETE FROM \"User\" WHERE username = 'perfil_off';" > /dev/null
	@echo ""

test-wishlist: ## smoke test da wishlist (#13) com os usuarios do seed
	@echo ""
	@echo "wishlist"
	@ASH=$$($(LOGIN) '{"email":"ash@pokebox.dev","password":"pokebox123"}' | $(JSON) 'd["data"]["token"]'); \
	MISTY=$$($(LOGIN) '{"email":"misty@pokebox.dev","password":"pokebox123"}' | $(JSON) 'd["data"]["token"]'); \
	ADMIN=$$($(LOGIN) '{"email":"admin@pokebox.dev","password":"pokebox123"}' | $(JSON) 'd["data"]["token"]'); \
	M="Authorization: Bearer $$MISTY"; J='Content-Type: application/json'; W=$(API)/wishlist; \
	printf '%-34s' "sem token -> 401";             curl -s -o /dev/null -w 'HTTP %{http_code}\n' $$W; \
	printf '%-34s' "listar (misty) -> 200";       curl -s -o /dev/null -w 'HTTP %{http_code}\n' $$W -H "$$M"; \
	printf '%-34s' "charizard oportunidades >= 1"; curl -s $$W -H "$$M" | $(JSON) '[i["opportunities"] for i in d["data"]["items"] if i["cardId"] == "base1-4"][0]'; \
	printf '%-34s' "pineco oportunidades -> 0";   curl -s $$W -H "$$M" | $(JSON) '[i["opportunities"] for i in d["data"]["items"] if i["cardId"] == "sv01-001"][0]'; \
	printf '%-34s' "sem userId -> []";            curl -s $$W -H "$$M" | $(JSON) '[i["id"] for i in d["data"]["items"] if "userId" in i]'; \
	$(PSQL) -c "UPDATE \"User\" SET \"accountStatus\" = 'SUSPENDED' WHERE username = 'ash';" > /dev/null; \
	printf '%-34s' "dono suspenso -> 0";          curl -s $$W -H "$$M" | $(JSON) '[i["opportunities"] for i in d["data"]["items"] if i["cardId"] == "base1-4"][0]'; \
	$(PSQL) -c "UPDATE \"User\" SET \"accountStatus\" = 'ACTIVE', \"deletedAt\" = now() WHERE username = 'ash';" > /dev/null; \
	printf '%-34s' "dono apagado -> 0";           curl -s $$W -H "$$M" | $(JSON) '[i["opportunities"] for i in d["data"]["items"] if i["cardId"] == "base1-4"][0]'; \
	$(PSQL) -c "UPDATE \"User\" SET \"accountStatus\" = 'ACTIVE', \"deletedAt\" = NULL WHERE username = 'ash';" > /dev/null; \
	printf '%-34s' "dono reativado -> 1";         curl -s $$W -H "$$M" | $(JSON) '[i["opportunities"] for i in d["data"]["items"] if i["cardId"] == "base1-4"][0]'; \
	BEFORE=$$(curl -s $(API)/collection -H "$$M" | $(JSON) '[{k: v for k, v in i.items() if k != "card"} for i in d["data"]["items"]]'); \
	printf '%-34s' "quero o que ja tenho -> 409"; curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$W -H "$$M" -H "$$J" -d '{"cardId":"sv03.5-151"}'; \
	AFTER=$$(curl -s $(API)/collection -H "$$M" | $(JSON) '[{k: v for k, v in i.items() if k != "card"} for i in d["data"]["items"]]'); \
	printf '%-34s' "colecao nao muda -> igual";   [ "$$BEFORE" = "$$AFTER" ] && echo igual || echo DIFERENTE; \
	ITEM=$$(curl -s -X POST $$W -H "$$M" -H "$$J" -d '{"cardId":"sv03.5-006"}' | $(JSON) 'd["data"]["item"]["id"]'); \
	printf '%-34s' "quero o que nao tenho -> 201"; echo "item $$ITEM"; \
	printf '%-34s' "repetir -> 409";              curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$W -H "$$M" -H "$$J" -d '{"cardId":"sv03.5-006"}'; \
	printf '%-34s' "sem cardId -> 400";           curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$W -H "$$M" -H "$$J" -d '{}'; \
	printf '%-34s' "campo extra -> 400";          curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$W -H "$$M" -H "$$J" -d '{"cardId":"base1-4","finish":"HOLO"}'; \
	printf '%-34s' "carta inexistente -> 404";    curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$W -H "$$M" -H "$$J" -d '{"cardId":"nao-existe-999"}'; \
	printf '%-34s' "ash apaga da misty -> 403";   curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X DELETE $$W/$$ITEM -H "Authorization: Bearer $$ASH"; \
	printf '%-34s' "admin apaga da misty -> 403"; curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X DELETE $$W/$$ITEM -H "Authorization: Bearer $$ADMIN"; \
	printf '%-34s' "id nao uuid -> 400";          curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X DELETE $$W/abc -H "$$M"; \
	printf '%-34s' "item inexistente -> 404";     curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X DELETE $$W/00000000-0000-4000-8000-000000000000 -H "$$M"; \
	printf '%-34s' "apagar -> 204";               curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X DELETE $$W/$$ITEM -H "$$M"; \
	printf '%-34s' "apagar de novo -> 404";       curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X DELETE $$W/$$ITEM -H "$$M"
	@echo ""

test-listings: ## smoke test dos anuncios (#14, #15) com os usuarios do seed
	@echo ""
	@echo "anuncios"
	@$(PSQL) -c "DELETE FROM \"Listing\" WHERE description = 'make-test';" > /dev/null
	@ASH=$$($(LOGIN) '{"email":"ash@pokebox.dev","password":"pokebox123"}' | $(JSON) 'd["data"]["token"]'); \
	MISTY=$$($(LOGIN) '{"email":"misty@pokebox.dev","password":"pokebox123"}' | $(JSON) 'd["data"]["token"]'); \
	ADMIN=$$($(LOGIN) '{"email":"admin@pokebox.dev","password":"pokebox123"}' | $(JSON) 'd["data"]["token"]'); \
	A="Authorization: Bearer $$ASH"; M="Authorization: Bearer $$MISTY"; AD="Authorization: Bearer $$ADMIN"; J='Content-Type: application/json'; L=$(API)/listings; \
	ULTRA=$$(curl -s $(API)/collection -H "$$A" | $(JSON) '[i["id"] for i in d["data"]["items"] if i["cardId"] == "sv01-196"][0]'); \
	MITEM=$$(curl -s $(API)/collection -H "$$M" | $(JSON) 'd["data"]["items"][0]["id"]'); \
	printf '%-34s' "listar sem token -> 200";      curl -s -o /dev/null -w 'HTTP %{http_code}\n' $$L; \
	printf '%-34s' "anuncios do seed -> 2";        curl -s $$L | $(JSON) 'len(d["data"]["items"])'; \
	printf '%-34s' "filtro cardId -> [base1-4]";   curl -s "$$L?cardId=base1-4" | $(JSON) '[i["card"]["id"] for i in d["data"]["items"]]'; \
	printf '%-34s' "filtro username -> [misty]";   curl -s "$$L?username=misty" | $(JSON) 'sorted(set(i["owner"]["username"] for i in d["data"]["items"]))'; \
	printf '%-34s' "limit 1 -> hasNextPage True";  curl -s "$$L?limit=1" | $(JSON) 'd["pagination"]["hasNextPage"]'; \
	printf '%-34s' "limit 0 -> limit minimo e 1";  curl -s "$$L?limit=0" | $(JSON) 'd["details"][0]["message"]'; \
	printf '%-34s' "sem campos internos -> []";    curl -s $$L | $(JSON) '[k for i in d["data"]["items"] for k in ("userId","reservedQuantity","isPublic","email") if k in str(i)]'; \
	printf '%-34s' "cards/base1-4 listings -> ash"; curl -s $(API)/cards/base1-4 | $(JSON) '[i["owner"]["username"] for i in d["data"]["listings"]]'; \
	printf '%-34s' "criar sem token -> 401";       curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$L -H "$$J" -d '{"collectionItemId":"'$$ULTRA'","quantity":1}'; \
	printf '%-34s' "campo extra -> 400";           curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$L -H "$$A" -H "$$J" -d '{"collectionItemId":"'$$ULTRA'","quantity":1,"price":10}'; \
	printf '%-34s' "item inexistente -> 404";      curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$L -H "$$A" -H "$$J" -d '{"collectionItemId":"00000000-0000-4000-8000-000000000000","quantity":1}'; \
	printf '%-34s' "item da misty -> 403";         curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$L -H "$$A" -H "$$J" -d '{"collectionItemId":"'$$MITEM'","quantity":1,"description":"make-test"}'; \
	printf '%-34s' "mais do que tem (5 de 4) -> 422"; curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$L -H "$$A" -H "$$J" -d '{"collectionItemId":"'$$ULTRA'","quantity":5,"description":"make-test"}'; \
	LID=$$(curl -s -X POST $$L -H "$$A" -H "$$J" -d '{"collectionItemId":"'$$ULTRA'","quantity":2,"description":"make-test"}' | $(JSON) 'd["data"]["listing"]["id"]'); \
	printf '%-34s' "anunciar 2 de 4 -> 201";       echo "anuncio $$LID"; \
	printf '%-34s' "mais 3 (2+3 > 4) -> 422";      curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$L -H "$$A" -H "$$J" -d '{"collectionItemId":"'$$ULTRA'","quantity":3,"description":"make-test"}'; \
	LID2=$$(curl -s -X POST $$L -H "$$A" -H "$$J" -d '{"collectionItemId":"'$$ULTRA'","quantity":2,"description":"make-test"}' | $(JSON) 'd["data"]["listing"]["status"] + " " + d["data"]["listing"]["id"]'); \
	printf '%-34s' "mais 2 (2+2 = 4) -> ACTIVE";   echo "$$LID2"; LID2=$${LID2#* }; \
	printf '%-34s' "apagar com anuncio aberto -> 409"; curl -s -X DELETE $(API)/collection/$$ULTRA -H "$$A" | $(JSON) 'd["error"][:30]'; \
	printf '%-34s' "subir para 3 -> 422";          curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$L/$$LID -H "$$A" -H "$$J" -d '{"quantity":3}'; \
	printf '%-34s' "baixar para 1 -> 200";         curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$L/$$LID -H "$$A" -H "$$J" -d '{"quantity":1}'; \
	printf '%-34s' "colecao abaixo anuncios -> 422"; curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $(API)/collection/$$ULTRA -H "$$A" -H "$$J" -d '{"quantity":2}'; \
	printf '%-34s' "colecao cobre anuncios -> 200"; curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $(API)/collection/$$ULTRA -H "$$A" -H "$$J" -d '{"quantity":4}'; \
	printf '%-34s' "descricao em branco -> None";  curl -s -X PATCH $$L/$$LID -H "$$A" -H "$$J" -d '{"description":"   "}' | $(JSON) 'd["data"]["listing"]["description"]'; \
	printf '%-34s' "misty altera do ash -> 403";   curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$L/$$LID -H "$$M" -H "$$J" -d '{"quantity":1}'; \
	printf '%-34s' "pausar -> 200";                curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$L/$$LID -H "$$A" -H "$$J" -d '{"status":"PAUSED"}'; \
	printf '%-34s' "pausado some da vitrine -> 404"; curl -s -o /dev/null -w 'HTTP %{http_code}\n' $$L/$$LID; \
	printf '%-34s' "dono ve o pausado -> 200";     curl -s -o /dev/null -w 'HTTP %{http_code}\n' $$L/$$LID -H "$$A"; \
	printf '%-34s' "reativar -> 200";              curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$L/$$LID -H "$$A" -H "$$J" -d '{"status":"ACTIVE"}'; \
	printf '%-34s' "ver ativo sem token -> 200";   curl -s -o /dev/null -w 'HTTP %{http_code}\n' $$L/$$LID; \
	printf '%-34s' "admin muda qtd -> 403";        curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$L/$$LID -H "$$AD" -H "$$J" -d '{"quantity":1}'; \
	printf '%-34s' "admin pausa -> 422";           curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$L/$$LID -H "$$AD" -H "$$J" -d '{"status":"PAUSED"}'; \
	printf '%-34s' "dono bloqueia -> 403";         curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$L/$$LID -H "$$A" -H "$$J" -d '{"status":"BLOCKED"}'; \
	printf '%-34s' "admin bloqueia -> 200";        curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$L/$$LID -H "$$AD" -H "$$J" -d '{"status":"BLOCKED"}'; \
	printf '%-34s' "dono mexe no bloqueado -> 403"; curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$L/$$LID -H "$$A" -H "$$J" -d '{"status":"ACTIVE"}'; \
	printf '%-34s' "admin desbloqueia -> 200";     curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$L/$$LID -H "$$AD" -H "$$J" -d '{"status":"PAUSED"}'; \
	printf '%-34s' "fechar -> 200";                curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$L/$$LID -H "$$A" -H "$$J" -d '{"status":"CLOSED"}'; \
	printf '%-34s' "mexer no fechado -> 422";      curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$L/$$LID -H "$$A" -H "$$J" -d '{"description":"de novo"}'; \
	curl -s -o /dev/null -X PATCH $$L/$$LID2 -H "$$A" -H "$$J" -d '{"status":"CLOSED"}'; \
	printf '%-34s' "apagar so com historico -> 409"; curl -s -X DELETE $(API)/collection/$$ULTRA -H "$$A" | $(JSON) 'd["error"][:30]'; \
	printf '%-34s' "meus tem o fechado -> True"; curl -s $$L/me -H "$$A" | $(JSON) 'any(i["id"] == "'$$LID'" and i["status"] == "CLOSED" for i in d["data"]["items"])'; \
	printf '%-34s' "meus sem token -> 401";        curl -s -o /dev/null -w 'HTTP %{http_code}\n' $$L/me; \
	printf '%-34s' "id nao uuid -> 400";           curl -s -o /dev/null -w 'HTTP %{http_code}\n' $$L/abc; \
	printf '%-34s' "inexistente -> 404";           curl -s -o /dev/null -w 'HTTP %{http_code}\n' $$L/00000000-0000-4000-8000-000000000000
	@$(PSQL) -c "DELETE FROM \"Listing\" WHERE description = 'make-test';" > /dev/null
	@echo ""

test-offers: ## smoke test das ofertas (#16, #17) com os usuarios do seed
	@echo ""
	@echo "ofertas"
	@$(PSQL) -c "DELETE FROM \"OfferItem\" WHERE \"offerId\" IN (SELECT o.id FROM \"Offer\" o JOIN \"Listing\" l ON l.id = o.\"listingId\" WHERE o.message = 'make-test' OR l.description = 'make-test'); DELETE FROM \"Offer\" o USING \"Listing\" l WHERE l.id = o.\"listingId\" AND (o.message = 'make-test' OR l.description = 'make-test'); DELETE FROM \"Listing\" WHERE description = 'make-test';" > /dev/null
	@ASH=$$($(LOGIN) '{"email":"ash@pokebox.dev","password":"pokebox123"}' | $(JSON) 'd["data"]["token"]'); \
	MISTY=$$($(LOGIN) '{"email":"misty@pokebox.dev","password":"pokebox123"}' | $(JSON) 'd["data"]["token"]'); \
	ADMIN=$$($(LOGIN) '{"email":"admin@pokebox.dev","password":"pokebox123"}' | $(JSON) 'd["data"]["token"]'); \
	A="Authorization: Bearer $$ASH"; M="Authorization: Bearer $$MISTY"; AD="Authorization: Bearer $$ADMIN"; J='Content-Type: application/json'; L=$(API)/listings; O=$(API)/offers; \
	PIKA=$$(curl -s $(API)/collection -H "$$A" | $(JSON) '[i["id"] for i in d["data"]["items"] if i["cardId"] == "base1-58"][0]'); \
	ULTRA=$$(curl -s $(API)/collection -H "$$A" | $(JSON) '[i["id"] for i in d["data"]["items"] if i["cardId"] == "sv01-196"][0]'); \
	FIRE=$$(curl -s $(API)/collection -H "$$M" | $(JSON) '[i["id"] for i in d["data"]["items"] if i["cardId"] == "sve-002"][0]'); \
	CHARIZARD=$$(curl -s "$$L?cardId=base1-4" | $(JSON) 'd["data"]["items"][0]["id"]'); \
	BLASTOISE=$$(curl -s "$$L?cardId=base1-2" | $(JSON) 'd["data"]["items"][0]["id"]'); \
	SEED=$$(curl -s "$$O/me?status=PROPOSED" -H "$$M" | $(JSON) '[o["id"] for o in d["data"]["sent"] if o["listing"]["id"] == "'$$CHARIZARD'"][0]'); \
	printf '%-42s' "misty sent tem a do seed -> True";   curl -s $$O/me -H "$$M" | $(JSON) 'any(o["id"] == "'$$SEED'" for o in d["data"]["sent"])'; \
	printf '%-42s' "ash received tem a do seed -> True"; curl -s $$O/me -H "$$A" | $(JSON) 'any(o["id"] == "'$$SEED'" for o in d["data"]["received"])'; \
	printf '%-42s' "itens da do seed -> [Mew]";          curl -s $$O/$$SEED -H "$$A" | $(JSON) '[i["card"]["name"] for i in d["data"]["offer"]["items"]]'; \
	printf '%-42s' "sem campos internos -> []";          curl -s $$O/me -H "$$M" | $(JSON) '[k for k in ("userId","proposerId","reservedQuantity","isPublic","email") if chr(34)+k+chr(34) in str(d).replace(chr(39),chr(34))]'; \
	printf '%-42s' "filtro status invalido -> 400";      curl -s -o /dev/null -w 'HTTP %{http_code}\n' "$$O/me?status=OPEN" -H "$$M"; \
	printf '%-42s' "me sem token -> 401";                curl -s -o /dev/null -w 'HTTP %{http_code}\n' $$O/me; \
	printf '%-42s' "misty 2a oferta no Charizard -> 409"; curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$L/$$CHARIZARD/offers -H "$$M" -H "$$J" -d '{"quantity":1,"message":"make-test","items":[{"collectionItemId":"'$$FIRE'","quantity":1}]}'; \
	printf '%-42s' "ash no proprio anuncio -> 422";      curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$L/$$CHARIZARD/offers -H "$$A" -H "$$J" -d '{"quantity":1,"message":"make-test","items":[{"collectionItemId":"'$$PIKA'","quantity":1}]}'; \
	printf '%-42s' "sem token -> 401";                   curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$L/$$BLASTOISE/offers -H "$$J" -d '{"quantity":1,"items":[{"collectionItemId":"'$$PIKA'","quantity":1}]}'; \
	printf '%-42s' "items vazio -> 400";                 curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$L/$$BLASTOISE/offers -H "$$A" -H "$$J" -d '{"quantity":1,"message":"make-test","items":[]}'; \
	printf '%-42s' "item repetido -> 400";               curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$L/$$BLASTOISE/offers -H "$$A" -H "$$J" -d '{"quantity":1,"message":"make-test","items":[{"collectionItemId":"'$$PIKA'","quantity":1},{"collectionItemId":"'$$PIKA'","quantity":1}]}'; \
	printf '%-42s' "oferecer item da misty -> 403";      curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$L/$$BLASTOISE/offers -H "$$A" -H "$$J" -d '{"quantity":1,"message":"make-test","items":[{"collectionItemId":"'$$FIRE'","quantity":1}]}'; \
	printf '%-42s' "item inexistente -> 404";            curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$L/$$BLASTOISE/offers -H "$$A" -H "$$J" -d '{"quantity":1,"message":"make-test","items":[{"collectionItemId":"00000000-0000-4000-8000-000000000000","quantity":1}]}'; \
	printf '%-42s' "Pikachu 5 de 3 -> 422";              curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$L/$$BLASTOISE/offers -H "$$A" -H "$$J" -d '{"quantity":1,"message":"make-test","items":[{"collectionItemId":"'$$PIKA'","quantity":5}]}'; \
	printf '%-42s' "quer 2, anuncio tem 1 -> 422";       curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$L/$$BLASTOISE/offers -H "$$A" -H "$$J" -d '{"quantity":2,"message":"make-test","items":[{"collectionItemId":"'$$PIKA'","quantity":1}]}'; \
	printf '%-42s' "anuncio inexistente -> 404";         curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$L/00000000-0000-4000-8000-000000000000/offers -H "$$A" -H "$$J" -d '{"quantity":1,"message":"make-test","items":[{"collectionItemId":"'$$PIKA'","quantity":1}]}'; \
	OID=$$(curl -s -X POST $$L/$$BLASTOISE/offers -H "$$A" -H "$$J" -d '{"quantity":1,"message":"make-test","items":[{"collectionItemId":"'$$PIKA'","quantity":1}]}' | $(JSON) 'd["data"]["offer"]["id"]'); \
	printf '%-42s' "ash oferece Pikachu -> 1 item";      curl -s $$O/$$OID -H "$$A" | $(JSON) 'len(d["data"]["offer"]["items"])'; \
	printf '%-42s' "misty ve a oferta -> 200";           curl -s -o /dev/null -w 'HTTP %{http_code}\n' $$O/$$OID -H "$$M"; \
	printf '%-42s' "admin ve oferta alheia -> 404";      curl -s -o /dev/null -w 'HTTP %{http_code}\n' $$O/$$OID -H "$$AD"; \
	printf '%-42s' "id nao uuid -> 400";                 curl -s -o /dev/null -w 'HTTP %{http_code}\n' $$O/abc -H "$$A"; \
	printf '%-42s' "ash aceita a propria -> 403";        curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$O/$$OID/status -H "$$A" -H "$$J" -d '{"status":"ACCEPTED"}'; \
	printf '%-42s' "misty cancela a do ash -> 403";      curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$O/$$OID/status -H "$$M" -H "$$J" -d '{"status":"CANCELED"}'; \
	printf '%-42s' "admin recusa -> 403";                curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$O/$$OID/status -H "$$AD" -H "$$J" -d '{"status":"REJECTED"}'; \
	printf '%-42s' "voltar para PROPOSED -> 400";        curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$O/$$OID/status -H "$$M" -H "$$J" -d '{"status":"PROPOSED"}'; \
	printf '%-42s' "misty recusa -> REJECTED []";        curl -s -X PATCH $$O/$$OID/status -H "$$M" -H "$$J" -d '{"status":"REJECTED"}' | $(JSON) 'd["data"]["offer"]["status"] + " " + str(d["data"]["offer"]["items"])'; \
	printf '%-42s' "ash cancela recusada -> 422 RN-06";  curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$O/$$OID/status -H "$$A" -H "$$J" -d '{"status":"CANCELED"}'; \
	printf '%-42s' "misty aceita recusada -> 422 RN-06"; curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$O/$$OID/status -H "$$M" -H "$$J" -d '{"status":"ACCEPTED"}'; \
	OID2=$$(curl -s -X POST $$L/$$BLASTOISE/offers -H "$$A" -H "$$J" -d '{"quantity":1,"message":"make-test","items":[{"collectionItemId":"'$$PIKA'","quantity":1}]}' | $(JSON) 'd["data"]["offer"]["id"]'); \
	printf '%-42s' "nova oferta apos recusa -> 200";     curl -s -o /dev/null -w 'HTTP %{http_code}\n' $$O/$$OID2 -H "$$A"; \
	printf '%-42s' "ash cancela -> CANCELED";            curl -s -X PATCH $$O/$$OID2/status -H "$$A" -H "$$J" -d '{"status":"CANCELED"}' | $(JSON) 'd["data"]["offer"]["status"]'; \
	UL=$$(curl -s -X POST $$L -H "$$A" -H "$$J" -d '{"collectionItemId":"'$$ULTRA'","quantity":1,"description":"make-test"}' | $(JSON) 'd["data"]["listing"]["id"]'); \
	OID3=$$(curl -s -X POST $$L/$$UL/offers -H "$$M" -H "$$J" -d '{"quantity":1,"message":"make-test","items":[{"collectionItemId":"'$$FIRE'","quantity":2}]}' | $(JSON) 'd["data"]["offer"]["id"]'); \
	printf '%-42s' "misty oferece 2 Fire Energy -> 200"; curl -s -o /dev/null -w 'HTTP %{http_code}\n' $$O/$$OID3 -H "$$M"; \
	curl -s -o /dev/null -X PATCH $$L/$$UL -H "$$A" -H "$$J" -d '{"status":"PAUSED"}'; \
	printf '%-42s' "anuncio pausado nao recebe -> 404";  curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST $$L/$$UL/offers -H "$$M" -H "$$J" -d '{"quantity":1,"message":"make-test","items":[{"collectionItemId":"'$$FIRE'","quantity":1}]}'; \
	printf '%-42s' "pausar mantem a oferta -> PROPOSED"; curl -s $$O/$$OID3 -H "$$M" | $(JSON) 'd["data"]["offer"]["status"]'; \
	printf '%-42s' "aceitar com pausado -> 422";         curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$O/$$OID3/status -H "$$A" -H "$$J" -d '{"status":"ACCEPTED"}'; \
	curl -s -o /dev/null -X PATCH $$L/$$UL -H "$$A" -H "$$J" -d '{"status":"ACTIVE"}'; \
	printf '%-42s' "ash aceita -> ACCEPTED";             curl -s -X PATCH $$O/$$OID3/status -H "$$A" -H "$$J" -d '{"status":"ACCEPTED"}' | $(JSON) 'd["data"]["offer"]["status"] + " " + str(len(d["data"]["offer"]["items"]))'; \
	printf '%-42s' "misty recusa aceita -> 403";         curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$O/$$OID3/status -H "$$M" -H "$$J" -d '{"status":"REJECTED"}'; \
	printf '%-42s' "ash cancela aceita -> 403";          curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$O/$$OID3/status -H "$$A" -H "$$J" -d '{"status":"CANCELED"}'; \
	printf '%-42s' "aceitar aceita -> 422 RN-06";        curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$O/$$OID3/status -H "$$A" -H "$$J" -d '{"status":"ACCEPTED"}'; \
	OID4=$$(curl -s -X POST $$L/$$UL/offers -H "$$M" -H "$$J" -d '{"quantity":1,"message":"make-test","items":[{"collectionItemId":"'$$FIRE'","quantity":1}]}' | $(JSON) 'd["data"]["offer"]["id"]'); \
	printf '%-42s' "misty oferece de novo -> PROPOSED";  curl -s $$O/$$OID4 -H "$$M" | $(JSON) 'd["data"]["offer"]["status"]'; \
	curl -s -o /dev/null -X PATCH $$L/$$UL -H "$$A" -H "$$J" -d '{"status":"CLOSED"}'; \
	printf '%-42s' "fechar cancela -> CANCELED []";      curl -s $$O/$$OID4 -H "$$M" | $(JSON) 'd["data"]["offer"]["status"] + " " + str(d["data"]["offer"]["items"])'; \
	printf '%-42s' "fechar nao mexe na aceita -> ACCEPTED 1"; curl -s $$O/$$OID3 -H "$$M" | $(JSON) 'd["data"]["offer"]["status"] + " " + str(len(d["data"]["offer"]["items"]))'; \
	UL2=$$(curl -s -X POST $$L -H "$$A" -H "$$J" -d '{"collectionItemId":"'$$ULTRA'","quantity":1,"description":"make-test"}' | $(JSON) 'd["data"]["listing"]["id"]'); \
	OID5=$$(curl -s -X POST $$L/$$UL2/offers -H "$$M" -H "$$J" -d '{"quantity":1,"message":"make-test","items":[{"collectionItemId":"'$$FIRE'","quantity":1}]}' | $(JSON) 'd["data"]["offer"]["id"]'); \
	curl -s -o /dev/null -X PATCH $$L/$$UL2 -H "$$AD" -H "$$J" -d '{"status":"BLOCKED"}'; \
	printf '%-42s' "bloquear cancela -> CANCELED";       curl -s $$O/$$OID5 -H "$$M" | $(JSON) 'd["data"]["offer"]["status"]'; \
	curl -s -o /dev/null -X PATCH $$L/$$UL2 -H "$$AD" -H "$$J" -d '{"status":"PAUSED"}'; \
	printf '%-42s' "desbloquear nao reabre -> CANCELED"; curl -s $$O/$$OID5 -H "$$M" | $(JSON) 'd["data"]["offer"]["status"]'; \
	curl -s -o /dev/null -X PATCH $$L/$$UL2 -H "$$A" -H "$$J" -d '{"status":"CLOSED"}'; \
	MEW=$$(curl -s $(API)/collection -H "$$M" | $(JSON) '[i["id"] for i in d["data"]["items"] if i["cardId"] == "sv03.5-151"][0]'); \
	printf '%-42s' "apagar carta em oferta aberta -> 409";  curl -s -X DELETE $(API)/collection/$$MEW -H "$$M" | $(JSON) 'd["error"][:36]'; \
	printf '%-42s' "apagar carta em oferta aceita -> 409";  curl -s -X DELETE $(API)/collection/$$FIRE -H "$$M" | $(JSON) 'd["error"][:36]'; \
	curl -s -o /dev/null -X PATCH $(API)/collection/$$MEW -H "$$M" -H "$$J" -d '{"quantity":0}'; \
	printf '%-42s' "aceitar com Mew zerado -> 422";         curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$O/$$SEED/status -H "$$A" -H "$$J" -d '{"status":"ACCEPTED"}'; \
	curl -s -o /dev/null -X PATCH $(API)/collection/$$MEW -H "$$M" -H "$$J" -d '{"quantity":1}'; \
	UL3=$$(curl -s -X POST $$L -H "$$A" -H "$$J" -d '{"collectionItemId":"'$$ULTRA'","quantity":2,"description":"make-test"}' | $(JSON) 'd["data"]["listing"]["id"]'); \
	OID6=$$(curl -s -X POST $$L/$$UL3/offers -H "$$M" -H "$$J" -d '{"quantity":2,"message":"make-test","items":[{"collectionItemId":"'$$FIRE'","quantity":1}]}' | $(JSON) 'd["data"]["offer"]["id"]'); \
	curl -s -o /dev/null -X PATCH $$L/$$UL3 -H "$$A" -H "$$J" -d '{"quantity":1}'; \
	printf '%-42s' "aceitar com anuncio menor -> 422";      curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$O/$$OID6/status -H "$$A" -H "$$J" -d '{"status":"ACCEPTED"}'; \
	printf '%-42s' "oferta segue aberta -> PROPOSED";       curl -s $$O/$$OID6 -H "$$M" | $(JSON) 'd["data"]["offer"]["status"]'; \
	curl -s -o /dev/null -X PATCH $$L/$$UL3 -H "$$A" -H "$$J" -d '{"status":"CLOSED"}'; \
	printf '%-42s' "filtro ACCEPTED -> so aceitas";      curl -s "$$O/me?status=ACCEPTED" -H "$$M" | $(JSON) 'sorted(set(o["status"] for o in d["data"]["sent"]))'; \
	printf '%-42s' "misty cancela aceita presa -> CANCELED 0"; curl -s -X PATCH $$O/$$OID3/status -H "$$M" -H "$$J" -d '{"status":"CANCELED"}' | $(JSON) 'd["data"]["offer"]["status"] + " " + str(len(d["data"]["offer"]["items"]))'; \
	printf '%-42s' "cancelar de novo -> 422 RN-06";      curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X PATCH $$O/$$OID3/status -H "$$M" -H "$$J" -d '{"status":"CANCELED"}'; \
	printf '%-42s' "do seed segue aberta -> PROPOSED";   curl -s $$O/$$SEED -H "$$M" | $(JSON) 'd["data"]["offer"]["status"]'
	@$(PSQL) -c "DELETE FROM \"OfferItem\" WHERE \"offerId\" IN (SELECT o.id FROM \"Offer\" o JOIN \"Listing\" l ON l.id = o.\"listingId\" WHERE o.message = 'make-test' OR l.description = 'make-test'); DELETE FROM \"Offer\" o USING \"Listing\" l WHERE l.id = o.\"listingId\" AND (o.message = 'make-test' OR l.description = 'make-test'); DELETE FROM \"Listing\" WHERE description = 'make-test';" > /dev/null
	@echo ""
