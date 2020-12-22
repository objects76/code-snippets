#!/usr/bin/env python
# -*- coding: UTF-8 -*-


import os
import ctypes as c
import sys
import winreg

TEST = 4430
FOCUS = 4431


class BrowserHelper:
    def __init__(self):
        self.dllhandle = None
        self.title = None

    def __del__(self):
        if self.dllhandle:
            func = self.dllhandle.stopKeybdMonitor
            func.restype = c.c_bool
            func.argtypes = []
            func()
            del self.dllhandle

    def load(self):
        if not self.dllhandle:
            dllpath = os.path.join(os.path.dirname(__file__), 'browserhelper.dll')
            print('dllpath1=', dllpath)
            if not os.path.isfile(dllpath):
                subpath = r'browserhelper_win\x64\Release\browserhelper.dll'
                dllpath = os.path.join(os.path.dirname(__file__), subpath)
                print('dllpath2=', dllpath)
            self.dllhandle = c.CDLL(dllpath)
        if not self.dllhandle:
            print('can not load', dllpath)
            return False

        # print('loaded', self.dllhandle)
        return True

    def start(self, title):
        if self.load() and self.title == title:
            # already loaded
            return True

        if self.dllhandle:
            func = self.dllhandle.startKeybdMonitorByTitleW
            func.restype = c.c_bool
            func.argtypes = [c.c_wchar_p]
            self.title = title

            if not func(self.title):
                print('start hook with title=', title, 'failed')
                del self.dllhandle
                self.dllhandle = None
                self.title = None

        return self.dllhandle is not None

    def pause(self, pause):
        if not self.load():
            return
        func = self.dllhandle.pauseResumeKeybdMonitor
        func.restype = c.c_bool
        func.argtypes = [c.c_bool]
        func(pause)
        print('pause' if pause else 'resume')


def unregister_as_custom_protocol():
    protocol = 'jjkim-protocol'
    path = "Software\\Classes\\" + protocol

    def delete_sub_key(root, sub):
        try:
            open_key = winreg.OpenKey(root, sub, 0, winreg.KEY_ALL_ACCESS)
            num, _, _ = winreg.QueryInfoKey(open_key)
            for i in range(num):
                child = winreg.EnumKey(open_key, 0)
                delete_sub_key(open_key, child)
            try:
                winreg.DeleteKey(open_key, '')
            except Exception:
                # log deletion failure
                pass
            finally:
                winreg.CloseKey(open_key)
        except Exception:
            pass

    root = winreg.ConnectRegistry(None, winreg.HKEY_CURRENT_USER)
    delete_sub_key(root, path)
    winreg.CloseKey(root)


# log opening/closure failure

def register_as_custom_protocol():
    protocol = 'jjkim-protocol'
    exepath = sys.executable
    path = "Software\\Classes\\" + protocol

    # check existance.
    try:
        reg = winreg.ConnectRegistry(None, winreg.HKEY_CURRENT_USER)
        key = winreg.OpenKey(reg, path, 0, winreg.KEY_WRITE)
        winreg.CloseKey(key)
        winreg.CloseKey(reg)
        return True
    except WindowsError:
        pass

    try:
        key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, path)
        winreg.SetValueEx(key, "", 0, winreg.REG_SZ, f'URL:{protocol}')
        winreg.SetValueEx(key, "URL Protocol", 0, winreg.REG_SZ, '')
        winreg.CloseKey(key)

        key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, path + r'\Shell\Open\command')
        winreg.SetValueEx(key, "", 0, winreg.REG_SZ, f'"{exepath}" "%1"')
        winreg.CloseKey(key)
    except EnvironmentError:
        print("Encountered problems writing into the Registry...")
    pass


def ws_server(port):
    import asyncio
    import websockets
    # call back for websockets.serve(accept, port)

    async def accept(ws, path):
        print('path=', path)
        helper = BrowserHelper()

        async def send(type1, data):
            blob1 = type1.to_bytes(4, 'little') + data.encode('utf-8')
            print('blob1=', blob1, 'int=', type1.to_bytes(4, 'little'))
            await ws.send(blob1)

        while True:
            try:
                data_rcv = await ws.recv()  # receiving the data from client.
                protocol = int.from_bytes(data_rcv[:4], byteorder='little')
                data_rcv = data_rcv[4:]
                if protocol == TEST:  # unit test
                    title = data_rcv.decode('utf-8')
                    print(f'[{title}]')
                    await send(protocol, 'OK')
                    pass
                elif protocol == FOCUS:  # start hook
                    title = data_rcv.decode('utf-8')
                    print(f"received data = {title}")
                    if len(title):
                        helper.start(title)
                    helper.pause(len(title) == 0)
                    await send(protocol, 'OK')

                elif protocol == 2:  # stop hook
                    pass
                else:
                    print(f"received data = {len(data_rcv)}, type={type(data_rcv)}, protocol={protocol}");
                # await websocket.send("websock_svr send data = " + data_rcv); # send received data
            except websockets.exceptions.ConnectionClosedOK as e:
                print('closed:', e)
                # raise
                break
            except websockets.exceptions.ConnectionClosedError as e:
                print('connection:', e)
                # raise
                break
            pass  # while
        if helper:
            print('delete helper')
            del helper
        loop = asyncio.get_event_loop()
        loop.stop()

    # websocket server creation
    print(f'start websocket server on ws://localhost:{port}')
    websoc_svr = websockets.serve(accept, "localhost", port)

    # waiting
    loop = asyncio.get_event_loop()
    loop.run_until_complete(websoc_svr)
    loop.run_forever()


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == '--unreg':
        unregister_as_custom_protocol()
        return
    for arg in sys.argv:
        print('arg=', arg)

    register_as_custom_protocol()
    ws_server(4430)
    return


if __name__ == '__main__':
    main()
    print('---------- done --------------')
    pass
