.PHONY: help start android ios web web-dev web-clear web-public web-public-clear web-app web-app-clear dashboard dashboard-clear build-web typecheck install kill-web kill-web-dev

EMAIL ?= dantedev22@gmail.com

.DEFAULT_GOAL := help

help:
	@echo "Available commands:"
	@echo "  make start                   - Start Expo dev server with Fast Refresh (no cache clear)"
	@echo "  make start-clear             - Start Expo dev server forcing cache clear"
	@echo "  make android                 - Start Expo and open on Android emulator/device"
	@echo "  make ios                     - Start Expo and open on iOS simulator"
	@echo "  make web                     - Start BOTH Expo WEB servers (public 8081 + admin 8082) with HMR on"
	@echo "  make web-clear               - Same as make web, but forcing cache clear (first run or cache issues)"
	@echo "  make web-public              - Start Expo WEB (public site + login) on port 8081 with HMR"
	@echo "  make web-public-clear        - Same as web-public but clearing cache"
	@echo "  make web-app                 - Start Expo WEB (admin dashboard) on port 8082 with HMR"
	@echo "  make web-app-clear           - Same as web-app but clearing cache"
	@echo "                                 Post-login redirects from 8081 (public) -> 8082 (admin)."
	@echo "  make dashboard               - DEV shortcut: Start admin dashboard (PORT 8088) WITH AUTO-LOGIN"
	@echo "                                   ⚡  No requiere login, salta directo al panel."
	@echo "                                   Default user: dantedev22@gmail.com (seeded admin)"
	@echo "                                   Override user: make dashboard EMAIL=otro@correo.com"
	@echo "                                   Requires: Backend API running on port 8000 + user exists in DB"
	@echo "                                   Runs on port 8088 to avoid conflict with standard admin 8082."
	@echo "  make dashboard-clear         - Same as dashboard, but forcing Expo cache clear"
	@echo "  make kill-web                - Kill any node processes listening on ports 8081 / 8082"
	@echo "  make kill-web-dev            - Kill process on port 8088 (dashboard dev server)"
	@echo "  make build-web               - Build static web bundle (expo export --platform web)"
	@echo "  make typecheck               - Run TypeScript type checking"
	@echo "  make install                 - Install npm dependencies"

start:
	@FAST_REFRESH=true npx expo start

start-clear:
	@FAST_REFRESH=true npx expo start --clear

android:
	@FAST_REFRESH=true npx expo start --android

ios:
	@FAST_REFRESH=true npx expo start --ios

web:
	@cmd.exe //c start "Expo Web Public (8081)" bash -lc "cd \"$$(pwd)\" && FAST_REFRESH=true CHOKIDAR_USEPOLLING=true WATCHPACK_POLLING=true npx expo start --web --port 8081"
	@echo "Launched public web server on port 8081 (HMR + polling on)."
	@sleep 2
	@cmd.exe //c start "Expo Web Admin (8082)" bash -lc "cd \"$$(pwd)\" && FAST_REFRESH=true CHOKIDAR_USEPOLLING=true WATCHPACK_POLLING=true npx expo start --web --port 8082"
	@echo "Launched admin web server on port 8082 (HMR + polling on)."

web-clear:
	@cmd.exe //c start "Expo Web Public (8081)" bash -lc "cd \"$$(pwd)\" && FAST_REFRESH=true CHOKIDAR_USEPOLLING=true WATCHPACK_POLLING=true npx expo start --web --port 8081 --clear"
	@echo "Launched public web server on port 8081 (cache cleared + HMR)."
	@sleep 2
	@cmd.exe //c start "Expo Web Admin (8082)" bash -lc "cd \"$$(pwd)\" && FAST_REFRESH=true CHOKIDAR_USEPOLLING=true WATCHPACK_POLLING=true npx expo start --web --port 8082 --clear"
	@echo "Launched admin web server on port 8082 (cache cleared + HMR)."

web-public:
	@FAST_REFRESH=true CHOKIDAR_USEPOLLING=true WATCHPACK_POLLING=true npx expo start --web --port 8081

web-public-clear:
	@FAST_REFRESH=true CHOKIDAR_USEPOLLING=true WATCHPACK_POLLING=true npx expo start --web --port 8081 --clear

web-app:
	@FAST_REFRESH=true CHOKIDAR_USEPOLLING=true WATCHPACK_POLLING=true npx expo start --web --port 8082

web-app-clear:
	@FAST_REFRESH=true CHOKIDAR_USEPOLLING=true WATCHPACK_POLLING=true npx expo start --web --port 8082 --clear

dashboard:
	@echo "[dashboard] auto-login email  : $(EMAIL)"
	@echo "[dashboard] server port       : 8088 (dedicado a dev-autologin, sin conflicto con 8082)"
	@echo "[dashboard] verifying backend health..."
	@curl -sS -o /dev/null --max-time 5 http://127.0.0.1:8000/api/v1/health && echo "[dashboard] backend OK" || echo "[dashboard] ⚠️  backend unreachable (start 'make start' in eldojo-backend-api first)"
	@EXPO_PUBLIC_DEV_AUTOLOGIN_EMAIL="$(EMAIL)" FAST_REFRESH=true CHOKIDAR_USEPOLLING=true WATCHPACK_POLLING=true npx expo start --web --port 8088

dashboard-clear:
	@echo "[dashboard-clear] auto-login email  : $(EMAIL)"
	@echo "[dashboard-clear] server port       : 8088 (dedicado a dev-autologin, sin conflicto con 8082)"
	@echo "[dashboard-clear] verifying backend health..."
	@curl -sS -o /dev/null --max-time 5 http://127.0.0.1:8000/api/v1/health && echo "[dashboard-clear] backend OK" || echo "[dashboard-clear] ⚠️  backend unreachable (start 'make start' in eldojo-backend-api first)"
	@EXPO_PUBLIC_DEV_AUTOLOGIN_EMAIL="$(EMAIL)" FAST_REFRESH=true CHOKIDAR_USEPOLLING=true WATCHPACK_POLLING=true npx expo start --web --port 8088 --clear

kill-web:
	@pids=$$(netstat -ano | grep -E ':(8081|8082)[[:space:]]' | grep LISTENING | awk '{print $$5}' | sort -u); \
	if [ -n "$$pids" ]; then \
		for pid in $$pids; do \
			taskkill.exe //F //PID $$pid 2>/dev/null && echo "Killed PID $$pid"; \
		done; \
	else \
		echo "No processes found on ports 8081/8082."; \
	fi; \
	echo "Ports 8081/8082 cleared."

kill-web-dev:
	@pids=$$(netstat -ano | grep -E ':8088[[:space:]]' | grep LISTENING | awk '{print $$5}' | sort -u); \
	if [ -n "$$pids" ]; then \
		for pid in $$pids; do \
			taskkill.exe //F //PID $$pid 2>/dev/null && echo "Killed PID $$pid"; \
		done; \
	else \
		echo "No process found on port 8088."; \
	fi; \
	echo "Port 8088 cleared."

build-web:
	@npx expo export --platform web

typecheck:
	@npx tsc --noEmit

install:
	@npm install
