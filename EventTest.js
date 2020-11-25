"use strict";
import Emitter from "./emitter.js";

function test1() {
  consoleBind("[test1]");
  consoleBind();

  console.log("enter test1");
  const emitter0 = new Emitter();
  //-------------------------------
  emitter0.on("E1", OnE1);
  emitter0.on("E2", OnE2);
  emitter0.on("E3", OnE3);

  //-------------------------------
  function OnE1() {
    console.log("enter");
    emitter0.on("E1.E1", OnE1E1);
    emitter0.on("E1.E2", OnE1E2);
  }
  function OnE2() {
    console.log("enter OnE2");
  }
  let id = 0;
  async function OnE3() {
    // handle state transition with waitEvent(Promise),
    // ex) wait E1.E2 then E1.E3, and then E1.E4.
    const e3id = ++id;
    console.log(e3id, "enter");
    const from = await waitEvent("E1.E2");
    console.log(e3id, "do something on E1.E2 state:", from ? from : "");

    //await waitEvent("E1.E3");
    //console.log("do something on E1.E3 state:", from ? from : "");

    //await waitEvent("E1.E4");

    console.log(e3id, "exit");
  }

  //-------------------------------
  function OnE1E1() {
    console.log("enter");
  }
  function OnE1E2() {
    console.log("enter");
  }

  async function waitEvent(name) {
    console.log(`wait -> entered to micro-task queue & wait ${name} resolving.`);
    const p = await new Promise((resolve) => emitter0.once(name, () => resolve("from...")));
    console.log(`${name} resolved, JSR pop this task from micro-task queue.`);
    //return p;
  }
  console.log("exit test1");

  addTestWidget("<button>Fire E1</button>", () => emitter0.emit("E1"));
  addTestWidget("<button>Fire E3</button>", () => emitter0.emit("E3"));
  addTestWidget("<button>Fire E1.E2</button>", () => emitter0.emit("E1.E2"));
}

// test1();

async function test2() {
  consoleBind("[browser]");
  console.log(window.name);
  //   const windows = await browser.windows.getAll({
  //     populate: true,
  //     windowTypes: ["normal"],
  //   });
  //   console.log(windows);
}

test2();
