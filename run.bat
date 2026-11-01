@echo off
setlocal enabledelayedexpansion
title Fotonic Web Launcher
cd /d "%~dp0"

:MENU
cls
echo ========================================================
echo        FOTONIC - WEB SELEKSI FOTO KLIEN LAUNCHER       
echo ========================================================
echo.
echo Direktori Kerja : %~dp0
echo.

:: 1. Cek ketersediaan .env.local
if not exist ".env.local" (
    echo [PERINGATAN] File .env.local tidak ditemukan!
    if exist ".env.example" (
        echo Menyalin dari .env.example ke .env.local...
        copy ".env.example" ".env.local" >nul
        echo [OK] .env.local berhasil dibuat dari .env.example.
    ) else (
        echo [!] Harap buat file .env.local terlebih dahulu.
    )
    echo.
)

:: 2. Cek ketersediaan node_modules
if not exist "node_modules\" (
    echo [PERHATIAN] Folder node_modules belum ada.
    echo Menjalankan instalasi paket dependensi: npm install...
    echo Mohon tunggu sebentar...
    call npm install
    echo.
)

:: 3. Ambil TEST_DRIVE_FOLDER_ID dari .env.local secara dinamis jika tersedia
set "TARGET_FOLDER="
if exist ".env.local" (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env.local") do (
        if "%%A"=="TEST_DRIVE_FOLDER_ID" set "TARGET_FOLDER=%%B"
    )
)

echo Pilihan Menu:
echo   [1] Jalankan Next.js (Mode Development - Rekomendasi)
echo   [2] Build ^& Jalankan Next.js (Mode Production)
echo   [3] Jalankan Versi Streamlit (Python app.py)
echo   [4] Buka URL Uji Coba Demo Klien di Browser
echo   [5] Install / Update Dependensi (npm install)
echo   [6] Bersihkan Cache Next.js (Reset folder .next)
echo   [7] Keluar
echo.
set "PILIHAN="
set /p "PILIHAN=Pilih nomor menu [1-7]: "

if "%PILIHAN%"=="1" goto RUN_DEV
if "%PILIHAN%"=="2" goto RUN_PROD
if "%PILIHAN%"=="3" goto RUN_STREAMLIT
if "%PILIHAN%"=="4" goto OPEN_DEMO
if "%PILIHAN%"=="5" goto RUN_INSTALL
if "%PILIHAN%"=="6" goto CLEAN_CACHE
if "%PILIHAN%"=="7" goto KELUAR

echo.
echo [!] Pilihan tidak valid. Silakan coba lagi.
ping 127.0.0.1 -n 3 >nul
goto MENU

:RUN_DEV
cls
echo ========================================================
echo   Menjalankan Next.js Development Server (Port 3000)   
echo ========================================================
echo   - Local   : http://localhost:3000
echo   - Network : http://192.168.1.11:3000
echo   - HP Demo : http://192.168.1.11:3000/?folder_id=1-NAhCpCPE6IgEkzqIJalkx4IzIfjVEHk
echo.

:: Bersihkan cache build jika ada sisa mode build (mencegah Cannot find module ./787.js)
if exist ".next\BUILD_ID" (
    echo [INFO] Membersihkan cache build production sebelumnya...
    rmdir /s /q ".next" >nul 2>&1
)

if not "!TARGET_FOLDER!"=="" (
    echo Membuka demo klien dengan TEST_DRIVE_FOLDER_ID dari .env.local...
    start "" "http://localhost:3000/?klien=Demo+Klien&folder_id=!TARGET_FOLDER!&max=15"
) else (
    echo Membuka http://localhost:3000...
    start "" "http://localhost:3000"
)
echo.
echo Tekan Ctrl + C untuk menghentikan server.
echo ========================================================
echo.
call npm run dev
pause
goto MENU

:RUN_PROD
cls
echo ========================================================
echo   Menyiapkan Next.js Production Build                   
echo ========================================================
echo Melakukan kompilasi 'npm run build'...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Gagal melakukan build aplikasi.
    pause
    goto MENU
)
echo.
echo Build sukses! Memulai server production 'npm start'...
start "" http://localhost:3000
call npm start
pause
goto MENU

:RUN_STREAMLIT
cls
echo ========================================================
echo   Menjalankan Prototype Streamlit Python (Port 8501)   
echo ========================================================
echo Mencoba menjalankan via Python / Streamlit...
echo.
where streamlit >nul 2>&1
if %errorlevel% equ 0 (
    streamlit run app.py
    pause
    goto MENU
)

where py >nul 2>&1
if %errorlevel% equ 0 (
    py -m streamlit run app.py
    pause
    goto MENU
)

where python >nul 2>&1
if %errorlevel% equ 0 (
    python -m streamlit run app.py
    pause
    goto MENU
)

echo [ERROR] Python / Streamlit tidak terdeteksi pada sistem.
echo Silakan install Python terlebih dahulu atau gunakan Next.js (Menu 1).
pause
goto MENU

:OPEN_DEMO
cls
echo Membuka URL demo di browser bawaan...
if not "!TARGET_FOLDER!"=="" (
    start "" "http://localhost:3000/?klien=Demo+Klien&folder_id=!TARGET_FOLDER!&max=15"
) else (
    start "" "http://localhost:3000"
)
ping 127.0.0.1 -n 3 >nul
goto MENU

:RUN_INSTALL
cls
echo Menjalankan 'npm install'...
call npm install
echo.
echo Selesai!
pause
goto MENU

:CLEAN_CACHE
cls
echo ========================================================
echo         Membersihkan Cache Next.js (.next)             
echo ========================================================
echo.
if exist ".next" (
    echo Menghapus folder .next...
    rmdir /s /q ".next"
    echo [OK] Folder .next berhasil dibersihkan!
) else (
    echo [INFO] Folder .next sudah bersih.
)
echo.
pause
goto MENU

:KELUAR
exit /b 0
