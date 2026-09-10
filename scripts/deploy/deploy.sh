#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "============================================="
echo " ElDojo FRONTEND Full Deploy (1 comando)"
echo " Root:  $PROJECT_ROOT"
echo " Builds 3: dist (público) + dist-admin + dist-student"
echo "============================================="
echo ""

# Chmod +x todos los scripts deploy que invocamos
chmod +x "$SCRIPT_DIR"/0[1-6]-*.sh

# Paso 1: Preflight validaciones (.env, backend, node, nginx syntax previo)
"$SCRIPT_DIR/01-preflight.sh"

# Paso 2: Build público (git pull + npm ci + expo export dist/)
"$SCRIPT_DIR/02-build-public.sh"

# Paso 3: Build admin EXPO_PUBLIC_APP_MODE=admin → dist-admin/
"$SCRIPT_DIR/03-build-admin.sh"

# Paso 4: Build student EXPO_PUBLIC_APP_MODE=student → dist-student/
"$SCRIPT_DIR/04-build-student.sh"

# Paso 5: Nginx apply: permisos, nginx -t, reload/reopen logs
"$SCRIPT_DIR/05-nginx-apply.sh"

# Paso 6: Smoke Tests 9/9 (front HTML, back health, endpoints S1)
"$SCRIPT_DIR/06-smoke-tests.sh"

echo ""
echo "🎉 FRONTEND deploy completo (Público + Admin + Student)."
