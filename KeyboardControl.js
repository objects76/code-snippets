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
    this._keyDown(event.keyCode, event.key, event.code);

    if (PREVENT_KEYS.includes(event.keyCode)) {
      event.preventDefault();
    }
  };

  _keyUpListener = (event) => {
    this._keyUp(event.keyCode, event.key, event.code);

    if (PREVENT_KEYS.includes(event.keyCode)) {
      event.preventDefault();
    }
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
if (window.test_KeyboardControl) {
  const TEST = 4430;
  const FOCUS = 4431;
  const START = 4432;

  let socket;
  function sendws(type, data) {
    if (!socket) {
      console.log("no socket");
      return;
    }

    if (typeof data === "string") {
      const enc = new TextEncoder();
      const u8data = enc.encode(data, "utf-8");
      const buffer = new Uint8Array(4 + u8data.length);

      new DataView(buffer.buffer, 0).setInt32(0, type, true);
      buffer.set(u8data, 4);

      socket.send(buffer.buffer);
      console.log("sent ", buffer.length, "bytes", data.length);
    }
  }

  window.addEventListener("focus", () => {
    console.log("focus");
    sendws(FOCUS, document.title);
  });
  window.addEventListener("blur", () => {
    console.log("blur");
    sendws(FOCUS, "");
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
    socket = new WebSocket("ws://localhost:4430/helper");
    socket.binaryType = "arraybuffer";

    socket.onopen = function (e) {
      console.log("[open] Connection established");
      sendws(FOCUS, document.title);
    };

    socket.onmessage = function (event) {
      const dv = new DataView(event.data);
      const type = dv.getInt32(0, true);

      var decoder = new TextDecoder("utf-8");
      var decodedString = decoder.decode(new DataView(event.data, 4));
      console.log(`[message] Data received from server: ${event.data.byteLength}, ${type}/${decodedString}`);
    };

    socket.onclose = function (event) {
      if (event.wasClean) {
        console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
      } else {
        // e.g. server process killed or network down
        // event.code is usually 1006 in this case
        console.log("[close] Connection died");
      }
    };

    socket.onerror = function (error) {
      alert(`[error] ${error.message}`);
    };
  });
}
