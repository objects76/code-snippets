!(function (e, n) {
  "object" == typeof exports && "object" == typeof module
    ? (module.exports = n())
    : "function" == typeof define && define.amd
    ? define("customProtocolCheck", [], n)
    : "object" == typeof exports
    ? (exports.customProtocolCheck = n())
    : (e.customProtocolCheck = n());
})(window, function () {
  return (function (e) {
    var n = {};
    function t(o) {
      if (n[o]) return n[o].exports;
      var r = (n[o] = { i: o, l: !1, exports: {} });
      return e[o].call(r.exports, r, r.exports, t), (r.l = !0), r.exports;
    }
    return (
      (t.m = e),
      (t.c = n),
      (t.d = function (e, n, o) {
        t.o(e, n) || Object.defineProperty(e, n, { enumerable: !0, get: o });
      }),
      (t.r = function (e) {
        "undefined" != typeof Symbol &&
          Symbol.toStringTag &&
          Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }),
          Object.defineProperty(e, "__esModule", { value: !0 });
      }),
      (t.t = function (e, n) {
        if ((1 & n && (e = t(e)), 8 & n)) return e;
        if (4 & n && "object" == typeof e && e && e.__esModule) return e;
        var o = Object.create(null);
        if ((t.r(o), Object.defineProperty(o, "default", { enumerable: !0, value: e }), 2 & n && "string" != typeof e))
          for (var r in e)
            t.d(
              o,
              r,
              function (n) {
                return e[n];
              }.bind(null, r)
            );
        return o;
      }),
      (t.n = function (e) {
        var n =
          e && e.__esModule
            ? function () {
                return e.default;
              }
            : function () {
                return e;
              };
        return t.d(n, "a", n), n;
      }),
      (t.o = function (e, n) {
        return Object.prototype.hasOwnProperty.call(e, n);
      }),
      (t.p = ""),
      t((t.s = 0))
    );
  })([
    function (e, n, t) {
      e.exports = t(1);
    },
    function (e, n) {
      var t,
        o = {
          getUserAgent: function () {
            return window.navigator.userAgent;
          },
          userAgentContains: function (e) {
            return (e = e.toLowerCase()), this.getUserAgent().toLowerCase().indexOf(e) > -1;
          },
          isOSX: function () {
            return this.userAgentContains("Macintosh");
          },
          isFirefox: function () {
            return this.userAgentContains("firefox");
          },
          isInternetExplorer: function () {
            return this.userAgentContains("trident");
          },
          isIE: function () {
            var e = this.getUserAgent().toLowerCase();
            return e.indexOf("msie") > 0 || e.indexOf("trident/") > 0;
          },
          isEdge: function () {
            return this.getUserAgent().toLowerCase().indexOf("edge") > 0;
          },
          isChrome: function () {
            var e = window.chrome,
              n = window.navigator,
              t = n.vendor,
              o = void 0 !== window.opr,
              r = n.userAgent.indexOf("Edge") > -1,
              i = n.userAgent.match("CriOS");
            return (null != e && "Google Inc." === t && !1 === o && !1 === r) || i;
          },
          isOpera: function () {
            return this.userAgentContains(" OPR/");
          },
        },
        r = function (e, n, t) {
          return e.addEventListener
            ? (e.addEventListener(n, t),
              {
                remove: function () {
                  e.removeEventListener(n, t);
                },
              })
            : (e.attachEvent(n, t),
              {
                remove: function () {
                  e.detachEvent(n, t);
                },
              });
        },
        i = function (e, n) {
          var t = document.createElement("iframe");
          return (t.src = n), (t.id = "hiddenIframe"), (t.style.display = "none"), e.appendChild(t), t;
        },
        u = function (e, n, o) {
          var u = setTimeout(function () {
              n(), a.remove();
            }, t),
            c = document.querySelector("#hiddenIframe");
          c || (c = i(document.body, "about:blank")),
            (onBlur = function () {
              clearTimeout(u), a.remove(), o();
            });
          var a = r(window, "blur", onBlur);
          c.contentWindow.location.href = e;
        },
        c = function (e, n, o) {
          for (
            var i = setTimeout(function () {
                n(), c.remove();
              }, t),
              u = window;
            u.parent && u != u.parent;

          )
            u = u.parent;
          onBlur = function () {
            clearTimeout(i), c.remove(), o();
          };
          var c = r(u, "blur", onBlur);
          window.location = e;
        },
        a = function (e, n, t) {
          var o = document.querySelector("#hiddenIframe");
          o || (o = i(document.body, "about:blank"));
          try {
            (o.contentWindow.location.href = e), t();
          } catch (e) {
            "NS_ERROR_UNKNOWN_PROTOCOL" == e.name && n();
          }
        },
        f = function (e, n, t) {
          navigator.msLaunchUri(e, t, n);
        },
        s = function () {
          var e,
            n = window.navigator.userAgent,
            t = n.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
          return /trident/i.test(t[1])
            ? ((e = /\brv[ :]+(\d+)/g.exec(n) || []), parseFloat(e[1]) || "")
            : "Chrome" === t[1] && null != (e = n.match(/\b(OPR|Edge)\/(\d+)/))
            ? parseFloat(e[2])
            : ((t = t[2] ? [t[1], t[2]] : [window.navigator.appName, window.navigator.appVersion, "-?"]),
              null != (e = n.match(/version\/(\d+)/i)) && t.splice(1, 1, e[1]),
              parseFloat(t[1]));
        };
      e.exports = function (e, n, i) {
        var d = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : 2e3,
          l = arguments.length > 4 ? arguments[4] : void 0,
          m = function () {
            n && n();
          },
          v = function () {
            i && i();
          },
          p = function () {
            l && l();
          },
          g = function () {
            o.isFirefox()
              ? s() >= 64
                ? u(e, m, v)
                : a(e, m, v)
              : o.isChrome()
              ? c(e, m, v)
              : o.isOSX()
              ? u(e, m, v)
              : p();
          };
        if ((d && (t = d), o.isEdge() || o.isIE())) f(e, n, i);
        else if (document.hasFocus()) g();
        else
          var h = r(window, "focus", function () {
            h.remove(), g();
          });
      };
    },
  ]);
});
