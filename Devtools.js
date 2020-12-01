//
// include
//    <script src="./Devtools.js"></script>
// in html.
//
"use strict";

function devInit(...args) {
  // replace assert
  console.log("console.assert is replaced");
  console.assert = (c, ...msgs) => {
    if (!c) {
      console.debug(new Error().stack);
      const output = msgs.length ? msgs.join(", ") : "";
      window.alert("ASSERTION FAILED:\n" + output);
      throw new Error(output);
    }
  };
}
devInit();

// override console.log with prefix and postfix with source position.
function consoleBind(prefix) {
  function at() {
    const caller = new Error().stack.split("\n")[3].trim();
    const tokens = caller.split(" ").filter(e => !!e.length);
    const srcpos = tokens[tokens.length - 1];

    return `[${tokens[1]}(), ${srcpos.slice(srcpos.lastIndexOf("/") + 1, -1)}]`; // function
  }

  console.indent = "";
  if (typeof consoleBind.backup === "undefined") consoleBind.backup = { ...console };
  console.log = (...args) => consoleBind.backup.log((prefix || "") + console.indent, ...args, at());
  console.info = (...args) => consoleBind.backup.info((prefix || "") + console.indent, ...args, at());
  console.error = (...args) => consoleBind.backup.error((prefix || "") + console.indent, ...args, at());
  console.warn = (...args) => consoleBind.backup.warn((prefix || "") + console.indent, ...args, at());
  console.trace = (...args) => consoleBind.backup.trace((prefix || "") + console.indent, ...args, at());
  console.debug = (...args) => consoleBind.backup.debug((prefix || "") + console.indent, ...args, at());
}

// get [min, max)
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function getByteSize(n) {
  if (n instanceof Blob) n = n.size;
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(2) + " KB";
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + " MB";
  return (n / 1024 / 1024 / 1024).toFixed(2) + " GB";
}

function getTestBlob(n, seed = 0) {
  console.assert(n >= 4);
  const buffer = new ArrayBuffer(n);
  const cptr = new Uint8Array(buffer);
  for (let i = 0; i < cptr.length; ++i, ++seed) cptr[i] = seed % 256;

  return new Blob([buffer], { type: "application/octet-stream" });
}

async function verifyTestBlob(buf, seed = 0) {
  if (!buf) return Promise.reject("null buffer");

  const check = arrbuf => {
    const cptr = new Uint8Array(arrbuf);
    for (let i = 0; i < cptr.length; ++i, ++seed) {
      if (cptr[i] !== seed % 256) {
        console.error(`[${i}/${getByteSize(i)}]: expect ${seed % 256}, but ${cptr[i]}`);
        return false;
      }
    }
    console.log(`buffer(${getByteSize(arrbuf.byteLength)} verified)`);
    return true;
  };

  return new Promise((resolve, reject) => {
    if (buf instanceof Blob) {
      const blobReader = new FileReader();
      blobReader.onload = () => resolve(check(blobReader.result));
      blobReader.readAsArrayBuffer(buf);
    } else if (buf instanceof ArrayBuffer) {
      resolve(check(buf));
    } else {
      throw new Error("invalid buffer type");
    }
  });
}

async function getAt(buf, idx) {
  const get = (arrbuf, idx) => {
    const cptr = new Uint8Array(arrbuf);
    console.log(`buf[${idx} = ${cptr[idx]}`);
    return cptr[idx];
  };
  if (buf instanceof Blob) {
    return new Promise((ok, ng) => {
      const blobReader = new FileReader();
      blobReader.onabort = () => ng(blobReader.error);
      blobReader.onload = () => ok(get(blobReader.result, idx));
      blobReader.readAsArrayBuffer(buf);
      console.log(`state=${blobReader.readyState}`);
    });
  } else if (buf instanceof ArrayBuffer) {
    return Promise.resolve(get(buf, idx));
  } else {
    throw new Error("invalid buffer type");
  }
}
//
// include js in html style
//
function loadScript(url, callback) {
  var script = document.createElement("script");
  script.src = url;
  script.onload = callback;
  document.getElementsByTagName("head")[0].appendChild(script);
}

//
// html
//
const addTestWidget = (element, callback = undefined, eventName = "click") => {
  if (!document.querySelector("#test-buttons")) {
    document.body.insertAdjacentHTML("beforeend", `<div id='test-buttons' style="width: 100%"></div>`);
    document.head.insertAdjacentHTML(
      "beforeend",
      `<style>
      #test-buttons
      button, input {
          display: block;
          width: 20rem;
          margin: 0.5em auto;
          box-sizing: border-box;
        }
    </style>`
    );
  }
  document.querySelector("#test-buttons").insertAdjacentHTML("beforeend", element);

  if (!callback) return;

  const el = document.querySelector("#test-buttons").querySelector(":last-child");
  if (el) el.addEventListener(eventName, callback.bind({ widget: el }));
  else console.error(`no element for <${element}>`);
};

//
// download blob
//
const downloadBlob = (blob, path) => {
  const link = document.createElement("a");
  link.download = path;
  link.href = window.URL.createObjectURL(blob);
  link.click();
  window.URL.revokeObjectURL(link.href); // jjkim
};

//
//
//
