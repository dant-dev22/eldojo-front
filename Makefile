.PHONY: help start android ios web build-web typecheck install

.DEFAULT_GOAL := help

help:
	@echo "Available commands:"
	@echo "  make start      - Start Expo dev server (npx expo start)"
	@echo "  make android    - Start Expo and open on Android emulator/device"
	@echo "  make ios        - Start Expo and open on iOS simulator"
	@echo "  make web        - Start Expo and open in web browser"
	@echo "  make build-web  - Build static web bundle (expo export --platform web)"
	@echo "  make typecheck  - Run TypeScript type checking"
	@echo "  make install    - Install npm dependencies"

start:
	@npx expo start

android:
	@npx expo start --android

ios:
	@npx expo start --ios

web:
	@npx expo start --web

build-web:
	@npx expo export --platform web

typecheck:
	@npx tsc --noEmit

install:
	@npm install
