"use strict";

// delay millisecond with spinlock.
// - other async event can not be processed.
export function spinlock(millisec) {
  const expire = new Date().getTime() + millisec;
  while (new Date().getTime() < expire) {}
  return;
}
