@echo off
echo ========================================
echo MedManager-PRO2.0 - Setup Automatizado
echo ========================================
echo.

echo [1/7] Instalando dependencias do frontend...
call npm install react-hook-form @hookform/resolvers react-input-mask recharts
if %errorlevel% neq 0 (
    echo ERRO: Falha ao instalar dependencias do frontend
    pause
    exit /b 1
)

echo.
echo [2/7] Instalando dependencias de tipos...
call npm install --save-dev @types/react-input-mask
if %errorlevel% neq 0 (
    echo ERRO: Falha ao instalar dependencias de tipos
    pause
    exit /b 1
)

echo.
echo [3/7] Instalando multer para upload de arquivos...
cd api
call npm install multer
call npm install --save-dev @types/multer
if %errorlevel% neq 0 (
    echo ERRO: Falha ao instalar multer
    pause
    exit /b 1
)
cd ..

echo.
echo [4/7] Gerando cliente Prisma...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERRO: Falha ao gerar cliente Prisma
    pause
    exit /b 1
)

echo.
echo [5/7] Criando diretorios de upload...
if not exist "uploads\tenants" mkdir uploads\tenants
if not exist "certificates" mkdir certificates
echo Diretorios criados com sucesso!

echo.
echo [6/7] Verificando arquivo .env...
if not exist ".env" (
    echo AVISO: Arquivo .env nao encontrado!
    echo Por favor, crie o arquivo .env com a variavel ENCRYPTION_KEY
    echo Execute: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    echo Para gerar uma chave segura.
) else (
    findstr /C:"ENCRYPTION_KEY" .env >nul
    if %errorlevel% neq 0 (
        echo AVISO: ENCRYPTION_KEY nao encontrada no .env
        echo Adicione: ENCRYPTION_KEY=sua-chave-de-32-caracteres
    ) else (
        echo ENCRYPTION_KEY encontrada no .env
    )
)

echo.
echo [7/7] Executando migrations do Prisma...
echo IMPORTANTE: Certifique-se de que o schema.prisma foi atualizado!
echo Pressione qualquer tecla para continuar ou Ctrl+C para cancelar...
pause >nul
call npx prisma migrate dev --name add-tenant-settings
if %errorlevel% neq 0 (
    echo AVISO: Migration falhou. Verifique se o schema foi atualizado.
)

echo.
echo ========================================
echo Setup concluido!
echo ========================================
echo.
echo Proximos passos:
echo 1. Verifique se as rotas foram registradas no app principal
echo 2. Reinicie o servidor backend
echo 3. Teste as paginas no frontend
echo.
pause
