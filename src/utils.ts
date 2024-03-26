export const getDecoder = () => {
  return window.TextDecoder
    ? new window.TextDecoder()
    : {
        decode: function (e) {
          return decodeURIComponent(
            window.escape(String.fromCharCode.apply(String, new Uint8Array(e)))
          );
        },
      };
};

export const getEncoder = () => {
  return window.TextEncoder
    ? new window.TextEncoder()
    : {
        encode: function (e) {
          for (
            var t = new ArrayBuffer(e.length),
              n = new Uint8Array(t),
              i = 0,
              o = e.length;
            i < o;
            i++
          )
            n[i] = e.charCodeAt(i);
          return t;
        },
      };
};

export const extend = (...arr) => {
  let res = arr[0] || {};
  if (res instanceof Object) {
    arr.forEach((item) => {
      item instanceof Object &&
        Object.keys(item).forEach((k) => {
          res[k] = item[k];
        });
    });
  }
  return res;
};

export const mergeArrayBuffer = (e, t) => {
  var n = new Uint8Array(e),
    i = new Uint8Array(t),
    o = new Uint8Array(n.byteLength + i.byteLength);
  return o.set(n, 0), o.set(i, n.byteLength), o.buffer;
};

export const callFunction = (e: Function | Function[], t?: any) => {
  return e instanceof Array && e.length
    ? (e.forEach(function (e) {
        return "function" == typeof e && e(t);
      }),
      null)
    : "function" == typeof e && e(t);
};
