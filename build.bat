@echo off
cls
echo ==================================================
echo        Service Management App Build Selector      
echo ==================================================
echo Select build target:
echo 1) Web Version (Single-port Node web app)
echo 2) Electron Version (Desktop application)
echo ==================================================
set /p choice="Enter option (1 or 2): "

if "%choice%"=="1" goto BUILD_WEB
if "%choice%"=="2" goto BUILD_ELECTRON
echo Invalid choice. Exiting.
pause
exit /b

:BUILD_WEB
echo.
echo [1/5] Cleaning and preparing root 'dist' folder...
if exist dist rmdir /s /q dist
mkdir dist
mkdir dist\frontend
mkdir dist\backend

echo.
echo [2/5] Building frontend (Vite)...
call npm run frontend:build
if %errorlevel% neq 0 (
    echo Frontend build failed.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/5] Building backend (Webpack)...
call npx webpack --config webpack.config.js
if %errorlevel% neq 0 (
    echo Backend webpack build failed.
    pause
    exit /b %errorlevel%
)

echo.
echo [4/5] Copying frontend assets to 'dist/frontend'...
xcopy /E /I /Y "frontend\dist" "dist\frontend"

echo.
echo [5/5] Copying backend template views to 'dist/views'...
xcopy /E /I /Y "backend\views" "dist\views"

echo { > dist\package.json
echo   "name": "service-management-web", >> dist\package.json
echo   "version": "1.0.2", >> dist\package.json
echo   "description": "Service Management Web Application", >> dist\package.json
echo   "main": "backend/server.js", >> dist\package.json
echo   "scripts": { >> dist\package.json
echo     "start": "node backend/server.js" >> dist\package.json
echo   }, >> dist\package.json
echo   "dependencies": { >> dist\package.json
echo     "bcryptjs": "^3.0.3", >> dist\package.json
echo     "cors": "^2.8.5", >> dist\package.json
echo     "dotenv": "^16.4.5", >> dist\package.json
echo     "ejs": "^3.1.10", >> dist\package.json
echo     "express": "^4.21.1", >> dist\package.json
echo     "jsonwebtoken": "^9.0.3", >> dist\package.json
echo     "multer": "^2.1.1", >> dist\package.json
echo     "node-sqlite3-wasm": "^0.8.35" >> dist\package.json
echo   } >> dist\package.json
echo } >> dist\package.json

echo # Run Instructions for Web Build > dist\README.txt
echo. >> dist\README.txt
echo 1. Run: npm install >> dist\README.txt
echo 2. Start the server: npm start >> dist\README.txt
echo 3. Open http://localhost:5000 in your browser. >> dist\README.txt

echo ==================================================
echo 🎉 Web compilation completed successfully!
echo The production build is located in the 'dist' folder.
echo To run: cd dist ^&^& npm install ^&^& npm start
echo ==================================================
pause
exit /b

:BUILD_ELECTRON
echo.
echo Building Electron application package...
call npm run package
if %errorlevel% neq 0 (
    echo Electron package build failed.
    pause
    exit /b %errorlevel%
)
echo ==================================================
echo 🎉 Electron build completed successfully!
echo Check the 'release' folder for the executable.
echo ==================================================
pause
exit /b
