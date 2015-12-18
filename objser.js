
var objser = new (function() {

	// https://closure-library.googlecode.com/git-history/docs/local_closure_goog_crypt_crypt.js.source.html
	function stringToUtf8ByteArray(str, out) {
		var p;
		if (out) p = out.length;
		else out = [], p = 0;
		for (var i = 0; i < str.length; i++) {
			var c = str.charCodeAt(i);
			if (c < 128) {
				out[p++] = c;
			} else if (c < 2048) {
				out[p++] = (c >> 6) | 192;
				out[p++] = (c & 63) | 128;
			} else {
				out[p++] = (c >> 12) | 224;
				out[p++] = ((c >> 6) & 63) | 128;
				out[p++] = (c & 63) | 128;
			}
		}
		return out;
	};
	function utf8ByteArrayToString(bytes, pos, count) {
		var out = "", end = bytes.length;
		if (!pos) pos = 0;
		if (count) end = pos + count;
		while (pos < end) {
			var c1 = bytes[pos++];
			if (c1 < 128) {
				out += String.fromCharCode(c1);
			} else if (c1 > 191 && c1 < 224) {
				var c2 = bytes[pos++];
				out += String.fromCharCode((c1 & 31) << 6 | c2 & 63);
			} else {
				var c2 = bytes[pos++];
				var c3 = bytes[pos++];
				out += String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
			}
		}
		return out;
	};

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
			if (v.hasOwnProperty("__objser_id")) return v.__objser_id;
			else {
				var id = v.__objser_id = nextid++;
				indexed[id] = v;
				var type = typeof v;
				if (type === "string") {
					writers[id] = writer(writeString, v);
				}
				else if (Array.isArray(v)) {
					var a = [];
					for (var j = 0; j < v.length; ++j) a[j] = index(v[j]);
					writers[id] = writer(writeArray, a);
				}
				else if (type === "object") {
					var a = [], j = 0;
					for (k in v) if (k !== "__objser_id") {
						a[j++] = index(k);
						a[j++] = index(v[k]);
					}
					writers[id] = writer(writeMap, a);
				}
				else {
					writers[id] = function() { print("who knows " + JSON.stringify(v)); };
				}
				return id;
			}
		}

		function writer(f, obj) {
			return function() { f(obj); };
		}

		function writeString(str) {
			if (str.length == 0) s[i++] = _estring;
			else {
				s[i] = _vstring;
				stringToUtf8ByteArray(str, s);
				var len = s.length - i - 1;
				if (len <= 15) s[i] = _fstring | len;
				else s[s.length] = 0;
				i = s.length;
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
			else if (v <= 0xff) s[i++] = _ref8, s[i++] = v;
			else if (v <= 0xffff) s[i++] = _ref16;
			else if (v <= 0xffffffff) s[i++] = _ref32;
			else return print("rip");
		}

		index(v);

		for (var j = nextid; j --> 0;) {
			writers[j]();
			delete indexed[j].__objser_id;
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
			switch (fv) {
				case $ref6:
					return new ref(v);
				case _ref8:
				case _ref16:
				case _ref32:
					return "referenced";
				case $pint6:
				case $nint5:
				case _false:
				case _true:
				case _nil:
					return null;
				case _int8:
				case _int16:
				case _int32:
				case _int64:
				case _uint8:
				case _uint16:
				case _uint32:
				case _uint64:
				case _float32:
				case _float64:
				case $fstring:
					var len = v;
					var str = utf8ByteArrayToString(s, i, len);
					i += len;
					return str;
				case _vstring:
					var len;
					for (var j = i; j < s.length; ++j) if (!s[j]) {
						len = j - i;
						break;
					}
					var str = utf8ByteArrayToString(s, i, len);
					i += len + 1;
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
		}

		function resolve(v) {
			// avoid adding to the call stack unnecessarily
			while (v instanceof ref) v = v.resolve();
			var type = typeof v;
			if (Array.isArray(v)) {
				for (var j = 0; j < v.length; ++j) v[j] = resolve(v[j]);
			}
			else if (type === "object") {
				if (v.hasOwnProperty("__objser_map_elements")) {
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

