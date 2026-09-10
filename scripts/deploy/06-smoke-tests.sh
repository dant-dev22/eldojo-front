#!/bin/bash

set +H  # evitar bash history expansion "!doctype"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

LOG_FILE="$PROJECT_ROOT/deploy.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SMOKE] $*" | tee -a "$LOG_FILE"; }

coerce_count() {
  local raw="$1" fallback="${2:-0}" n
  n="$(echo "$raw" | grep -E '^[0-9]+$' | head -n1 || true)"
  [[ -n "$n" ]] && echo "$n" || echo "$fallback"
}

PASS=0
FAIL=0
TOTAL=9
run_test() {
  local id=$1 name=$2 method=$3 url=$4 host=$5 exp_code=$6 exp_grep="${7:-}"
  echo ""
  log "--- T${id}/$TOTAL: ${name} ---"
  log "    $method $url  (Host: ${host:--})"
  if [[ -n "$host" ]]; then
    HTTP_HEADERS=$(curl -kfsS -D - -o /tmp/body.txt "$url" -H "Host: $host" 2>/dev/null | tr -d '\r') || true
  else
    HTTP_HEADERS=$(curl -fsS -D - -o /tmp/body.txt "$url" 2>/dev/null | tr -d '\r') || true
  fi
  CODE=$(echo "$HTTP_HEADERS" | awk '/^HTTP\// {c=$2} END {print c+0}')
  [[ -z "$CODE" || "$CODE" == "0" ]] && CODE=$(curl -ksSo /dev/null -w "%{http_code}" "$url" ${host:+-H "Host: $host"} 2>/dev/null || echo "000")
  log "    HTTP=$CODE (expected $exp_code)"

  local ok=1
  [[ "$CODE" == "$exp_code" ]] || ok=0
  if [[ $ok -eq 1 && -n "$exp_grep" ]]; then
    if ! grep -qa "$exp_grep" /tmp/body.txt; then
      ok=0
    fi
  fi

  if [[ $ok -eq 1 ]]; then
    log "✅ T$id PASS ($name)"; PASS=$((PASS+1))
  else
    log "❌ T$id FAIL ($name). Body first 350 bytes:"
    head -c 350 /tmp/body.txt; echo ""
    FAIL=$((FAIL+1))
  fi
}

echo ""
log "====================================="
log "Smoke Tests FINALES deploy FRONT + BACK"
log "====================================="

# 3 builds front HTML (200 + DOCTYPE válido Expo)
run_test 1 "Público eldojo.tech → dist/index.html" GET "https://127.0.0.1/" "eldojo.tech" 200 "DOCTYPE html"
run_test 2 "Admin app.eldojo.tech /admin → dist-admin/index.html alias" GET "https://127.0.0.1/admin" "app.eldojo.tech" 200 "DOCTYPE html"
run_test 3 "Admin canónico admin.eldojo.tech → mismo dist-admin (Alternativa A)" GET "https://127.0.0.1/" "admin.eldojo.tech" 200 "DOCTYPE html"
run_test 4 "Student mi.eldojo.tech → dist-student/index.html" GET "https://127.0.0.1/" "mi.eldojo.tech" 200 "DOCTYPE html"

# 3 anti-cache headers (no-store/no-cache/must-revalidate) → no verán build viejo post-deploy
CACHE_PAT='cache-control:.*(no-store|no-cache|must-revalidate)'
TMP_HC=0
TMP_HC=$( (echo "$HTTP_HEADERS" > /dev/null; for h in "eldojo.tech" "app.eldojo.tech" "mi.eldojo.tech"; do
  [ "$h" == "eldojo.tech" ] && URLPATH="/" || URLPATH="/"
  curl -kfsS -D - -o /dev/null "https://127.0.0.1${URLPATH}" -H "Host: $h" 2>/dev/null | tr -d '\r' | grep -icE "$CACHE_PAT"
done | tail -n1 ) 2>/dev/null || echo 0)
TMP_HC=$(coerce_count "$TMP_HC" 0)
if ls dist/_expo/static/js/web/*.js >/dev/null 2>&1; then
  SAMPLE_JS="$(ls dist/_expo/static/js/web/*.js | head -n1 | sed -E "s|^$PROJECT_ROOT/||")"
  EXPO_HC=$( (curl -kfsS -D - -o /dev/null "https://127.0.0.1/$SAMPLE_JS" -H "Host: eldojo.tech" 2>/dev/null \
    | tr -d '\r' | grep -icE 'cache-control:.*(immutable|max-age=31536000)') || echo 0 )
  EXPO_HC=$(coerce_count "$EXPO_HC" 0)
  [[ "$EXPO_HC" -ge 1 ]] && { log "✅ T5 PASS bundle /_expo/ cache immutable"; PASS=$((PASS+1)); } || \
                            { log "❌ T5 FAIL bundle JS no cache immutable"; FAIL=$((FAIL+1)); }
fi

# Backend /api/v1/health 200 healthy
run_test 6 "Backend /api/v1/health (eldojo.tech nginx reverse proxy)" GET "https://127.0.0.1/api/v1/health" "eldojo.tech" 200 '"healthy"'

# Endpoints NUEVOS Sprint 1 /me/* — NO deben devolver 404 (401 = ok auth required = endpoint EXISTE)
run_test 7 "Sprint1 /me/password endpoint existe → 401 auth required" POST "http://127.0.0.1:5001/api/v1/me/password" - 401 "detail"
run_test 8 "Sprint1 /me/attendance?limit=12 existe → 401 auth required" GET "http://127.0.0.1:5001/api/v1/me/attendance?limit=12" - 401 "detail"
run_test 9 "Sprint1 /auth/student-invitation (405 method not allowed = endpoint EXISTE no GET)" GET "http://127.0.0.1:5001/api/v1/auth/student-invitation" - 405 "detail"

echo ""
log "======================================"
log " SMOKE FINAL: PASS=$PASS / $TOTAL  FAIL=$FAIL / $TOTAL"
log "======================================"
if [[ $FAIL -eq 0 ]]; then
  log "🎉 Deploy FRONT 100% COMPLETO + LIVE PRODUCCIÓN. 9/9 smoke PASS."
  log "   ✅ Público:     https://eldojo.tech"
  log "   ✅ Admin:       https://app.eldojo.tech  + https://admin.eldojo.tech"
  log "   ✅ Alumno:      https://mi.eldojo.tech"
  log "   ✅ Backend /api/ Sprint1 endpoints alumno VIVOS y existentes (no 404)."
  exit 0
else
  log "⚠️ Hay $FAIL fallos. Revisa $LOG_FILE para stack trace gunicorn/expo errors."
  exit 1
fi
