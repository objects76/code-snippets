//
// add following to html:
//   <div id="toast"></div>
//

let timeoutId;
let toastUI;
export function toast(msg, permanent = false, selector = "#toast") {
  const timeout_ms = 3000;
  if (!toastUI) {
    toastUI = document.querySelector(selector);
    toastUI.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 50%;
      padding: 15px 20px;
      border-radius: 1em;
      overflow: hidden;
      font-size: 1rem;
      visibility: hidden;
      background: rgba(0, 0, 0, 0.35);
      color: #000000;
      z-index: 10000;
    `;
  }
  const isVisible = toastUI.style.visibility === "visible";
  if (isVisible && timeoutId) clearTimeout(timeoutId);
  timeoutId = undefined;

  if (permanent) {
    toastUI.ondblclick = (evt) => (toastUI.style.visibility = "hidden");
    msg += "\n\nDouble click to close.";
  } else {
    timeoutId = setTimeout(() => (toastUI.style.visibility = "hidden"), timeout_ms);
  }

  toastUI.innerText = msg;
  if (!isVisible) toastUI.style.visibility = "visible";
}
