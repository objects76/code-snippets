# -*- mode: python -*-

block_cipher = None


a = Analysis(['helper.py'],
             pathex=['C:\\Users\\jjkim\\Desktop\\code-snippets\\native'],
             binaries=[],
             datas=[('browserhelper_win\\x64\\Release\\browserhelper.dll', '.')],
             hiddenimports=[],
             hookspath=[],
             runtime_hooks=[],
             excludes=[],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher,
             noarchive=False)
pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)
exe = EXE(pyz,
          a.scripts,
          a.binaries,
          a.zipfiles,
          a.datas,
          [],
          name='helper',
          debug=False,
          bootloader_ignore_signals=False,
          strip=False,
          upx=False,
          runtime_tmpdir=None,
          console=True , icon='helper.ico')
