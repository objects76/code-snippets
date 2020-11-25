//
// ref: https://github.com/skt-t1-byungi/clearall/blob/master/index.ts
//

//
// with closure, what if JS support dtor????
//
export default function add(target, type, listener, ...args) {
  const actions = [];
  const closure = () => actions.splice(0).forEach((v) => v());
  closure.add = (target, type, listener, ...args) => {
    if (target && listener) {
      console.debug(`subscribe for ${type}`);
      const on = target.addEventListener || target.addListener || target.on || target.subscribe;
      if (typeof on !== "function") throw new TypeError("Target is not listenable.");

      const f = on.call(target, type, listener, ...args);
      if (typeof f === "function") {
        actions.push(f);
      } else {
        const off = target.removeEventListener || target.removeListener || target.off || target.unsubscribe;
        if (typeof off === "function") actions.push(() => off.call(target, type, listener));
      }
    }
    return closure;
  };

  return closure.add(target, type, listener, ...args);
}

//
//
//
if (window.ClearAll) {
  let closeAll = add(window, "load", () => console.log("load"))
    .add(window, "beforeunload", () => console.log("beforeunload"))
    .add(window, "unload", () => console.log("unload"));

  addTestWidget("<button>clear</button>", () => {
    closeAll();
  });
}
