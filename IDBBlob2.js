"use strict";
import { getRandomInt, getTestBlob, verifyTestBlob, getByteSize, addTestWidget, downloadBlob } from "./Devtools.js";

const MAX_CHUNK_SIZE_ = 10 * 1024 * 1024;
const BLOB_TYPE_ = "application/octet-stream";

if (!window.indexedDB) window.indexedDB = window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

const getKey = (path, seq) => path + ":" + ("00" + seq).slice(-3); // up to (MAX_CHUNK_SIZE_*1000).
const getPath = (key) => key.slice(0, -4);
const nextChar = (c) => String.fromCharCode(c.charCodeAt(0) + 1);

const STORE0 = "store0";
export default class BlobIDB {
  constructor(dbname = "blob.test.db") {
    this.idb;
    const request = window.indexedDB.open(dbname, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const store = db.createObjectStore(STORE0);
    };

    request.onsuccess = (evt) => {
      this.idb = request.result;
      console.log(`'${dbname}' is opened`);
    };
  }
  close = () => {
    this.idb.close();
    this.idb = undefined;
  };
  static drop = (dbname) => {
    const request = window.indexedDB.deleteDatabase(dbname);
    request.onsuccess = (evt) => console.log(`${dbname} successfully deleted`);
    request.onerror = (evt) => console.error(`${dbname} error when delete database`);
    this.idb = undefined;
  };

  put = (blob, blobOffset, key) => {
    const MAX_FILE_SIZE_ = 512 * 1024 * 1024; // 512MB
    if (blobOffset + blob.size > MAX_FILE_SIZE_) {
      const writtableSize = MAX_FILE_SIZE_ - blobOffset;
      if (writtableSize <= 0) throw new Error(`Can not write data. Maximun file size is ${MAX_FILE_SIZE_}`);
      console.warn(`Maximun file size is ${MAX_FILE_SIZE_}, writtable size=${writtableSize}`);

      blob = blob.slice(0, writtableSize);
    }
    console.debug(`[db.write] ${key}, ${blob.size}, offset=${blobOffset}`);

    const tx = this.idb.transaction([STORE0], "readwrite", { durability: "relaxed" });
    const request = tx.objectStore(STORE0).put({ blob, blobOffset }, key);
    request.onsuccess = (evt) => console.debug(`${evt.target.result} done for ${key}`);

    //return new Promise((resolve, reject) => setuptx(tx, resolve, reject));
  };

  getLastChunk = (fullPath, onLastChunk) => {
    const range = IDBKeyRange.bound(fullPath + ":", fullPath + nextChar(":"), false, true);

    const tx = this.idb.transaction([STORE0], "readonly");
    var request = tx.objectStore(STORE0).openCursor(range, "prev");
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const chunkSeq = Number(cursor.key.slice(-3));
        const blob = cursor.value.blob;
        const blobOffset = cursor.value.blobOffset;

        onLastChunk(chunkSeq, blob, blobOffset);
        cursor.advance(999);
      }
    };

    return new Promise((resolve, reject) => setuptx(tx, resolve, reject));
  };

  getBlob = (fullPath) => {
    return new Promise((resolve, reject) => {
      const range = IDBKeyRange.bound(fullPath + ":", fullPath + nextChar(":"), false, true);
      const tx = this.idb.transaction([STORE0], "readonly");
      const request = tx.objectStore(STORE0).getAll(range);
      request.onerror = () => reject(request.error || `Can't read ${fullPath}`);
      request.onsuccess = () => {
        console.debug(`all blobs = #${request.result.length}`);
        resolve(
          new Blob(
            request.result.map((v) => v.blob),
            { type: BLOB_TYPE_ }
          )
        );
      };
    });
  };

  // delete file
  delete = async (folder) => {
    const tx = this.idb.transaction([STORE0], "readwrite");
    const range = IDBKeyRange.bound(folder + ":", folder + nextChar(":"), false, true);
    tx.objectStore(STORE0).delete(range);
    return new Promise((resolve, reject) => {
      setuptx(tx, resolve, reject);
    });
  };

  exist = async (fullPath) => {
    const tx = this.idb.transaction([STORE0], "readonly");
    const request = tx.objectStore(STORE0).get(getKey(fullPath, 0));

    let existed = false;
    request.onsuccess = (evt) => (existed = !!evt.target.result);

    return new Promise((resolve, reject) => {
      setuptx(tx, () => resolve(existed), reject);
    });
  };

  rmdir = async (folder) => {
    const tx = this.idb.transaction([STORE0], "readwrite");
    if (folder) {
      if (folder.endsWith("/")) folder = folder.slice(0, -1);
      const range = IDBKeyRange.bound(folder + "/", folder + nextChar("/"), false, true);
      tx.objectStore(STORE0).delete(range);
    } else {
      tx.objectStore(STORE0).clear();
    }

    return new Promise((resolve, reject) => {
      setuptx(tx, resolve, reject);
    });
  };

  // return list of files in idb.
  dir = async (folder) => {
    let range;
    if (folder) {
      if (folder.endsWith("/")) folder = folder.slice(0, -1);
      range = IDBKeyRange.bound(folder + "/", folder + nextChar("/"), false, true);
    }

    const tx = this.idb.transaction([STORE0], "readonly");

    var request = tx.objectStore(STORE0).openCursor(range, "prev");
    const pathlist = new Map();
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const fullPath = getPath(cursor.key);
        if (!pathlist.get(fullPath)) {
          const size = cursor.value.blobOffset + cursor.value.blob.size;
          pathlist.set(fullPath, size);
        }
        cursor.continue();
      }
    };

    return new Promise((resolve, reject) => {
      setuptx(tx, () => resolve(pathlist), reject);
    });
  };

  // writer class
  static BlobWriter = class {
    constructor(fullPath, db, append = true) {
      console.assert(db && fullPath, `${db}, ${fullPath}`);
      this.db = db;
      this.blobs = [];
      this.tickWritten = Date.now();
      this.chunkSeq = 0;
      this.chunkOffset = 0;
      this.fullPath = fullPath;

      // get previous data.
      // TODO: await is needed?
      if (append) {
        this.db.getLastChunk(fullPath, (chunkSeq, blob, blobOffset) => {
          this.chunkSeq = chunkSeq;
          this.blobs.push(blob);
          this.chunkOffset = blobOffset;
          console.debug(
            `BlobWriter: ${fullPath}, last chunk: seed=${chunkSeq}, blob=${blob.size}, blobOffset=${blobOffset}`
          );
        });
      } else {
        this.db.delete(fullPath);
      }
    }

    write = async (blob, delayed = 100) => {
      if (!this.db) {
        console.warn("BlobWriter is closed.");
        return;
      }
      this.blobs.push(blob);
      if (Date.now() - this.tickWritten < delayed) return;
      this.tickWritten = Date.now();

      const blobJoined = new Blob(this.blobs, { type: BLOB_TYPE_ });
      const key = getKey(this.fullPath, this.chunkSeq);
      const chunkOffset = this.chunkOffset;
      if (blobJoined.size >= MAX_CHUNK_SIZE_) {
        ++this.chunkSeq;
        this.blobs = [];
        this.chunkOffset += blobJoined.size;
      }

      this.db.put(blobJoined, chunkOffset, key);
    };

    close = async () => {
      await this.write(new Blob(), 0);
      this.blobs = [];
      console.debug(`${this.fullPath} is closed, last chunk is ${this.chunkSeq}`);
      this.db = undefined;
    };
  }; // BlobWriter
} // class BlobIDB

function setuptx(tx, resolve, reject) {
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error || new DOMException("IDBError", "IDBError"));
  tx.onabort = () => reject(tx.error || new DOMException("IDBAbort", "IDBAbort"));
}

//
//
//
//
//------------------------------------------------------------------------------
// test: utils for test setup.
//------------------------------------------------------------------------------

const SEND_INTERVAL = 50; // ms
const DELAYED_WRITE = 100;

if (window.IDBBlobTest) {
  let idbdb;
  window.onload = () => {
    idbdb = new BlobIDB();
  };

  addTestWidget(
    `<input type='file' multiple/>`,
    async (evt) => {
      for (const file of evt.target.files) {
        //idbdb.upload(file, "/upload");
        writer = new BlobIDB.BlobWriter("/upload/" + file.name, idbdb);
        writer.write(file);
        writer.close();
      }
    },
    "change"
  );
  addTestWidget(`<hr/><input id='fs-path'></input>`);

  //
  // write
  //
  let writer;
  addTestWidget(`<button>WRITE FILE</button>`, async (evt) => {
    if (writer) return;

    let path = document.querySelector("#fs-path").value;
    if (path.length < 3) {
      path = `/test/rec-${new Date().toLocaleString().replace(/[/:]/g, ".")}.bin`;
      document.querySelector("#fs-path").value = path;
    }

    writer = new BlobIDB.BlobWriter(path, idbdb);

    let offset = 0;
    const testBlob = getTestBlob(1024 * 1024 * 150);
    await verifyTestBlob(testBlob);
    console.debug(`write test: blob=${getByteSize(testBlob.size)}`);

    const writeInterval = setInterval(() => {
      if (!writer) clearInterval(writeInterval);
      else {
        const n = getRandomInt(3 * 1024 * 1024, 10 * 1024 * 1024 + 1);
        const chunk = testBlob.slice(offset, offset + n - (n % 256));
        console.debug(`try write ${getByteSize(chunk.size)}`);
        writer.write(chunk, DELAYED_WRITE);
        offset += chunk.size;
        if (offset >= testBlob.size) {
          clearInterval(writeInterval);
          writer.close();
          writer = undefined;
        }
      }
    }, SEND_INTERVAL);
  });

  addTestWidget(`<button>STOP WRITE and VERIFY</button>`, async (evt) => {
    await writer?.close(); // it means un-expected stop(lik closing browser tab).
    writer = undefined;
    document.querySelector("#read").click();
  });
  //
  // read file
  //
  addTestWidget(`<button id='read'>VERIFY FILE</button>`, async (evt) => {
    const path = document.querySelector("#fs-path").value;
    if (path.length < 3) return;
    document.querySelector("#fs-path").value = "";

    const blob = await idbdb.getBlob(path);
    console.log(`[read] size= ${getByteSize(blob)}`);
    if (await verifyTestBlob(blob, 0)) console.log("verified");
  });

  //
  // download
  //
  addTestWidget(`<button>DOWNLOAD</button>`, async (evt) => {
    const path = document.querySelector("#fs-path").value;
    if (path.length < 3) return;

    const blob = await idbdb.getBlob(path);
    console.log(`[read] size= ${getByteSize(blob)}`);
    downloadBlob(blob, path);
  });

  //
  // dir
  //
  addTestWidget(`<button id='dir'>DIR</button>`, async (evt) => {
    let path = document.querySelector("#fs-path").value;
    if (path.length < 3) path = undefined;

    const pathlist = await idbdb.dir(path);
    console.log("---------------------------------------------------");
    //console.log([...pathlist].join("\n"));

    const htmls = [];
    htmls.push(`<li>[${path ? path : "/"}, ${new Date().toLocaleString()}]</li>`);
    for (const [path, size] of pathlist) {
      htmls.push(`<li><a href='#${path}'>${path}</a>, size=${getByteSize(size)}</li>`);
    }

    document.querySelector("#ui-dir").innerHTML = htmls.join("\n");
  });

  //
  // rmdir
  //
  addTestWidget(`<button>RMDIR</button>`, async (evt) => {
    let path = document.querySelector("#fs-path").value;
    if (path.length < 3) path = undefined;

    await idbdb.rmdir(path);
  });

  //
  // existed
  //
  addTestWidget(`<button>EXISTED</button>`, async (evt) => {
    let path = document.querySelector("#fs-path").value;
    if (path.length < 3) return;

    console.log(path, "=", await idbdb.exist(path));
  });

  //
  // list ui
  //
  addTestWidget("<ul id='ui-dir'></ul>", (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    if (evt.target.hash) document.querySelector("#fs-path").value = window.decodeURI(evt.target.hash.substring(1));
  });
}
