import add from "./clearall.js";

export const KEY_CODE = {
  TAP: 9,
  SHIFT: 16,
  CTRL: 17,
  ALT: 18,
  LANG_SWITCH: 21,
  ESC: 27,
  DELETE: 46,
  WIN: 91,
};

const PREVENT_KEYS = [KEY_CODE.TAP, KEY_CODE.WIN]; // affect keys to browser....
const COMBINATION_KEYS = [KEY_CODE.CTRL, KEY_CODE.ALT, KEY_CODE.DELETE];

export default class KeyboardControl {
  constructor() {
    this._combinationKeys = new Set();
  }

  setActive(activate) {
    this._clearKeyboard;
    if (this._clearKeyboard) {
      this._clearKeyboard();
      this._clearKeyboard = undefined;
    }
    if (activate) {
      this._clearKeyboard = add(document, "keydown", this._keyDownListener).add(document, "keyup", this._keyUpListener);
    }
    console.log(activate ? "activated" : "inactivated");
  }

  // emulate key actions
  pressKey(keyCode, keyChar, code) {
    this._keyDown(keyCode, keyChar, code);
    this._keyUp(keyCode, keyChar, code);
  }

  toggleKey(press, keyCode, keyChar, code) {
    if (press) {
      this._keyDown(keyCode, keyChar, code);
    } else {
      this._keyUp(keyCode, keyChar, code);
    }
  }

  _keyDown(keyCode, keyChar, code) {
    if (COMBINATION_KEYS.includes(keyCode)) {
      this._combinationKeys.add(keyCode);
    }

    console.log(`keydown: keyCode=${keyCode}, keyChar=${keyChar}, code=${code}`);
  }

  _keyUp(keyCode, keyChar, code) {
    if (this._matchedCtrlAltDel()) console.log(`CAD hit`);

    if (COMBINATION_KEYS.includes(keyCode)) {
      this._combinationKeys.delete(keyCode);
    }

    console.log(`keyup: keyCode=${keyCode}, keyChar=${keyChar}, code=${code}`);
  }

  // listener.
  _keyDownListener = (event) => {
    event.preventDefault();
    this._keyDown(event.keyCode, event.key, event.code);

    //if (PREVENT_KEYS.includes(event.keyCode)) event.preventDefault();
  };

  _keyUpListener = (event) => {
    event.preventDefault();
    this._keyUp(event.keyCode, event.key, event.code);

    //if (PREVENT_KEYS.includes(event.keyCode)) event.preventDefault();
  };

  _matchedCtrlAltDel() {
    return (
      this._combinationKeys.has(KEY_CODE.CTRL) &&
      this._combinationKeys.has(KEY_CODE.ALT) &&
      this._combinationKeys.has(KEY_CODE.DELETE)
    );
  }
}

//
//
//

const console_backup = { ...console };
console.log = (...args) => {
  const msg = args.join(" ");
  console_backup.log(msg);
  document.querySelector("#story").innerText += msg + "\r\n";
};

var jjkimns = {};
jjkimns.WebSocket = class jjkim_websocket {
  constructor() {
    this.socket;

    this.onconnect;
    this.onmessage;
    this.onclose;
  }

  close() {
    if (!this.socket) return;
    this.socket.close();
    this.socket = undefined;
  }

  connect(url) {
    this.close();
    this.socket = new WebSocket(url);
    this.socket.binaryType = "arraybuffer";

    this.socket.onopen = (event) => {
      console.log("[open] Connection established");
      if (this.onconnect) this.onconnect(event);
    };

    this.socket.onmessage = (event) => {
      const dv = new DataView(event.data);
      const type = dv.getInt32(0, true);
      if (this.onmessage) {
        this.onmessage(type, new DataView(event.data, 4));
      } else {
        console.log(`[message] Data received from server: ${event.data.byteLength}, type=${type}`);
      }
    };

    this.socket.onclose = function (event) {
      if (event.wasClean) {
        console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
        if (this.onclose) this.onclose();
      } else {
        // e.g. server process killed or network down
        // event.code is usually 1006 in this case
        console.log(`[close] Connection died, code=${event.code} reason=${event.reason}`);
        if (this.onclose) this.onclose(event.code, event.reason);
      }
    };

    this.socket.onerror = function (error) {
      alert(`[error] ${error.message}`);
      if (this.onclose) this.onclose(error.code, error.reason); // TODO: Error object?
    };
  }

  send(type, data) {
    if (!this.socket) {
      console.error("no socket");
      return;
    }

    if (typeof data === "string") {
      const u8data = BlobHelper.stringToUint8Array(data);
      const buffer = new Uint8Array(4 + u8data.length);

      new DataView(buffer.buffer, 0).setInt32(0, type, true);
      buffer.set(u8data, 4);

      this.socket.send(buffer.buffer);
    }
  }
};

var BlobHelper = {
  stringToUint8Array: (str) => new TextEncoder().encode(str, "utf-8"),
  toString: (blob) => new TextDecoder("utf-8").decode(blob),
};

//
//
//
if (window.test_KeyboardControl) {
  const TEST = 4430;
  const FOCUS = 4431;
  const START = 4432;

  let socket;

  window.addEventListener("focus", () => {
    console.log("focus");
    socket?.send(FOCUS, document.title);
  });
  window.addEventListener("blur", () => {
    console.log("blur");
    socket?.send(FOCUS, "");
  });

  const keyboard = new KeyboardControl();
  window.onload = () => {
    activate(true);
  };

  function activate(enable) {
    const btn = document.querySelector("#activate");
    keyboard.setActive(enable);
    btn.innerText = enable ? "stop" : "start";
  }
  addTestWidget(`<button id='activate'>start</button>`, function () {
    activate(this.widget.innerText == "start");
  });
  addTestWidget(`<textarea id="story" rows="5" cols="33" style="width:100%"/>`);

  addTestWidget(`<button id='activate'>connect to helper</button>`, function () {
    socket = new jjkimns.WebSocket();
    socket.connect("ws://localhost:4430/helper");

    socket.onopen = () => socket.send(FOCUS, document.title);
    socket.onmessage = (type, blob) =>
      console.log(`[message] Data received from server: ${type}/${BlobHelper.toString(blob)}`);
    socket.onclose = (code, reason) => console.log(`[close] Connection closed, code=${code} reason=${reason}`);
  });

  addTestWidget(`<button>fullscreen</button>`, () => {
    navigator.keyboard?.lock();
    document.documentElement.requestFullscreen();
  });

  // https://github.com/vireshshah/custom-protocol-check
  const helperOK = () => {
    socket = new jjkimns.WebSocket();
    socket.connect("ws://localhost:4430/helper");

    socket.onopen = () => socket.send(FOCUS, document.title);
    socket.onmessage = (type, blob) =>
      console.log(`[message] Data received from server: ${type}/${BlobHelper.toString(blob)}`);
    socket.onclose = (code, reason) => console.log(`[close] Connection closed, code=${code} reason=${reason}`);
  };
  const helperNG = () => {
    // https://chromium.googlesource.com/chromium/src/+/master/chrome/browser/external_protocol/external_protocol_handler.cc#123:~:text=because%20the%20scheme%20does%20not%20have%20a%20registered%20handler.%22)%3B
    // - Failed to launch 'jjkim-protocol://params' because the scheme does not have a registered handler.
    console.log("No handler....");
    if (confirm("Setup helper module to use more fluent UX!\r\nYou want?")) {
      //alert("download exe and register as custom service once.");
      downloadUrl("./native/helper.exe", "helper.exe");
      downloadUrl("./native/browserhelper_win/x64/Release/browserhelper.dll", "browserhelper.dll");
    }
  };
  addTestWidget(`<button>launch helper</button>`, () => {
    try {
      customProtocolCheck("jjkim-protocol://params", helperNG, helperOK, 3000);
    } catch (err) {
      console.error(err);
    }
  });

  addTestWidget(`<button>launch helper & connect to the helper</button>`, () => {
    try {
      customProtocolCheck("jjkim-protocol://params", helperNG, helperOK, 3000);
    } catch (err) {
      console.error(err);
    }
  });

  addTestWidget(`<button>windows custom protocol</button>`, () => {
    const protocol = [
      "ms-settings-screenrotation:",
      "ms-screenclip:",
      "ms-taskswitcher:",
      "ms-sttoverlay:",
      "ms-settings-workplace:",
      "ms-settings-bluetooth:",
      "ms-settings:",
    ];
    customProtocolCheck(
      protocol[0],
      () => console.error("failed"),
      () => console.error("ok"),
      5000
    );
  });
}

// custom protocol
