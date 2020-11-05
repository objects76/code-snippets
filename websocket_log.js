// how to use:
//  include following in <head> tag
//  <script language="javascript" src="websocket_log.js" />

class WSClient {
  constructor(host, port) {
    this.connect(host, port);
  }
  connect(host, port) {
    const addr = `ws://${host}:${port}`;
    const ws = new WebSocket(addr);
    ws.onerror = (err) => console.error(`connection to ${addr}:`, err);
    ws.onmessage = (event) => console.log("received msg:", event.data);
    ws.onclose = () => {
      this.off();
      console.info("websocket log disconnected");
    };
    ws.onopen = () => {
      this.websocket = ws;
      this.on();
      this.websocket.send(new Date().toLocaleString() + " info: connected");
    };

    this.original = { ...console };
  }

  on() {
    console.log = this.log;
    console.warn = this.warn;
    console.trace = this.trace;
    console.error = this.error;
    console.info = this.info;
    console.debug = this.debug;
  }
  off() {
    console = this.original;
  }

  close() {
    if (this.websocket) this.websocket.close();
    this.websocket = undefined;
  }

  log = (...args) => {
    const str = args.join(" ");
    this.original.log(str);
    if (this.websocket) this.websocket.send(new Date().toLocaleString() + " log: " + str);
  };
  warn = (...args) => {
    const str = args.join(" ");
    this.original.warn(str);
    if (this.websocket) this.websocket.send(new Date().toLocaleString() + " warn: " + str);
  };
  trace = (...args) => {
    const str = args.join(" ");
    this.original.trace(str);
    if (this.websocket) this.websocket.send(new Date().toLocaleString() + " trace: " + str);
  };
  error = (...args) => {
    const str = args.join(" ");
    this.original.error(str);
    if (this.websocket) this.websocket.send(new Date().toLocaleString() + " error: " + str);
  };
  info = (...args) => {
    const str = args.join(" ");
    this.original.info(str);
    if (this.websocket) this.websocket.send(new Date().toLocaleString() + " info: " + str);
  };
  debug = (...args) => {
    const str = args.join(" ");
    this.original.debug(str);
    if (this.websocket) this.websocket.send(new Date().toLocaleString() + " debug: " + str);
  };
}

var wslog = new WSClient("localhost", 1213);
