//
// ref: https://github.com/skt-t1-byungi/clearall/blob/master/index.ts
//
export default function add(target, type, listener, ...args) {
  class Cleaner {
    constructor() {
      this.actions = [];
    }
    destroy = () => this.actions.forEach((v) => v());
    add = (target, type, listener, ...args) => {
      console.debug(`subscribe for ${type}`);
      const on = target.addEventListener || target.addListener || target.on || target.subscribe;
      if (typeof on !== "function") throw new TypeError("Target is not listenable.");

      const f = on.call(target, type, listener, ...args);
      if (typeof f === "function") {
        this.actions.push(f);
      } else {
        const off = target.removeEventListener || target.removeListener || target.off || target.unsubscribe;
        if (typeof off === "function") this.actions.push(() => off.call(target, type, listener));
      }

      return clearClosure;
    };
  }

  let theCleaner = new Cleaner();
  if (target && listener) theCleaner.add(target, type, listener, ...args); // first add.

  function clearClosure() {
    theCleaner.destroy();
    theCleaner = undefined;
    delete clearClosure.add;
  }
  clearClosure.add = theCleaner.add; // following add.

  return clearClosure;
}

//
//
//
if (window.ClearAll) {
  let closeAll = add(window, "load", () => console.log("load"))
    .add(window, "beforeunload", () => console.log("beforeunload"))
    .add(window, "unload", () => console.log("unload"));

  addTestWidget("<button>clear</button>", () => closeAll());
}
