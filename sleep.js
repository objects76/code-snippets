"use strict";

export function sleep(millisec) {
  const expire = new Date().getTime() + millisec;
  while (new Date().getTime() < expire) {}
  return;
}
