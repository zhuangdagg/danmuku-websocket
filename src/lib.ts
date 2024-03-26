import { CONSTANTS } from "./constant";
import { MESSAGE_PROTOCOL } from "./message";

import pako from "pako";

import {
  extend,
  callFunction,
  getEncoder,
  getDecoder,
  mergeArrayBuffer,
} from "./utils";

const noop = () => {};

export class DanmakuWebSocket {
  options = {
    url: "",
    urlList: [],
    rid: 0,
    aid: 0,
    uid: 0,
    from: -1,
    retry: !0,
    protover: 0,
    retryMaxCount: 0,
    retryInterval: 5,
    retryThreadCount: 10,
    connectTimeout: 5e3,
    retryConnectCount: 3,
    retryconnectTimeout: 1e4,
    retryRoundInterval: Math.floor(2 * Math.random()) + 3,
    customAuthParam: [],
    fallback: noop,
    heartBeatInterval: 30,
    onReceivedMessage: noop,
    onReceiveAuthRes: noop,
    onHeartBeatReply: noop,
    onInitialized: noop,
    onOpen: noop,
    onClose: noop,
    onError: noop,
    onListConnectError: noop,
    onRetryFallback: noop,
  };

  ws!: WebSocket;

  wsBinaryHeaderList: any = [];

  authInfo = { origin: "", encode: "" };

  state = {
    retryCount: 0,
    listConnectFinishedCount: 0,
    index: 0,
    connectTimeoutTimes: 0,
  };

  callbackQueueList = {
    onInitializedQueue: [],
    onOpenQueue: [],
    onCloseQueue: [],
    onErrorQueue: [],
    onReceivedMessageQueue: [],
    onHeartBeatReplyQueue: [],
    onRetryFallbackQueue: [],
    onListConnectErrorQueue: [],
    onReceiveAuthResQueue: [],
  };

  HEART_BEAT_INTERVAL: any = 0;

  CONNECT_TIMEOUT: any = 0;

  encoder: any;
  decoder: any;

  constructor(options) {
    if (!(this instanceof DanmakuWebSocket)) {
      throw new TypeError("Cannot call a class as a function");
    }
    if (!this.checkOptions(options)) return;

    this.options = extend({}, this.options, options);
    this.wsBinaryHeaderList = extend([], MESSAGE_PROTOCOL);

    if (
      0 !== this.options.urlList.length &&
      0 !== this.options.retryMaxCount &&
      this.options.retryMaxCount < this.options.urlList.length
    ) {
      this.options.retryMaxCount = this.options.urlList.length - 1;
    }

    this.HEART_BEAT_INTERVAL = 0;
    this.CONNECT_TIMEOUT = 0;

    this.mixinCallback().initialize(
      this.options.urlList.length > 0
        ? this.options.urlList[0]
        : this.options.url
    );
  }

  checkOptions(opts) {
    return opts || opts instanceof Object
      ? opts.url
        ? !!opts.rid ||
          (console.error("WebSocket Initialize options rid(cid) missing."),
          false)
        : (console.error("WebSocket Initialize options url missing."), false)
      : (console.error("WebSocket Initialize options missing or error.", opts),
        false);
  }

  initialize(e: any) {
    let t = this,
      n: any =
        "MozWebSocket" in window ? window.MozWebSocket : window.WebSocket,
      i = this.options;
    try {
      this.ws = new n(e);
      (this.ws.binaryType = "arraybuffer"),
        (this.ws.onopen = this.onOpen.bind(this)),
        (this.ws.onmessage = this.onMessage.bind(this)),
        (this.ws.onclose = this.onClose.bind(this)),
        (this.ws.onerror = this.onError.bind(this));
      callFunction(this.callbackQueueList.onInitializedQueue),
        (this.callbackQueueList.onInitializedQueue = []);
      var o =
        this.state.connectTimeoutTimes >= 3
          ? i.retryconnectTimeout
          : i.connectTimeout;
      this.CONNECT_TIMEOUT = setTimeout(function () {
        (t.state.connectTimeoutTimes += 1),
          console.error("connect timeout ", t.state.connectTimeoutTimes),
          t.ws.close();
      }, o);
    } catch (e) {
      "function" == typeof i.fallback && i.fallback();
    }
    return this;
  }

  mixinCallback() {
    let e = this.options,
      t = this.callbackQueueList;

    return this.addCallback(e.onReceivedMessage, t.onReceivedMessageQueue)
      .addCallback(e.onHeartBeatReply, t.onHeartBeatReplyQueue)
      .addCallback(e.onInitialized, t.onInitializedQueue)
      .addCallback(e.onOpen, t.onOpenQueue)
      .addCallback(e.onClose, t.onCloseQueue)
      .addCallback(e.onError, t.onErrorQueue)
      .addCallback(e.onRetryFallback, t.onRetryFallbackQueue)
      .addCallback(e.onListConnectError, t.onListConnectErrorQueue)
      .addCallback(e.onReceiveAuthRes, t.onReceiveAuthResQueue);
  }

  addCallback(e, t) {
    "function" == typeof e && t instanceof Array && t.push(e);
    return this;
  }

  // websocket
  onOpen() {
    return (
      callFunction(this.callbackQueueList.onOpenQueue),
      (this.state.connectTimeoutTimes = 0),
      this.CONNECT_TIMEOUT && clearTimeout(this.CONNECT_TIMEOUT),
      this.userAuthentication(),
      this
    );
  }

  onMessage(e) {
    var t = this;
    try {
      var n: any = this.convertToObject(e.data);
      if (n instanceof Array)
        n.forEach(function (e) {
          t.onMessage(e);
        });
      else if (n instanceof Object)
        switch (n.op) {
          case CONSTANTS.WS_OP_HEARTBEAT_REPLY:
            this.onHeartBeatReply(n.body);
            break;
          case CONSTANTS.WS_OP_MESSAGE:
            this.onMessageReply(n.body, n.seq);
            break;
          case CONSTANTS.WS_OP_CONNECT_SUCCESS:
            if (0 !== n.body.length && n.body[0])
              switch (n.body[0].code) {
                case CONSTANTS.WS_AUTH_OK:
                  this.heartBeat();
                  break;
                case CONSTANTS.WS_AUTH_TOKEN_ERROR:
                  (this.options.retry = !1),
                    "function" == typeof this.options.onReceiveAuthRes &&
                      (this.options.onReceiveAuthRes as any)(n.body);
                  break;
                default:
                  this.onClose();
              }
            else this.heartBeat();
        }
    } catch (e) {
      console.error("WebSocket Error: ", e);
    }
    return this;
  }

  heartBeat() {
    var e = this;
    clearTimeout(this.HEART_BEAT_INTERVAL);
    var t = this.convertToArrayBuffer({}, CONSTANTS.WS_OP_HEARTBEAT);
    this.ws.send(t),
      (this.HEART_BEAT_INTERVAL = setTimeout(function () {
        e.heartBeat();
      }, 1e3 * this.options.heartBeatInterval));
  }

  onHeartBeatReply(e) {
    callFunction(this.callbackQueueList.onHeartBeatReplyQueue, e);
  }

  onMessageReply(e, t) {
    var n = this;
    try {
      e instanceof Array
        ? e.forEach(function (e) {
            n.onMessageReply(e, t);
          })
        : e instanceof Object &&
          "function" == typeof this.options.onReceivedMessage &&
          (this.options.onReceivedMessage as any)(e, t);
    } catch (e) {
      console.error("On Message Resolve Error: ", e);
    }
  }

  userAuthentication() {
    var e = this,
      t = this.options,
      n: any = {
        uid: parseInt(t.uid + "", 10),
        roomid: parseInt("" + t.rid, 10),
        protover:
          parseInt("" + t.protover, 10) ||
          CONSTANTS.WS_BODY_PROTOCOL_VERSION_NORMAL,
      },
      i: any = "";
    t.aid && (n.aid = parseInt("" + t.aid, 10)),
      t.from > 0 && (n.from = parseInt("" + t.from, 10) || 7);
    for (var r = 0; r < t.customAuthParam.length; r++) {
      var a: any = t.customAuthParam[r],
        s = a.type || "string";
      switch (
        (void 0 !== n[a.key] &&
          console.error("Token has the same key already! 【" + a.key + "】"),
        (a.key.toString() && a.value.toString()) ||
          console.error(
            "Invalid customAuthParam, missing key or value! 【" +
              a.key +
              "】-【" +
              a.value +
              "】"
          ),
        s)
      ) {
        case "string":
          n[a.key] = a.value;
          break;
        case "number":
          n[a.key] = parseInt(a.value, 10);
          break;
        case "boolean":
          n[a.key] = !!n[a.value];
          break;
        default:
          return void console.error(
            "Unsupported customAuthParam type!【" + s + "】"
          );
      }
    }
    (i = this.convertToArrayBuffer(
      JSON.stringify(n),
      CONSTANTS.WS_OP_USER_AUTHENTICATION
    )),
      (this.authInfo.origin = n),
      (this.authInfo.encode = i),
      setTimeout(function () {
        e.ws.send(i);
      }, 0);
  }

  convertToArrayBuffer(e, t) {
    this.encoder || (this.encoder = getEncoder());
    var n = new ArrayBuffer(CONSTANTS.WS_PACKAGE_HEADER_TOTAL_LENGTH),
      i = new DataView(n, CONSTANTS.WS_PACKAGE_OFFSET),
      r = this.encoder.encode(e);
    return (
      i.setInt32(
        CONSTANTS.WS_PACKAGE_OFFSET,
        CONSTANTS.WS_PACKAGE_HEADER_TOTAL_LENGTH + r.byteLength
      ),
      (this.wsBinaryHeaderList[2].value = t),
      this.wsBinaryHeaderList.forEach(function (e) {
        4 === e.bytes
          ? i.setInt32(e.offset, e.value)
          : 2 === e.bytes && i.setInt16(e.offset, e.value);
      }),
      mergeArrayBuffer(n, r)
    );
  }

  onClose() {
    var e = this,
      t = this.options.urlList.length;
    return (
      callFunction(this.callbackQueueList.onCloseQueue),
      clearTimeout(this.HEART_BEAT_INTERVAL),
      this.options.retry
        ? (this.checkRetryState()
            ? setTimeout(function () {
                console.error("Danmaku Websocket Retry .", e.state.retryCount),
                  (e.state.index += 1),
                  0 === t || e.state.retryCount > e.options.retryThreadCount
                    ? setTimeout(function () {
                        e.initialize(e.options.url);
                      }, 1e3 * e.options.retryRoundInterval)
                    : 0 !== t && e.state.index > t - 1
                    ? ((e.state.index = 0),
                      (e.state.listConnectFinishedCount += 1),
                      1 === e.state.listConnectFinishedCount &&
                        callFunction(
                          e.callbackQueueList.onListConnectErrorQueue
                        ),
                      setTimeout(function () {
                        e.initialize(e.options.urlList[e.state.index]);
                      }, 1e3 * e.options.retryRoundInterval))
                    : e.initialize(e.options.urlList[e.state.index]);
              }, 1e3 * this.options.retryInterval)
            : (console.error("Danmaku Websocket Retry Failed."),
              callFunction(this.callbackQueueList.onRetryFallbackQueue)),
          this)
        : this
    );
  }

  onError(e) {
    return (
      console.error("Danmaku Websocket On Error.", e),
      callFunction(this.callbackQueueList.onErrorQueue, e),
      this
    );
  }

  destroy() {
    this.HEART_BEAT_INTERVAL && clearTimeout(this.HEART_BEAT_INTERVAL),
      this.CONNECT_TIMEOUT && clearTimeout(this.CONNECT_TIMEOUT),
      (this.options.retry = !1),
      this.ws && this.ws.close(),
      (this.ws = null as any);
  }

  checkRetryState() {
    var e = this.options,
      t = false;
    return (
      (0 === e.retryMaxCount || this.state.retryCount < e.retryMaxCount) &&
        ((this.state.retryCount += 1), (t = !0)),
      t
    );
  }

  convertToObject(e) {
    var t = new DataView(e),
      n: any = { body: [], packetLen: 0, op: undefined };
    if (
      ((n.packetLen = t.getInt32(CONSTANTS.WS_PACKAGE_OFFSET)),
      this.wsBinaryHeaderList.forEach(function (e) {
        4 === e.bytes
          ? (n[e.key] = t.getInt32(e.offset))
          : 2 === e.bytes && (n[e.key] = t.getInt16(e.offset));
      }),
      n.packetLen < e.byteLength &&
        this.convertToObject(e.slice(0, n.packetLen)),
      this.decoder || (this.decoder = getDecoder()),
      !n.op ||
        (CONSTANTS.WS_OP_MESSAGE !== n.op &&
          n.op !== CONSTANTS.WS_OP_CONNECT_SUCCESS))
    )
      n.op &&
        CONSTANTS.WS_OP_HEARTBEAT_REPLY === n.op &&
        (n.body = {
          count: t.getInt32(CONSTANTS.WS_PACKAGE_HEADER_TOTAL_LENGTH),
        });
    else
      for (
        var i = CONSTANTS.WS_PACKAGE_OFFSET,
          r = n.packetLen,
          u: any = "",
          c = "";
        i < e.byteLength;
        i += r
      ) {
        (r = t.getInt32(i)), (u = t.getInt16(i + CONSTANTS.WS_HEADER_OFFSET));
        try {
          if (n.ver === CONSTANTS.WS_BODY_PROTOCOL_VERSION_DEFLATE) {
            var l = e.slice(i + u, i + r),
              f = pako.inflate(new Uint8Array(l));
            c = this.convertToObject(f.buffer).body;
          } else {
            var h = this.decoder.decode(e.slice(i + u, i + r));
            c = 0 !== h.length ? JSON.parse(h) : null;
          }
          c && n.body.push(c);
        } catch (t) {
          console.error("decode body error:", new Uint8Array(e), n, t);
        }
      }
    return n;
  }
  send(e) {
    this.ws && this.ws.send(e);
  }
}
