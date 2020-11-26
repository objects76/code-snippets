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
}
