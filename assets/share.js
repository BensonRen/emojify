/*
 * EmojiShare — URL-fragment payload codec for emojify.me
 *
 * Encodes a JS object into a compact URL-safe string that travels in
 * location.hash (#s=...) and therefore NEVER hits the server.
 *
 * Wire format: one ASCII prefix char + base64url (no padding)
 *   'd' → deflate-raw-compressed UTF-8 JSON  (CompressionStream pipeline)
 *   'p' → plain UTF-8 JSON                   (fallback: no CompressionStream,
 *                                             e.g. Safari < 16.4)
 * decode() understands both prefixes regardless of local capabilities,
 * returns null on any malformed input, and never throws.
 *
 * Classic script (no modules). Exposes window.EmojiShare = { encode, decode }.
 */
(function () {
  'use strict';

  var CHUNK = 0x8000; // fromCharCode chunk size — keeps apply() under arg limits

  // Uint8Array → base64url (no padding). btoa wants a "binary string",
  // built chunk by chunk so large payloads don't blow the argument limit.
  function bytesToB64url(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // base64url → Uint8Array. Restores padding and the standard +/ alphabet.
  function b64urlToBytes(s) {
    var b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  // Push bytes through a (De)CompressionStream and collect the full output.
  function pump(bytes, stream) {
    var writer = stream.writable.getWriter();
    writer.write(bytes).catch(function () {});  // surfaces on the readable side
    writer.close().catch(function () {});
    return new Response(stream.readable).arrayBuffer().then(function (buf) {
      return new Uint8Array(buf);
    });
  }

  // obj → 'd…' (deflate) or 'p…' (plain) compact string.
  async function encode(obj) {
    var utf8 = new TextEncoder().encode(JSON.stringify(obj));
    if (typeof CompressionStream === 'undefined') {
      return 'p' + bytesToB64url(utf8);
    }
    var deflated = await pump(utf8, new CompressionStream('deflate-raw'));
    return 'd' + bytesToB64url(deflated);
  }

  // str → obj, or null on anything unexpected. Never throws.
  async function decode(str) {
    try {
      if (typeof str !== 'string' || str.length < 2) return null;
      var bytes = b64urlToBytes(str.slice(1));
      var prefix = str.charAt(0);
      if (prefix === 'd') {
        if (typeof DecompressionStream === 'undefined') return null;
        bytes = await pump(bytes, new DecompressionStream('deflate-raw'));
      } else if (prefix !== 'p') {
        return null; // unknown format marker
      }
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      return null;
    }
  }

  var root = typeof window !== 'undefined' ? window : globalThis;
  root.EmojiShare = { encode: encode, decode: decode };
})();
