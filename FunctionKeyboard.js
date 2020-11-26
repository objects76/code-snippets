import React, { useContext, useMemo } from "react";
import { FunctionKeyboard } from "viewer-ui";

import { ControlContext } from "../contexts/control";
import { KEY_CODE } from "./KeyboardControl.js";
import storage from "../lib/storage";
import i18n from "../lib/i18n";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function FunctionKey() {
  const {
    state: { fnKeyboard },
    keyboardControl,
    remoteControl,
  } = useContext(ControlContext);
  const { os, language } = storage.get("hostInfo");
  const isWindow = os === 0;
  const isMac = os === 1;
  // const isLinux = os === 2;
  const isJP = language === 1;
  const items = useMemo(
    () =>
      [
        isWindow && {
          name: "Tab",
          onClick: () => keyboardControl.pressKey(KEY_CODE.TAP),
        },
        isWindow && {
          name: "Shift",
          onClick: (active) => keyboardControl.toggleKey(active, KEY_CODE.SHIFT),
          activatable: true,
        },
        isWindow && {
          name: "Ctrl",
          onClick: (active) => keyboardControl.toggleKey(active, KEY_CODE.CTRL),
          activatable: true,
        },
        isWindow && {
          name: "Alt",
          onClick: (active) => keyboardControl.toggleKey(active, KEY_CODE.ALT),
          activatable: true,
        },
        isWindow && {
          name: "Win",
          onClick: (active) => keyboardControl.toggleKey(active, KEY_CODE.WIN),
          activatable: true,
        },
        isMac && {
          name: "option+cmd+esc",
          onClick: async () => {
            keyboardControl.toggleKey(true, 18, null, "AltLeft");
            await delay(30);
            keyboardControl.toggleKey(true, 91, null, "MetaLeft");
            await delay(30);
            keyboardControl.toggleKey(true, 27, null, "Escape");
            await delay(30);
            keyboardControl.toggleKey(false, 18, null, "AltLeft");
            await delay(30);
            keyboardControl.toggleKey(false, 91, null, "MetaLeft");
            await delay(30);
            keyboardControl.toggleKey(false, 27, null, "Escape");
            await delay(30);
          },
          activatable: false,
        },
        isMac && {
          name: "cmd+Q",
          onClick: async () => {
            keyboardControl.toggleKey(true, 91, null, "MetaLeft");
            await delay(30);
            keyboardControl.toggleKey(true, 81, null, "KeyQ");
            await delay(30);
            keyboardControl.toggleKey(false, 91, null, "MetaLeft");
            await delay(30);
            keyboardControl.toggleKey(false, 81, null, "KeyQ");
            await delay(30);
          },
          activatable: false,
        },
        isMac && {
          name: "cmd+W",
          onClick: async () => {
            keyboardControl.toggleKey(true, 91, null, "MetaLeft");
            await delay(30);
            keyboardControl.toggleKey(true, 87, null, "KeyW");
            await delay(30);
            keyboardControl.toggleKey(false, 91, null, "MetaLeft");
            await delay(30);
            keyboardControl.toggleKey(false, 87, null, "KeyW");
            await delay(30);
          },
          activatable: false,
        },
        isMac && {
          name: i18n.message("switchingLanguages"),
          onClick: () => remoteControl.sendSpecialKey(1),
          activatable: false,
        },
        isMac &&
          isJP && {
            name: "英数",
            onClick: () => keyboardControl.pressKey(241, null, "Lang2"),
            activatable: false,
          },
        isMac &&
          isJP && {
            name: "かな",
            onClick: () => keyboardControl.pressKey(242, null, "Lang1"),
            activatable: false,
          },
      ].filter((val) => val !== false),
    []
  );

  return fnKeyboard ? <FunctionKeyboard items={items} /> : null;
}
