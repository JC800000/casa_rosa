@echo off
echo Abriendo puertos 5173 y 8000 en el firewall...
netsh advfirewall firewall add rule name="Casa Rosa 5173" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="Casa Rosa 8000" dir=in action=allow protocol=TCP localport=8000
echo.
echo Listo. Puertos abiertos.
pause
