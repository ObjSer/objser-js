/*!
 * objser.js
 * Copyright (c) 2015 Greg Omelaenko
 * License: https://github.com/ObjSer/objser-js/blob/master/LICENSE
 */

"use strict";

var objser = new (function() {

    var _ref6     = 0x00, // 0x00 – 0x3f
        $ref6     = 0x00,
        _ref8     = 0x40,
        _ref16    = 0x60,
        _ref32    = 0x70,
        _pint6    = 0x80, // 0x80 – 0xbf
        $pint6    = 0x80,
        _nint5    = 0xe0, // 0xe0 – 0xff
        $nint5    = 0xe0,
        _false    = 0xc0,
        _true     = 0xc1,
        _nil      = 0xc2,
        _int8     = 0xc3,
        _int16    = 0xc4,
        _int32    = 0xc5,
        _int64    = 0xc6,
        _uint8    = 0xc7,
        _uint16   = 0xc8,
        _uint32   = 0xc9,
        _uint64   = 0xca,
        _float32  = 0xcb,
        _float64  = 0xcc,
        _fstring  = 0x70, // 0x71 – 0x7f
        $fstring  = 0x71,
        _vstring  = 0xcd,
        _estring  = 0xce,
        _fdata    = 0x60, // 0x61 – 0x6f
        $fdata    = 0x61,
        _vdata8   = 0xd0,
        _vdata16  = 0xd1,
        _vdata32  = 0xd2,
        _edata    = 0xd3,
        _farray   = 0x40, // 0x41 – 0x5f
        $farray   = 0x41,
        _varray   = 0xd4,
        _earray   = 0xd5,
        _map      = 0xd6,
        _emap     = 0xd7,
        _sentinel = 0xcf,
        _reserved = 0xd8,
        $reserved = 0xd8; // 0xda – 0xdf

    function serialise(v, s) {

        var i = s.length;

        var indexed = [], writers = [], nextid = 0;

        function index(v) {
            if (v && v.hasOwnProperty("__objser_id")) return v.__objser_id;
            else {
                var id = nextid++;
                indexed[id] = v;
                var type = typeof v;
                switch(typeof v) {
                    case "number":
                        writers[id] = writer(writeNumber, v);
                        break;
                    case "boolean":
                        writers[id] = writer(writeBoolean, v);
                        break;
                    case "string":
                        writers[id] = writer(writeString, v);
                        break;
                    case "object":
                        // allow coercion of undefined
                        if (v == null) {
                            writers[id] = writeNil;
                            break;
                        }
                        v.__objser_id = id;
                        if (Array.isArray(v)) {
                            var a = [];
                            for (var j = 0; j < v.length; ++j) a[j] = index(v[j]);
                            writers[id] = writer(writeArray, a);
                        }
                        else {
                            var a = [], j = 0;
                            for (var k in v) if (k !== "__objser_id") {
                                a[j++] = index(k);
                                a[j++] = index(v[k]);
                            }
                            writers[id] = writer(writeMap, a);
                        }
                        break;
                    default:
                        writers[id] = function() { print("who knows " + JSON.stringify(v)); };
                }
                return id;
            }
        }

        function write() {
            for (var j = 0; j < arguments.length; ++j) s[i++] = arguments[j];
        }

        function writer(f, obj) {
            return function() { f(obj); };
        }

        function writeInt8(n) {
            write(n);
        }

        function writeInt16(n) {
            write(n & 0xff, n >> 8);
        }

        function writeInt32(n) {
            write(n & 0xff,         (n >> 8) & 0xff,
                  (n >> 16) & 0xff, n >>> 24);
        }

        function writeInt64(n) {
            var h = Math.floor(n / 0x100000000),
                l = n & 0xffffffff;
            write(l & 0xff,         (l >> 8) & 0xff,
                  (l >> 16) & 0xff, (l >> 24) & 0xff,
                  h & 0xff,         (h >> 8) & 0xff,
                  (h >> 16) & 0xff, (h >> 24) & 0xff);
        }            

        function writeNumber(n) {
            if (n % 1 === 0) {
                // integer
                if (-32 <= n && n < 0) write(n + 256); // _nint5
                else if (0 <= n && n <= 63) write(_pint6 | n);
                else {
                    // negative numbers somehow magically work with shifts without special handling
                    var neg = n < 0;
                    if (-0x80 <= n && n <= 0xff) {
                        write(neg ? _int8 : _uint8);
                        writeInt8(n);
                    }
                    else if (-0x8000 <= n && n <= 0xffff) {
                        write(neg ? _int16 : _uint16);
                        writeInt16(n);
                    }
                    else if (-0x80000000 <= n && n <= 0xffffffff) {
                        write(neg ? _int32 : _uint32);
                        writeInt32(n);
                    }
                    else {
                        write(neg ? _int64 : _uint64);
                        writeInt64(n);
                    }
                }
            }
            else {
                // float
            }
        }

        function writeBoolean(v) {
            if (v) write(_true);
            else write(_false);
        }

        function writeNil() {
            write(_nil);
        }

        function writeString(str) {
            if (str.length == 0) write(_estring);
            else {
                write(_vstring);
                var pi = i;
                // https://closure-library.googlecode.com/git-history/docs/local_closure_goog_crypt_crypt.js.source.html
                for (var j = 0; j < str.length; ++j) {
                    var c = str.charCodeAt(j);
                    if (c < 128) {
                        write(c);
                    } else if (c < 2048) {
                        write((c >> 6) | 192,
                              (c & 63) | 128);
                    } else {
                        write((c >> 12) | 224,
                              ((c >> 6) & 63) | 128,
                              (c & 63) | 128);
                    }
                }

                var len = i - pi;
                if (len <= 15) s[pi-1] = _fstring | len;
                else s[i++] = 0;
            }
        }

        function writeArray(a) {
            if (a.length == 0) s[i++] = _earray;
            else {
                var vv = a.length > 31;
                s[i++] = vv ? _varray : _farray | a.length;
                for (var j = 0; j < a.length; ++j) writeRef(a[j]);
                i = s.length;
                if (vv) s[i++] = _sentinel;
            }
        }

        function writeMap(a) {
            if (!a.length) s[i++] = _emap;
            else {
                s[i++] = _map;
                writeArray(a);
            }
        }

        function writeRef(id) {
            var v = nextid - id - 1;
            if (v <= 0x3f) s[i++] = _ref6 | v;
            else if (v <= 0xff) s[i++] = _ref8, writeInt8(v);
            else if (v <= 0xffff) s[i++] = _ref16, writeInt16(v);
            else if (v <= 0xffffffff) s[i++] = _ref32, writeInt32(v);
            else return print("rip");
        }

        index(v);

        for (var j = nextid; j --> 0;) {
            writers[j]();
            if (indexed[j] && indexed[j].hasOwnProperty("__objser_id")) delete indexed[j].__objser_id;
        }

        return s;
    }

    function deserialise(s, i) {
        var objects = [];
        for (var id = 0; i < s.length; ++id) objects[id] = read();
        var root = objects[objects.length-1];
        return resolve(root);

        function ref(i) {
            this.resolve = function() {
                return objects[i];
            };
        }

        function read() {
            var v = s[i++], fv = v;
            // check ranges first
            if (0x00 <= v && v <= 0x3f) fv = $ref6;
            else if (0x80 <= v && v <= 0xbf) fv = $pint6, v &= 0x3f;
            else if (0xe0 <= v && v <= 0xff) fv = $nint5;
            else if (0x71 <= v && v <= 0x7f) fv = $fstring, v &= 0xf;
            else if (0x61 <= v && v <= 0x6f) fv = $fdata, v &= 0xf;
            else if (0x41 <= v && v <= 0x5f) fv = $farray, v &= 0x1f;
            else if (0xd8 <= v && v <= 0xdf) fv = $reserved;
            var signed;
            switch (fv) {
                case $ref6:
                    return new ref(v);
                case _ref8:
                    return new ref(readInt8(false));
                case _ref16:
                    return new ref(readInt16(false));
                case _ref32:
                    return new ref(readInt32(false));

                case $pint6:
                    return v & 0x7f;
                case $nint5:
                    return v - 256;

                case _false:
                    return false;
                case _true:
                    return true;

                case _nil:
                    return null;

                case _int8:
                    return readInt8(true);
                case _uint8:
                    return readInt8(false);
                case _int16:
                    return readInt16(true);
                case _uint16:
                    return readInt16(false);
                case _int32:
                    return readInt32(true);
                case _uint32:
                    return readInt32(false);
                case _int64:
                    return readInt64(true);
                case _uint64:
                    return readInt64(false);

                case _float32:
                case _float64:
                case $fstring:
                    return readString(v);
                case _vstring:
                    var len;
                    for (var j = i; j < s.length; ++j) if (!s[j]) {
                        len = j - i;
                        break;
                    }
                    var str = readString(len);
                    ++i;
                    return str;
                case _estring:
                    return "";
                case $fdata:
                case _vdata8:
                case _vdata16:
                case _vdata32:
                case _edata:
                case $farray:
                    var len = v, a = [];
                    for (var j = 0; j < len; ++j) a[j] = read();
                    return a;
                case _varray:
                    var a = [];
                    for (var j = 0, elem = read(); elem !== undefined; ++j, elem = read()) {
                        a[j] = elem;
                    }
                case _earray:
                    return [];
                case _map:
                    var a = read();
                    // TODO: check that a is an array
                    return { __objser_map_elements: a };
                case _emap:
                    return { __objser_map_elements: [] };
                case _sentinel:
                    return undefined; // different from null
                case $reserved:
            }

            function readInt8(signed) {
                var n = s[i++];
                if (signed && n > 0x7f) n -= 0x100;
                return n;
            }

            function readInt16(signed) {
                var n = s[i++] | (s[i++] << 8);
                if (signed && n > 0x7fff) n -= 0x10000;
                return n;
            }                

            function readInt32(signed) {
                // add the last byte to avoid the js signed 32-bit integer bullshit
                var n = (s[i++] | (s[i++] << 8) | (s[i++] << 16)) + s[i++] * 0x1000000;
                if (signed && n > 0x7fffffff) n -= 0x100000000;
                return n;
            }                

            function readInt64(signed) {
                var l = (s[i++] | (s[i++] << 8) | (s[i++] << 16)) + s[i++] * 0x1000000,
                    h = (s[i++] | (s[i++] << 8) | (s[i++] << 16)) + s[i++] * 0x1000000;
                if (signed && h > 0x7fffffff) h -= 0x100000000;
                var n = l + h * 0x100000000;
                return n;
            }

            function readString(len) {
                // https://closure-library.googlecode.com/git-history/docs/local_closure_goog_crypt_crypt.js.source.html
                var out = "", end = i + len;
                while (i < end) {
                    var c1 = s[i++];
                    if (c1 < 128) {
                        out += String.fromCharCode(c1);
                    } else if (c1 > 191 && c1 < 224) {
                        var c2 = s[i++];
                        out += String.fromCharCode((c1 & 31) << 6 | c2 & 63);
                    } else {
                        var c2 = s[i++];
                        var c3 = s[i++];
                        out += String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
                    }
                }
                return out;
            }
        }

        function resolve(v) {
            // avoid adding to the call stack unnecessarily
            while (v instanceof ref) v = v.resolve();
            var type = typeof v;
            if (Array.isArray(v)) {
                for (var j = 0; j < v.length; ++j) v[j] = resolve(v[j]);
            }
            else if (type === "object") {
                if (v && v.hasOwnProperty("__objser_map_elements")) {
                    var a = v.__objser_map_elements;
                    delete v.__objser_map_elements;
                    for (var j = 0; j < a.length; j += 2) {
                        v[resolve(a[j])] = resolve(a[j+1]);
                    }
                }
            }
            return v;
        }
    }

    this.serialise = function(data) {
        return serialise(data, []);
    };

    this.deserialise = function(bytes) {
        return deserialise(bytes, 0);
    };

})();

