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
export default function EventEmitter() {
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

    if (!listener) {
      // remove all listeners for type.
      delete this.events[type];
    } else if (typeof this.events[type] === "function") {
      if (this.events[type] === listener) delete this.events[type];
    } else {
      this.events[type] = this.events[type].filter((item) => item !== listener);
      if (this.events[type].length === 1) this.events[type] = this.events[type][0];
    }

    return this;
  };

  this.once = function (type, listener) {
    function onceListener() {
      this.emitter.off(this.type, this.wrapFn);
      return arguments.length ? this.listener(...arguments) : this.listener();
    }

    function wrap(emitter, type, listener) {
      const cxt = { emitter, type, listener, wrapFn: undefined };
      const wrapped = onceListener.bind(cxt);
      cxt.wrapFn = wrapped;
      return wrapped;
    }

    return this.on(type, wrap(this, type, listener));
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
      console.warn(`no listener for ${type}`);
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

  // for debugging.
  this.onceListeners = (type) => {
    const types = [];
    const count = (type, listeners) => {
      if (!listeners) return;
      if (typeof listeners === "function") {
        if (listeners.name.startsWith("bound ")) types.push(type + ".!");
      } else {
        for (const l of listeners) {
          if (l.name.startsWith("bound ")) types.push(type + ".!");
        }
      }
    };

    if (type) {
      count(type, this.events[type]);
    } else {
      for (const [key, value] of Object.entries(this.events)) count(key, value);
    }
    return types;
  };

  this.listeners = (type) => {
    const types = [];
    const count = (type, listeners) => {
      if (!listeners) return;
      if (typeof listeners === "function") {
        types.push(type + (listeners.name.startsWith("bound ") ? ".!" : ""));
      } else {
        for (const l of listeners) types.push(type + (l.name.startsWith("bound ") ? ".!" : ""));
      }
    };

    if (type) {
      count(type, this.events[type]);
    } else {
      for (const [key, value] of Object.entries(this.events)) count(key, value);
    }
    return types;
  };
} // eof Emittor

//
// test main
//
if (window.emitter_test) {
  //
  // test
  console.log("---run---");
  function f1(a, b, c) {
    console.log("f1:", [a, b, c].join(", "));
  }
  function f2(a, b, c) {
    console.log("f2:", [a, b, c].join(", "));
  }
  function fonce(a, b, c) {
    console.log("fonce:", [a, b, c].join(", "));
  }

  const emitter = new EventEmitter();
  emitter.once("event2", fonce);
  emitter.on("event1", f1);
  emitter.once("event1", fonce);
  emitter.on("event1", f2);

  console.assert(
    JSON.stringify(emitter.onceListeners()) === JSON.stringify(["event2.!", "event1.!"]),
    emitter.onceListeners()
  );
  console.assert(
    JSON.stringify(emitter.listeners()) === JSON.stringify(["event2.!", "event1", "event1.!", "event1"]),
    emitter.listeners()
  );

  emitter.emit("event1", 1, 2, 3);
  emitter.emit("event1", 4, 5, 6);
  console.assert(JSON.stringify(emitter.onceListeners()) === JSON.stringify(["event2.!"]), emitter.onceListeners());
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
