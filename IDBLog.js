//
// persistent logger for remote debugging using indexed db.
//

export default class IDBLog {
  constructor(dbname, ver = 1) {
    this.dbname = dbname;
    this.version = ver;
    this.database = undefined;
    this.maxRows = 500;
    this._console = undefined;

    this.storeName = "logs";
    IDBLog._init();

    const request = indexedDB.open(this.dbname, this.version);
    request.onerror = (evt) => {
      console.error("idb open failed:", evt.target.errorCode);
    };
    request.onsuccess = (evt) => {
      this.database = request.result;
      console.log("idb opended");

      this.database.onerror = (evt) => {
        console.error("idb open error code= " + evt.target.errorCode);
      };

      this._onOpened();
    };

    // 상속받는 클래스에서 overriding을 지원하기 위해서는 아래와 같은 형태는 안됨.
    // request.onupgradeneeded = this._onUpgradeEnded;
    request.onupgradeneeded = (evt) => this._onUpgradeEnded(evt);
  }

  isValid() {
    return !!this.database;
  }
  restoreConsoleLog = () => {
    window.console = this._console;
  };
  replaceConsoleLog = () => {
    if (!this._console) this._console = { ...window.console };

    // spread operator detail?
    window.console.log = (...args) => {
      this.log(...args);
      this._console.log.apply(this._console, args);
    };
    window.console.warn = (...args) => {
      this.warn(...args);
      this._console.warn.apply(this._console, args);
    };
    window.console.trace = (...args) => {
      this.trace(...args);
      this._console.trace.apply(this._console, args);
    };
    window.console.error = (...args) => {
      this.error(...args);
      this._console.error.apply(this._console, args);
    };
    window.console.info = (...args) => {
      this.info(...args);
      this._console.info.apply(this._console, args);
    };
    window.console.debug = (...args) => {
      this.debug(...args);
      this._console.debug.apply(this._console, args);
    };
  };
  log = (...args) => this._write2db("[log ] ", args);
  info = (...args) => this._write2db("[info] ", args);
  warn = (...args) => this._write2db("[warn] ", args);
  error = (...args) => this._write2db("[err ] ", args);
  debug = (...args) => this._write2db("[debg] ", args);
  trace = (...args) => this._write2db("[trac] ", args);

  _onOpened = () => {};
  _onUpgradeEnded = (evt) => {
    const db = evt.target.result;

    if (evt.oldVersion > 0) {
      console.log("_onUpgradeEnded:", evt);
      // upgrade or new schema handling is needed.
      console.info(`delete old store for ver${evt.oldVersion}`);
      db.deleteObjectStore(this.storeName);
    }

    // version 1 schema?
    const logStore = db.createObjectStore(this.storeName, { autoIncrement: true });
    logStore.createIndex("tick", "tick", { unique: false }); // tick resolution is milliseconds, so not unique.
    logStore.transaction.oncomplete = (evt) => console.log("idb upgrade done");
  };

  clear = () => {
    if (!this.database) return;
    console.log("idblog.clear");
    const transaction = this.database.transaction([this.storeName], "readwrite");
    const store = transaction.objectStore(this.storeName);
    const request = store.clear();
    request.onsuccess = (evt) => {
      console.log("idblog.successfully cleared");
    };
  };
  close = () => {
    if (this.database) {
      this.database.close();
      this.database = undefined;
    }
  };
  _write2db = (label, args) => {
    if (!this.database) {
      console.warn("idblog is not opened");
      return;
    }

    const data = {
      tick: Date.now(),
      log: label + args.join(" "),
    };

    const transaction = this.database.transaction([this.storeName], "readwrite");
    const logStore = transaction.objectStore(this.storeName);
    logStore.add(data);
    const countRequest = logStore.count();
    countRequest.onsuccess = () => {
      if (countRequest.result > this.maxRows) {
        logStore.openCursor().onsuccess = (evt) => {
          const cursor = evt.target.result;
          if (cursor) {
            const delRequest = cursor.delete();
          }
        };
      }
    };
  };

  _download = (fromTime, toTime) => {
    let logTexts = "";
    const store = this.database.transaction(this.storeName).objectStore(this.storeName);

    if (!toTime) toTime = Date.now();

    const datefmt = (tickMs) => {
      const d = new Date(tickMs);
      const day = "0" + d.getDate();
      const month = "0" + (d.getMonth() + 1);
      const year = d.getFullYear();
      const h = "0" + d.getHours();
      const m = "0" + d.getMinutes();
      const s = "0" + d.getSeconds();
      const ms = "00" + d.getMilliseconds();

      return (
        `\n${month.slice(-2)}/${day.slice(-2)}/${year} ` +
        `${h.slice(-2)}:${m.slice(-2)}:${s.slice(-2)}.${ms.slice(-3)} `
      );
    };
    store.openCursor().onsuccess = (evt) => {
      const cursor = evt.target.result;
      if (cursor) {
        const v = cursor.value;
        if (!fromTime || (fromTime <= v.tick && v.tick <= toTime)) {
          logTexts += datefmt(v.tick) + v.log;
        }
        cursor.continue();
      } else {
        IDBLog._downloadLink(logTexts + "\n");
      }
    };
  };

  downloadAll = () => {
    this._download(undefined, undefined);
  };
  downloadToday = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    this._download(start.getTime(), end.getTime());
  };

  //
  // static.
  static _init() {
    if (window.indexedDB) return;

    window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    if (!window.indexedDB) throw new Error("indexed db is not supported");

    window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
  }

  static _downloadLink = (data) => {
    if (!data) {
      console.log("data is empty");
      return;
    }

    const options = {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    };
    const blob = new Blob([data], { type: "text/plain" });
    const link = document.createElement("a");
    const clickEvent = document.createEvent("MouseEvents");

    const datestr = new Intl.DateTimeFormat("default", options).format(new Date()).replace(/[/: ]+/g, "");
    link.download = location.host + "_" + datestr + ".txt";
    link.href = window.URL.createObjectURL(blob);
    link.dataset.downloadurl = ["text/plain", link.download, link.href].join(":");

    clickEvent.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    link.dispatchEvent(clickEvent);
  };

  static dropDb = (dbname) => {
    console.log(`req: drop ${dbname}`);
    const request = window.indexedDB.deleteDatabase(dbname);
    request.onsuccess = (evt) => {
      console.log(`${dbname} successfully cleared and dropped`);
    };
    request.onerror = (evt) => {
      console.error(`${dbname} error when drop database`);
    };
  };
}
//
// benchmarks
//
class IDBBenchmark extends IDBLog {
  constructor(n, elementSelector) {
    super("benchmark1", 2);
    IDBLog.prototype._onUpgradeEnded = this._onUpgradeEnded;

    this.repeat = n;
    this.elementSelector = elementSelector;
    this.startTime = undefined;
  }

  _onUpgradeEnded = (evt) => {
    console.log("debug.onupgradeneeded");
    var db = evt.target.result;

    // Create an objectStore to hold information about our customers. We're
    // going to use "ssn" as our key path because it's guaranteed to be
    // unique.
    var objectStore = db.createObjectStore("customers", { keyPath: "ssn" });

    // Create an index to search customers by name. We may have duplicates
    // so we can't use a unique index.
    objectStore.createIndex("name", "name", { unique: false });

    // Create an index to search customers by email. We want to ensure that
    // no two customers have the same email, so use a unique index.
    objectStore.createIndex("email", "email", { unique: true });

    // Use transaction oncomplete to make sure the objectStore creation is
    // finished
    objectStore.transaction.oncomplete = (evt) => {
      console.log("debug.onupgradeneeded.transaction.oncomplete");
    };
  };
  _onOpened = () => {
    this.doBenchmark();
  };
  // on opened evt.
  doBenchmark = () => {
    console.log("processWriteTest");
    const n = this.repeat;

    this.status("Connected to database. Preparing to process " + n + " writes.");
    this.status("Testing... Please wait until test will be finished.");
    //alert("The test can take a lot of time (1-2 minutes). The browser can be locked during the test. Ready to launch?");

    this.startTime = Date.now();
    for (var i = 0; i < n; i++) {
      this.processWrite(this.database, i);
    }
    // The write will be finished after last callback
  };
  //
  // @private
  testFinished = () => {
    const diffMs = Date.now() - this.startTime;
    const mean = diffMs / this.repeat;

    //alert("Done. Check the result on the page.");
    console.log("testFinished");
    const msg = `One write request takes <b>${mean}ms</b><br>Test time: ${diffMs / 1000.0} seconds`;
    this.status(msg);
    IDBLog.dropDb(this.dbname);
  };
  //
  // @private
  processWrite = (db, i) => {
    // console.log("processWrite");
    var transaction = db.transaction(["customers"], "readwrite");
    var objectStore = transaction.objectStore("customers");

    // Do something when all the data is added to the database.
    transaction.oncomplete = (evt) => {
      // console.log("processWrite.transaction.oncomplete");
    };

    transaction.onerror = (evt) => {
      // Don't forget to handle errors!
      console.error("processWrite.transaction.onerror: " + evt.code);
    };

    var data = { ssn: i, name: "Bill", age: 35, email: "mail" + i + "@rtlservice.com" };
    var request = objectStore.put(data);
    request.onsuccess = (evt) => {
      // evt.target.result == customerData[i].ssn;
      // console.log("processWrite.transaction...onsuccess: "+evt.target.result);
      if (i == this.repeat - 1) {
        this.testFinished();
      }
    };
    request.onerror = () => {
      console.error("addPublication error", this.error);
    };
  };

  status = (str) => {
    const htmlTag = document.querySelector(this.elementSelector);
    if (htmlTag) htmlTag.innerHTML = str;
    else console.info("benchmark: ", str);
  };
}

// index.js test
document.body.innerHTML = `
    <button id="add-log">Add log</button></br>
    <button id="clear-log">Clear logs</button></br>
    <button id="get-log-file">Get log file</button></br>
    <button id="replace-console">Replace console</button></br>
    <hr/>
    <button id="delete-db">Delete db</button></br>
    <button id="add-log-v1">Add log(v1)</button></br>
    <button id="add-log-v2">Add log(v2)</button></br>
    <hr/>
    <button id="start-benchmark">Start benchmark</button></br>
    <div id="benchmark-status"></div>
`;

const dblog = {
  dbname: "log1",
  inst: undefined,
  _ver: 0,
  get: (ver = undefined) => {
    if (!dblog.inst || (ver && dblog._ver != ver)) {
      if (dblog.inst) dblog.inst.close();
      dblog.inst = new IDBLog(dblog.dbname, ver ? ver : 1);
    }
    dblog._ver = ver;
    return dblog.inst;
  },
};

window.onload = () => {
  document.querySelector("#add-log").addEventListener("click", (evt) => {
    const logger = dblog.get();
    setTimeout(() => logger.log("add log to indexeddb", 1, "str1"), logger.isValid() ? 0 : 300);
  });
  document.querySelector("#clear-log").addEventListener("click", (evt) => {
    const logger = dblog.get();
    setTimeout(() => logger.clear(), logger.isValid() ? 0 : 300);
  });
  document.querySelector("#get-log-file").addEventListener("click", (evt) => {
    const logger = dblog.get();
    setTimeout(() => logger.downloadToday(), logger.isValid() ? 0 : 300);
  });
  document.querySelector("#replace-console").addEventListener("click", (evt) => {
    const logger = dblog.get();
    setTimeout(
      () => {
        dblog.get().replaceConsoleLog();
        console.info("this log will be stored in idb[logs]");
      },
      logger.isValid() ? 0 : 300
    );
  });
  // version test
  document.querySelector("#delete-db").addEventListener("click", (evt) => {
    IDBLog.dropDb(dblog.dbname);
  });
  document.querySelector("#add-log-v1").addEventListener("click", (evt) => {
    const logger = dblog.get(1);
    setTimeout(() => logger.log("add log to indexeddb(v1)", 1, "str1"), logger.isValid() ? 0 : 300);
  });
  document.querySelector("#add-log-v2").addEventListener("click", (evt) => {
    const logger = dblog.get(2);
    setTimeout(() => logger.log("add log to indexeddb(v2)", 1, "str1"), logger.isValid() ? 0 : 300);
  });

  //
  document.querySelector("#start-benchmark").addEventListener("click", (evt) => {
    new IDBBenchmark(5000, "#benchmark-status");
  });
};
