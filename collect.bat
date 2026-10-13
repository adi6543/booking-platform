@echo off
setlocal
cd /d "C:\Users\jadi4\booking platform"
set "OUT=review-bundle.txt"
echo REVIEW BUNDLE > "%OUT%"
echo Generated: %DATE% %TIME% >> "%OUT%"

call :sec "VERSIONS"
node -v >> "%OUT%" 2>&1
call npm -v >> "%OUT%" 2>&1
findstr /I "mongoose express jsonwebtoken razorpay bcrypt zod node-cron" server\package.json >> "%OUT%" 2>&1

call :sec "GIT"
git branch --show-current >> "%OUT%" 2>&1
git status --short >> "%OUT%" 2>&1
git log --oneline -n 20 >> "%OUT%" 2>&1
echo tracked env files: >> "%OUT%"
git ls-files | findstr /I "\.env" >> "%OUT%" 2>&1

call :sec "SECRET SCAN (file names only)"
findstr /S /I /M /C:"mongodb+srv" /C:"rzp_live" /C:"sk_live" /C:"PRIVATE KEY" server\src\*.js client\src\*.js client\src\*.jsx >> "%OUT%" 2>&1
if errorlevel 1 echo none found >> "%OUT%"

call :sec "FILE LISTS"
dir /s /b server\src >> "%OUT%" 2>&1
dir /b client\src >> "%OUT%" 2>&1

call :sec "ENV VAR USAGE IN CODE"
findstr /S /N /I "process.env" server\src\*.js >> "%OUT%" 2>&1

call :sec "DEPLOYMENT STATUS (health path may differ)"
curl --max-time 60 -s -o NUL -w "render api: HTTP %%{http_code}\n" https://booking-platform-b7yg.onrender.com/api/health >> "%OUT%" 2>&1
curl --max-time 30 -s -o NUL -w "vercel site: HTTP %%{http_code}\n" https://booking-platform-adi6543.vercel.app >> "%OUT%" 2>&1

call :sec "BOOKINGS INDEXES (read-only)"
pushd server
node -e "require('dotenv').config();const m=require('mongoose');const u=process.env.MONGO_URI||process.env.MONGODB_URI;if(!u){console.log('no MONGO_URI or MONGODB_URI env var found');process.exit(0)}m.connect(u,{serverSelectionTimeoutMS:15000}).then(async()=>{console.log(JSON.stringify(await m.connection.db.collection('bookings').indexes(),null,1));process.exit(0)}).catch(e=>{console.log('connect error: '+e.name);process.exit(0)})" >> "..\%OUT%" 2>&1
popd

call :file "server\src\models\Booking.js"
call :file "server\src\models\Slot.js"
call :file "server\src\controllers\booking.controller.js"
call :file "server\src\controllers\payment.controller.js"
call :file "server\src\utils\bookingCleanup.js"
call :file "server\src\utils\scheduler.js"
call :file "server\src\routes\payment.routes.js"
call :file "server\src\routes\booking.routes.js"
call :file "server\src\controllers\availability.controller.js"
call :file "server\src\middlewares\auth.middleware.js"
call :file "server\src\middlewares\role.middleware.js"
call :file "server\src\index.js"
call :file "server\src\config\razorpay.js"
call :file "server\test-bug1-simulated-sig-bypass.js"
call :file "test-concurrency.js"

echo Done. Saved to %CD%\%OUT%
dir "%OUT%"
goto :eof

:sec
echo. >> "%OUT%"
echo ======== %~1 ======== >> "%OUT%"
exit /b

:file
echo. >> "%OUT%"
echo ---- FILE: %~1 ---- >> "%OUT%"
if exist "%~1" (type "%~1" >> "%OUT%" 2>&1) else (echo [missing file] >> "%OUT%")
exit /b
