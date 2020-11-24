//
// event utils
//

//
// from nodejs emitter
//  ref: https://github.com/nodejs/node/blob/v12.14.1/lib/events.js
//
// emitter.on(type, listener);
// emitter.off(type, listener);
// emitter.once(type, listener);
// emitter.emit(type, ...args);
// emitter.hasListeners(type?);
// emitter.clear();
//
export default function Emitter() {
  this.events = {};

  this.on = function (type, listener) {
    if (!this.events[type]) {
      this.events[type] = listener;
    } else if (typeof this.events[type] === "function") {
      this.events[type] = [this.events[type], listener];
    } else {
      this.events[type].push(listener);
      if (this.events[type].size > 10) console.warn(`Too many listener for ${type}`);
    }

    return this;
  };

  this.off = function (type, listener) {
    if (!this.events[type]) return this;

    if (!listener) delete this.events[type];
    else if (typeof this.events[type] === "function") {
      if (this.events[type] === listener) delete this.events[type];
    } else {
      this.events[type] = this.events[type].filter((item) => item !== listener);
      if (this.events[type].length === 1) this.events[type] = this.events[type][0];
    }

    return this;
  };

  this.once = function (type, listener) {
    function onceWrapper() {
      if (!this.fired) {
        this.target.off(this.type, this.wrapFn);
        this.fired = true;
        if (arguments.length === 0) return this.listener.call(this.target);
        return this.listener.apply(this.target, arguments);
      }
    }
    function _onceWrap(target, type, listener) {
      const state = { fired: false, wrapFn: undefined, target, type, listener };
      const wrappedHandler = onceWrapper.bind(state);
      wrappedHandler.listener = listener;
      state.wrapFn = wrappedHandler;
      return wrappedHandler;
    }
    return this.on(type, _onceWrap(this, type, listener));
  };

  this.emit = function (type, ...args) {
    if (type === "error" && !this.events.error) {
      let er;
      if (args.length > 0) er = args[0];
      if (er instanceof Error) {
        Error.prepareStackTrace = (err, stack) => stack;
        Error.captureStackTrace(err, b);
      }
      throw er; // Unhandled 'error' event
    }

    if (!this.events[type]) {
      console.debug(`no listener for ${type}`);
      return false;
    }

    if (typeof this.events[type] === "function") {
      this.events[type](...args);
    } else {
      for (const listener of this.events[type].slice()) {
        listener(...args);
      }
    }

    return true;
  };

  this.hasListeners = function (type) {
    if (!type) return Object.keys(this.events).length > 0;
    return !!this.events[type];
  };

  this.clear = function () {
    this.events = {};
    return this;
  };
} // eof Emittor

//
// ref: https://github.com/skt-t1-byungi/clearall/blob/master/index.ts
//
export function add(target, type, listener, ...args) {
  const unsubscribes = [];

  function clearAll() {
    console.debug("clear all event listeners");
    unsubscribes.splice(0).forEach((fn) => fn());
  }

  clearAll.subscribe = (target, type, listener, args) => {
    console.log("+", type);
    const on = target.addEventListener || target.addListener || target.on || target.subscribe;
    if (typeof on !== "function") throw new TypeError("`Add Listener` method was not found.");

    const f = on.call(target, type, listener, ...args);
    if (typeof f === "function") return unsubscribes.push(f);

    const off = target.removeEventListener || target.removeListener || target.off || target.unsubscribe;
    if (typeof off === "function") return unsubscribes.push(() => off.call(target, type, listener));
  };

  clearAll.add = (o, name, listener, ...params) => {
    clearAll.subscribe(o, name, listener, params);
    return clearAll;
  };

  if (target && listener) clearAll.subscribe(target, type, listener, args);

  return clearAll;
}

if (window.emitter_test) {
  const cleaner = add(window, "beforeunload", () => console.log("> before unload"))
    .add(window, "load", () => console.log("> loaded"))
    .add(window, "unload", () => console.log("> unload"));

  addTestWidget(`<button>call cleaner</button>`, async (evt) => {
    cleaner();
  });

  //
  // test
  console.log("---run---");
  const emitter = new Emitter();
  function f1(a, b, c) {
    console.log("f1:", [a, b, c].join(", "));
  }
  function f2(a, b, c) {
    console.log("f2:", [a, b, c].join(", "));
  }
  function fonce(a, b, c) {
    console.log("fonce:", [a, b, c].join(", "));
  }

  emitter.on("event1", f1);
  emitter.once("event1", fonce);
  emitter.once("event1", fonce);
  emitter.on("event1", f2);

  console.log(emitter);

  emitter.emit("event1", 1, 2, 3);
  emitter.emit("event1", 4, 5, 6);

  // allOff(emitter);
  console.log(`after: emitter.off("event1", f1);`);
  emitter.off("event1", f1);
  emitter.emit("event1", 7, 8, 9);
  // const a1 = [1, 2, 3];
  // console.log(typeof [1, 2, 3], a1 instanceof Array);

  console.log(emitter.hasListeners("fonce"));
  emitter.clear();
  console.log(emitter.hasListeners());

  // emitter.emit("error", new Error("emitter error test"));
}
