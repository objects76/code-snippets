import EventEmitter from "./emitter.js";

const isChromium = true;

// feature
// 1. detect clipboard changes.
// 2. set clipboard.

export default class Clipboard {
  constructor(use) {
    this.use = isChromium && use;
    this._active = false;
    this._data = null;
    this._permission = null;
    this._emitter = new EventEmitter();
  }

  async setActive(active) {
    if (!this.use) return;

    if (this._active != active) {
      if (active) {
        if (!this._permission) {
          this._permission = await navigator.permissions.query({ name: "clipboard-read" });
          this._permission.onchange = () => {
            switch (this._permission.state) {
              case "granted":
                this._active = active;
                this._emitter.emit("active", this._active);
                break;
              case "prompt":
                navigator.clipboard.readText(); // trigger permission prompt.
                break;
              case "denied":
                this._active = false;
                this._emitter.emit("active", this._active);
                if (active) {
                  alert("Enable clipboard permission to get local clipboard.");
                  this._emitter.emit("denied"); // maybe for UI about user 'denied' action.
                }
                break;
            }
          };
        }

        this._permission.onchange();
      } else {
        this._active = false;
        this._emitter.emit("active", this._active);
      }
    }
  }

  waitRead = async () => {
    if (!this._isAvailable()) return;
    const data = await Clipboard.readClipboardBlob();
    if (data === this._data) return; // prevent duplication.
    this._data = data;
    this._emitter.emit("read", this._data);
  };

  // set local clipboard as data.
  waitWrite = async (data) => {
    if (!this._isAvailable()) return;
    if (data === this._data) return; // prevent loop-back?
    this._data = data;
    await Clipboard.setClipboardBlob(data);
    this._emitter.emit("write", this._data);
  };

  onActive(fn) {
    this._emitter.on("active", fn);
  }

  onPrompt(fn) {
    this._emitter.on("prompt", fn);
  }

  onGranted(fn) {
    this._emitter.on("granted", fn);
  }

  onDenied(fn) {
    this._emitter.on("denied", fn);
  }

  onRead(fn) {
    this._emitter.on("read", (data) => fn(data));
  }

  onWrite(fn) {
    this._emitter.on("write", (data) => fn(data));
  }

  destroy() {
    this._emitter.clear();
  }

  _isAvailable() {
    return this.use && this._active && this._permission.state !== "denied" && document.hasFocus();
  }

  //
  // static util functions
  //
  static readClipboardBlob = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          const blob = await clipboardItem.getType(type);
          console.log(`blob from clipboard: ${blob.type}, size=${blob.size}`);
          return blob;
        }
      }
    } catch (err) {
      console.error(err.name, err.message);
    }
  };

  static setClipboardBlob = async (blob) => {
    function asPngBlob(blob) {
      if (blob.type === "image/png") return Promise.resolve(blob);
      if (blob.type === "image/jpeg") {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = URL.createObjectURL(blob);

          img.onload = function () {
            const c = document.createElement("canvas");
            const ctx = c.getContext("2d");
            c.width = this.naturalWidth;
            c.height = this.naturalHeight;
            ctx.drawImage(this, 0, 0);
            c.toBlob(resolve, "image/png");

            URL.revokeObjectURL(img.src);
          };
        });
      }

      throw TypeError("invalid blobtype:" + blob.toString());
    }
    if (blob.type.startsWith("image/")) blob = await asPngBlob(blob);

    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  };
}

//
//
//
if (window.test_clipboard) {
  async function setImageClipboard(blob) {
    function asPngBlob(blob) {
      if (blob.type === "image/png") return Promise.resolve(blob);
      if (blob.type === "image/jpeg") {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = URL.createObjectURL(blob);

          img.onload = function () {
            const c = document.createElement("canvas");
            c.width = this.naturalWidth;
            c.height = this.naturalHeight;
            c.getContext("2d").drawImage(this, 0, 0);
            c.toBlob(resolve, "image/png");

            URL.revokeObjectURL(img.src);
          };
        });
      }

      throw TypeError("invalid blobtype:" + blob.toString());
    }

    blob = await asPngBlob(blob);
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  }

  const clipboard = new Clipboard(true);

  clipboard.onActive((b) => console.log("onActive:", b));
  clipboard.onPrompt((b) => console.log("onPrompt:", b));
  clipboard.onGranted((b) => console.log("onGranted:", b));
  clipboard.onDenied((b) => console.log("onDenied:", b));
  clipboard.onRead((data) => console.log("onRead", data));
  clipboard.onWrite((data) => console.log("onWrite", data));

  addTestWidget(`<button>test</button>`, async () => {
    consoleBind("[test]");
    console.info("ref: https://web.dev/async-clipboard/");
    console.indent += "\t";
    //console.log('== set text to local clipboared');
    //await navigator.clipboard.writeText(location.href);

    // console.log("== set image blob to local clipboard");
    // try {
    //   const data = await fetch("./wallE.jpg");
    //   const blob = await data.blob(); // NotAllowedError Type image/jpeg not supported on write.
    //   //   {
    //   //     const fileext = blob.type === "image/jpeg" ? "jpg" : "png";
    //   //     downloadBlob(blob, `blob-${blob.type}.${fileext}`); // save blob to file.
    //   //     return;
    //   //   }
    //   await setImageClipboard(blob);
    //   console.log("Image copied.");
    // } catch (err) {
    //   console.error(err.name, err.message);
    // }

    // console.log("== read text from clipboard");
    // try {
    //   const text = await navigator.clipboard.readText();
    //   console.log("text from clipboard:", text);
    // } catch (err) {
    //   console.error("Failed to read clipboard contents: ", err);
    // }

    // console.log("== read general blob from clipboard: check blob with 'chrome://blob-internals/' ");
    // try {
    //   const clipboardItems = await navigator.clipboard.read();
    //   for (const clipboardItem of clipboardItems) {
    //     for (const type of clipboardItem.types) {
    //       const blob = await clipboardItem.getType(type);
    //       console.log(`blob from clipboard: ${blob.type}, size=${blob.size}`);
    //     }
    //   }
    // } catch (err) {
    //   console.error(err.name, err.message);
    // }

    // console.log("== clipboard-read permission");
    // const queryOpts = { name: "clipboard-read", allowWithoutGesture: false };
    // const permissionStatus = await navigator.permissions.query(queryOpts);
    // switch (permissionStatus.state) {
    //   case "granted":
    //     break;
    //   case "prompt":
    //     navigator.clipboard.readText(); // trigger permission prompt.
    //     break;
    //   case "denied":
    //     alert("Enable clipboard permission to get local clipboard.");
    //     break;
    // }
    // console.log(permissionStatus.state);
    // permissionStatus.onchange = () => console.log(permissionStatus.state);

    // console.log("== revoke test: deprecated");
    // console.log("revoke:", navigator.permissions.revoke);
    // const result = await navigator.permissions.revoke({ name: "clipboard-read" });
    // console.log("revoke:", result);

    // console.log("== clipboard.waitRead() trigger, if data existed, 'read' event will be fired");
    // clipboard.waitRead(); // read local clipboard.

    console.indent = console.indent.slice(0, -1);
    console.info("done");
  });

  addTestWidget(`<button>active clipboard</button>`, async function () {
    const active = this.widget.innerText.startsWith("active ");
    console.log("Clipboard.setActive() test");
    clipboard.setActive(active);
    clipboard.onActive((activated) => {
      this.widget.innerText = activated ? "inactive clipboard" : "active clipboard";
    });
  });

  addTestWidget(`<textarea id="story" rows="5" cols="33" style="width:100%"/>`);
  addTestWidget("<button>set text from clipboard</button>", setText);

  function setText() {
    const textarea = document.querySelector("#story");
    textarea.value = "text from clipboard";
  }
}
