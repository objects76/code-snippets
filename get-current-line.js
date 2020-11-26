// from get-current-line/edition-browser/index.js

/**
 * For an error instance, return its stack frames as an array.
 */
export function getFramesFromError(error) {
  // Create an error
  let stack, frames;
  // And attempt to retrieve it's stack
  // https://github.com/winstonjs/winston/issues/401#issuecomment-61913086
  try {
    stack = error.stack;
  } catch (error1) {
    try {
      // @ts-ignore
      const previous = err.__previous__ || err.__previous;
      stack = previous && previous.stack;
    } catch (error2) {
      stack = null;
    }
  }

  // Handle different stack formats
  if (stack) {
    if (Array.isArray(stack)) {
      frames = Array(stack);
    } else {
      frames = stack.toString().split("\n");
    }
  } else {
    frames = [];
  }
  // Parse our frames
  return frames;
}
const lineRegex = /\s+at\s(?:(?<method>.+?)\s\()?(?<file>.+?):(?<line>\d+):(?<char>\d+)\)?\s*$/;
/**
 * Get the locations from a list of error stack frames.
 */
export function getLocationsFromFrames(frames) {
  // Prepare
  const locations = [];
  // Cycle through the lines
  for (const frame of frames) {
    // ensure each line is a string
    const line = (frame || "").toString();
    // skip empty lines
    if (line.length === 0) continue;
    // Error
    // at file:///Users/balupton/Projects/active/get-current-line/asd.js:1:13
    // at ModuleJob.run (internal/modules/esm/module_job.js:140:23)
    // at async Loader.import (internal/modules/esm/loader.js:165:24)
    // at async Object.loadESM (internal/process/esm_loader.js:68:5)
    const match = line.match(lineRegex);
    if (match && match.groups) {
      locations.push({
        method: match.groups.method || "",
        file: match.groups.file || "",
        line: Number(match.groups.line),
        char: Number(match.groups.char),
      });
    }
  }
  return locations;
}
/**
 * If a location is not found, this is the result that is used.
 */
const failureLocation = {
  line: -1,
  char: -1,
  method: "",
  file: "",
};
/**
 * From a list of locations, get the location that is determined by the offset.
 * If none are found, return the failure location
 */
export function getLocationWithOffset(locations, offset) {
  // Continue
  let found = !offset.file && !offset.method;
  // use while loop so we can skip ahead
  let i = 0;
  while (i < locations.length) {
    const location = locations[i];
    // the current location matches the offset
    if (
      (offset.file &&
        (typeof offset.file === "string" ? location.file.includes(offset.file) : offset.file.test(location.file))) ||
      (offset.method &&
        (typeof offset.method === "string"
          ? location.method.includes(offset.method)
          : offset.method.test(location.method)))
    ) {
      // we are found, and we should exit immediatelyg, so return with the frame offset applied
      if (offset.immediate) {
        // apply frame offset
        i += offset.frames || 0;
        // and return the result
        return locations[i];
      }
      // otherwise, continue until the found condition has exited
      else {
        found = true;
        ++i;
        continue;
      }
    }
    // has been found, and the found condition has exited, so return with the frame offset applied
    else if (found) {
      // apply frame offset
      i += offset.frames || 0;
      // and return the result
      return locations[i];
    }
    // nothing has been found yet, so continue until we find the offset
    else {
      ++i;
      continue;
    }
  }
  // return failure
  return failureLocation;
}
/**
 * Get each error stack frame's location information.
 */
function getLocationsFromError(error) {
  const frames = getFramesFromError(error);
  return getLocationsFromFrames(frames);
}
/**
 * Get the file path that appears in the stack of the passed error.
 * If no offset is provided, then the first location that has a file path will be used.
 */
export function getFileFromError(
  error,
  offset = {
    file: /./,
    immediate: true,
  }
) {
  const locations = getLocationsFromError(error);
  return getLocationWithOffset(locations, offset).file;
}
/**
 * Get first determined location information that appears in the stack of the error.
 * If no offset is provided, then the offset used will determine the first location information.
 */
export function getLocationFromError(
  error,
  offset = {
    immediate: true,
  }
) {
  const locations = getLocationsFromError(error);
  return getLocationWithOffset(locations, offset);
}
/**
 * Get the location information about the line that called this method.
 * If no offset is provided, then continue until the caller of the `getCurrentLine` is found.
 * @example Input
 * ``` javascript
 * console.log(getCurrentLine())
 * ```
 * @example Result
 * ``` json
 * {
 * 	"line": "1",
 * 	"char": "12",
 * 	"method": "Object.<anonymous>",
 * 	"file": "/Users/balupton/some-project/calling-file.js"
 * }
 * ```
 */
export default function getCurrentLine(
  offset = {
    method: "getCurrentLine",
    frames: 0,
    immediate: false,
  }
) {
  return getLocationFromError(new Error(), offset);
}

if (window.GetCurrentLine) {
  console.log(getCurrentLine());

  function f1() {
    throw new Error("error from f1");
  }

  function f2() {
    f1();
  }

  function f3() {
    f2();
  }

  try {
    f3();
  } catch (err) {
    console.log(getLocationsFromError(err));
    console.log(getFramesFromError(err).join("\n"));
    // Error: error from f1
    //     at f1 (get-current-line.js:189)
    //     at f2 (get-current-line.js:193)
    //     at f3 (get-current-line.js:197)
    //     at get-current-line.js:201
  }
}
