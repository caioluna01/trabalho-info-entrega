@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 (
  echo ERRO: nao foi possivel acessar a pasta do projeto.
  exit /b 1
)
set "RESULTADO=1"
set "DOCKER_EXECUTAVEL=docker"
where docker >nul 2>nul
if not errorlevel 1 goto verificar
if exist "%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe" (
  set "DOCKER_EXECUTAVEL=%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe"
  goto verificar
)
if exist "%ProgramFiles%\Docker\Docker\resources\bin\docker.exe" (
  set "DOCKER_EXECUTAVEL=%ProgramFiles%\Docker\Docker\resources\bin\docker.exe"
  goto verificar
)
echo ERRO: Docker nao encontrado. Instale e inicie o Docker Desktop.
goto fim
:verificar
"%DOCKER_EXECUTAVEL%" compose version >nul 2>nul
if errorlevel 1 (
  echo ERRO: Docker Compose nao encontrado. Atualize o Docker Desktop.
  goto fim
)
"%DOCKER_EXECUTAVEL%" info >nul 2>nul
if errorlevel 1 (
  echo ERRO: Docker indisponivel. Inicie o Docker Desktop com containers Linux.
  goto fim
)
"%DOCKER_EXECUTAVEL%" compose up --build -d --wait
if errorlevel 1 (
  echo ERRO: nao foi possivel iniciar. Confira a mensagem acima, a conexao e a porta 3000.
  goto fim
)
echo Aplicacao disponivel em http://localhost:3000
set "RESULTADO=0"
:fim
if /i not "%~1"=="--sem-pausa" pause
exit /b %RESULTADO%
