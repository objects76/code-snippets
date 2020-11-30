#!/usr/bin/env python
# -*- coding: UTF-8 -*-


import os
import ctypes as c

TEST = 4430
FOCUS = 4431


class BrowserHelper:
    def __init__(self):
        self.dllpath = os.path.join(os.path.dirname(__file__), 'browserhelper.dll')
        if not os.path.isfile(self.dllpath):
            subpath = r'browserhelper_win\x64\Release\browserhelper.dll'
            self.dllpath = os.path.join(os.path.dirname(__file__), subpath)

        self.dllhandle = None
        self.title = None

    def __del__(self):
        if self.dllhandle:
            func = self.dllhandle.stopKeybdMonitor
            func.restype = c.c_bool
            func.argtypes = []
            func()
            del self.dllhandle

    def start(self, title):
        if self.dllhandle and self.title == title:
            # already loaded
            return True

        dllpath = os.path.join(os.path.dirname(__file__), 'browserhelper.dll')
        if not os.path.isfile(dllpath):
            subpath = r'browserhelper_win\x64\Release\browserhelper.dll'
            dllpath = os.path.join(os.path.dirname(__file__), subpath)

        self.dllhandle = c.CDLL(dllpath)
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
        if self.dllhandle is None:
            return
        func = self.dllhandle.pauseResumeKeybdMonitor
        func.restype = c.c_bool
        func.argtypes = [c.c_bool]
        func(pause)
        print('pause' if pause else 'resume')


def ws_server(port):
    import asyncio
    import websockets
    # call back for websockets.serve(accept, port)

    async def accept(ws, path):
        helper = BrowserHelper()
        print('path=', path)

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
                print('closed', e)
                # raise
                break
            except websockets.exceptions.ConnectionClosedError as e:
                print('connection:', e)
                # raise
                break
            pass  # while
        if helper:
            del helper

    # websocket server creation
    print(f'start websocket server on ws://localhost:{port}')
    websoc_svr = websockets.serve(accept, "localhost", port);

    # waiting
    asyncio.get_event_loop().run_until_complete(websoc_svr);
    asyncio.get_event_loop().run_forever();


if __name__ == '__main__':
    # loaddll()
    ws_server(4430);
    print('---------- done --------------')
    pass
