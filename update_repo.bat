@echo off
setlocal enabledelayedexpansion
title Fotonic - Git Repository Sync (newversion)
cd /d "%~dp0"

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo ========================================================
    echo [ERROR] Git tidak terdeteksi pada sistem Anda!
    echo Silakan install Git terlebih dahulu: https://git-scm.com/
    echo ========================================================
    pause
    exit /b 1
)

set "DEFAULT_BRANCH=newversion"

:MENU
cls
echo ========================================================
echo        FOTONIC - GIT REPO SYNC MANAGER (GITHUB)
echo ========================================================
echo Direktori       : %~dp0
set "CURRENT_BRANCH=%DEFAULT_BRANCH%"
for /f "tokens=*" %%a in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%a"
echo Branch Aktif    : %CURRENT_BRANCH%
echo Default Push    : origin/%DEFAULT_BRANCH%
echo.

echo Status Perubahan Terkini:
echo --------------------------------------------------------
git status -s
if %errorlevel% neq 0 (
    echo Tidak dapat membaca status git.
)
echo --------------------------------------------------------
echo.
echo Pilihan Menu:
echo   [1] Push Update ke GitHub (Branch default: %DEFAULT_BRANCH%)
echo   [2] Tarik Pembaruan Terbaru dari GitHub (Git Pull %DEFAULT_BRANCH%)
echo   [3] Cek Status Detail ^& Riwayat Commit (Git Status ^& Log)
echo   [4] Pindah ke Branch Default (%DEFAULT_BRANCH%)
echo   [5] Batalkan Perubahan Lokal (Discard All Uncommitted Changes)
echo   [6] Keluar
echo.
set "PILIHAN="
set /p "PILIHAN=Pilih nomor menu [1-6]: "

if "%PILIHAN%"=="1" goto PUSH_REPO
if "%PILIHAN%"=="2" goto PULL_REPO
if "%PILIHAN%"=="3" goto STATUS_LOG
if "%PILIHAN%"=="4" goto SWITCH_DEFAULT
if "%PILIHAN%"=="5" goto DISCARD_CHANGES
if "%PILIHAN%"=="6" goto KELUAR

echo.
echo [!] Pilihan tidak valid. Silakan coba lagi.
ping 127.0.0.1 -n 3 >nul
goto MENU

:PUSH_REPO
cls
echo ========================================================
echo      PUSH UPDATE KE GITHUB (origin/%DEFAULT_BRANCH%)
echo ========================================================
echo.
if /i not "%CURRENT_BRANCH%"=="%DEFAULT_BRANCH%" (
    echo [INFO] Branch saat ini adalah '%CURRENT_BRANCH%'.
    echo        Target push default proyek ini adalah '%DEFAULT_BRANCH%'.
    echo.
)
echo File yang berubah / bertambah:
git status -s
echo.
set "COMMIT_MSG="
set /p "COMMIT_MSG=Masukkan pesan commit (Kosongkan untuk pesan otomatis): "

if "!COMMIT_MSG!"=="" (
    set "DATE_STR=%date% %time%"
    set "COMMIT_MSG=Update Web Seleksi Foto Fotonic - !DATE_STR!"
)

echo.
echo Menjalankan 'git add -A'...
git add -A

echo Menjalankan commit...
git commit -m "!COMMIT_MSG!"
if %errorlevel% neq 0 (
    echo.
    echo [INFO] Tidak ada perubahan baru untuk di-commit.
    pause
    goto MENU
)

echo.
echo Menjalankan 'git push -u origin HEAD:%DEFAULT_BRANCH%'...
git push -u origin HEAD:%DEFAULT_BRANCH%
if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo [SUKSES] Perubahan berhasil di-push ke origin/%DEFAULT_BRANCH%!
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo [GAGAL] Terjadi kesalahan saat melakukan git push.
    echo Pastikan koneksi internet stabil atau coba jalankan Git Pull.
    echo ========================================================
)
pause
goto MENU

:PULL_REPO
cls
echo ========================================================
echo    MENARIK PEMBARUAN DARI GITHUB (origin/%DEFAULT_BRANCH%)
echo ========================================================
echo Menjalankan 'git pull origin %DEFAULT_BRANCH%'...
git pull origin %DEFAULT_BRANCH%
if %errorlevel% equ 0 (
    echo.
    echo [SUKSES] Repository lokal telah sinkron dengan origin/%DEFAULT_BRANCH%!
) else (
    echo.
    echo [PERINGATAN] Gagal melakukan pull atau terjadi konflik.
)
pause
goto MENU

:STATUS_LOG
cls
echo ========================================================
echo              STATUS DETAIL ^& LOG COMMIT
echo ========================================================
echo.
echo --- Remote URL ---
git remote -v
echo.
echo --- Branch Lokal ^& Remote ---
git branch -vv
echo.
echo --- Git Status Lengkap ---
git status
echo.
echo --- 5 Commit Terakhir ---
git log -5 --oneline --graph --decorate
echo.
pause
goto MENU

:SWITCH_DEFAULT
cls
echo ========================================================
echo          PINDAH KE BRANCH DEFAULT (%DEFAULT_BRANCH%)
echo ========================================================
git checkout %DEFAULT_BRANCH%
if %errorlevel% neq 0 (
    echo [INFO] Membuat branch lokal '%DEFAULT_BRANCH%'...
    git checkout -b %DEFAULT_BRANCH%
)
pause
goto MENU

:DISCARD_CHANGES
cls
echo ========================================================
echo         BATALKAN SELURUH PERUBAHAN LOKAL
echo ========================================================
echo.
echo [PERINGATAN] Tindakan ini akan menghapus seluruh perubahan
echo kode lokal yang belum di-commit!
echo.
set "KONF="
set /p "KONF=Ketik Y untuk melanjutkan atau N untuk kembali [Y/N]: "
if /i "%KONF%"=="Y" (
    git restore .
    git clean -fd
    echo [OK] Seluruh perubahan yang belum di-commit telah dibatalkan.
) else (
    echo Dibatalkan.
)
pause
goto MENU

:KELUAR
exit /b 0
