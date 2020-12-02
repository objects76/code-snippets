# !/usr/bin/env python
# -*- coding: UTF-8 -*-
# ref: https://pystray.readthedocs.io/en/latest/usage.html

# Pillow
from PIL import Image
import helper

def create_image():
    img = Image.open('internet2.ico')
    return img


from pystray import Icon as Tray, Menu, MenuItem

keyboardHelper = False
wsStarted = False


def submenu_with_notification():

    def showNotification(icon, msg, title=None):
        # icon.remove_notification()
        icon.notify(msg, title)

    def onKeyboardHelper(icon, item):
        global keyboardHelper
        keyboardHelper = not item.checked
        print('keyboard helper: ', keyboardHelper)
        pass

    def onWSServer(icon, item):
        global wsStarted
        print('onWSServer:', item.text)
        wsStarted = not wsStarted
        # icon.update_menu()
        if wsStarted:
            showNotification(icon, "ws-server is started")
        else:
            showNotification(icon, "ws-server is stopped")
        pass

    trayMenu = Menu(
        MenuItem(action=onWSServer,
             text=lambda item: 'Stop ws-server' if wsStarted else 'Start ws-server'
             ),
        MenuItem('Enable Keyboard helper', action=onKeyboardHelper, checked=lambda item: keyboardHelper),
        MenuItem(
            'With submenu',
            Menu(
                MenuItem(
                    'Submenu item 1',
                    lambda icon, item: 1),
                MenuItem(
                    'Submenu item 2',
                    lambda icon, item: 2),
                MenuItem(
                    'Show message',
                    lambda icon: icon.notify('Hello World!')),
            ),

        ),
        Menu.SEPARATOR,
        # default: run when click trayicon.
        MenuItem('Exit', action=lambda icon: icon.stop(), default=True)
    )
    trayApp = Tray('browser helper', create_image(), 'browser helper', trayMenu)
    trayApp.run()


def ws_server_thread():
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    helper.ws_server(4430)
    pass

if __name__ == '__main__':
    import threading
    import sys
    t = threading.Thread(target=ws_server_thread)
    t.start()
    submenu_with_notification()

    # checkable()
    sys.exit()
    pass
