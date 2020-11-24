import { toast } from "./toast.js";

// Extended example from https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
// function init() {
//   //                Init and start saving console logs into IndexedDB
//   l2i.init(function () {
//     // successfully initialized
//     l2i.on(function () {
//       // l2i.consoles.original('--- All further logs will be saved in IndexedDB database ---');
//       console.log("one one");
//       console.log("two");
//       console.log("three");
//       console.log("444");
//     });
//   });
// }
// init();

// Clear the database
//                l2i.init(function(){l2i.on(function(){l2i.clear();});});

// Download a file with logs saved in IndexedDB

document.querySelector("#test").addEventListener("click", function () {
  //   wslog.log("message1", 1234, "end string...");
  console.log(typeof toast);
  toast("handled...." + new Date().toLocaleString() + ", permanent", true);
  //   toast("handled...." + new Date().toLocaleString() + ", autoclose");
});

document.querySelector("#test2").addEventListener("click", function () {
  console.log("log test...");
});

document.querySelector("#download").addEventListener("click", function () {
  l2i.download();
  l2i.clearAndDrop();
});
