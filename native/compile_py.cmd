@echo off
@cd %~dp0
rem --noconsole --upx-dir=util\upx-3.95-win32
rem --noupx 
rem D:\Tools\Python38\Scripts\pyinstaller --console --noconfirm --onefile -i "./log-indent.ico" --clean --noupx "D:/TestWS/Scripts/log_indent_v2.py"
rem move  dist\log_indent_v2.exe .

D:\Tools\Python37\Scripts\pyinstaller --console --noconfirm --onefile -i "./helper.ico" --clean --noupx "%1"
move  dist\%~n1.exe .

@pause
echo on

