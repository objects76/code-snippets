@echo off
@cd %~dp0
rem --noconsole --upx-dir=util\upx-3.95-win32
rem --noupx 
rem D:\Tools\Python38\Scripts\pyinstaller --console --noconfirm --onefile -i "./log-indent.ico" --clean --noupx "D:/TestWS/Scripts/log_indent_v2.py"
rem move  dist\log_indent_v2.exe .



rem adding dll:  -F --add-data browserhelper_win\x64\Release\browserhelper.dll;.
D:\Tools\Python37\Scripts\pyinstaller ^
    -F --add-data browserhelper_win\x64\Release\browserhelper.dll;. ^
    --console --noconfirm --onefile --clean --noupx ^
    -i "./helper.ico" ^
    helper.py
move  dist\helper.exe .

@pause
echo on

