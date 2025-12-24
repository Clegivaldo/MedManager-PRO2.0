@echo off
REM Cores não funcionam bem no cmd, então vamos usar caracteres simples

setlocal enabledelayedexpansion

set API_URL=http://localhost:3333/api/v1

echo [TEST] Testando fluxo de login completo
echo.

REM 1. Login
echo [1/4] Fazendo login...
for /f "delims=" %%a in ('curl -s -X POST "%API_URL%/auth/login-tenant" -H "Content-Type: application/json" -d "{\"cnpj\":\"12345678000195\",\"email\":\"admin@farmaciademo.com.br\",\"password\":\"admin123\"}"') do (
    set LOGIN_RESPONSE=%%a
)

REM Extrair token usando Python
echo "%LOGIN_RESPONSE%" > temp_login.json
for /f "delims=" %%a in ('python -c "import json; data=json.load(open('temp_login.json')); print(data.get('data', {}).get('tokens', {}).get('accessToken', ''))"') do (
    set ACCESS_TOKEN=%%a
)

if "!ACCESS_TOKEN!"=="" (
    echo [ERROR] Falha no login!
    echo Resposta: !LOGIN_RESPONSE!
    goto :END
)

echo [OK] Login bem-sucedido!
echo Token: !ACCESS_TOKEN:~0,50!...
echo.

REM 2. Decodificar JWT
echo [2/4] Decodificando JWT...
for /f "delims=" %%a in ('python -c "import json; data=json.load(open('temp_login.json')); payload='!ACCESS_TOKEN!'; parts=payload.split('.'); import base64; payload_b64=parts[1]; padding=4-(len(payload_b64)%%4); payload_b64+='='*padding if padding!=4 else ''; decoded=base64.urlsafe_b64decode(payload_b64); payload_json=json.loads(decoded); print(json.dumps(payload_json, indent=2))"') do (
    echo %%a
)
echo.

REM 3. Testar dashboard
echo [3/4] Testando GET /api/v1/dashboard/metrics...
curl -s -X GET "%API_URL%/dashboard/metrics" -H "Authorization: Bearer !ACCESS_TOKEN!" | python -m json.tool 2>nul || curl -s -X GET "%API_URL%/dashboard/metrics" -H "Authorization: Bearer !ACCESS_TOKEN!"
echo.

REM Cleanup
del temp_login.json 2>nul

echo [4/4] Teste concluido!
:END
endlocal
