
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

		function encode(v) {
			var type = typeof v;
			if (type === "string") {
				if (v.length == 0) s[i++] = _estring;
				else {
					s[i] = _vstring;
					stringToUtf8ByteArray(v, s);
					var len = s.length - i - 1;
					if (len <= 15) s[i] = _fstring | len;
					else s[s.length] = 0;
					i = s.length;
				}
			}			
			else if (Array.isArray(v)) {
				if (v.length == 0) s[i++] = _earray;
				else {
					var vv = v.length > 31;
					s[i++] = vv ? _varray : _farray | v.length;
					for (var j = 0; j < v.length; ++j) encode(v[j]);
					i = s.length;
					if (vv) s[i++] = _sentinel;
				}
			}
			else if (type === "object") {
				var a = [], j = 0;
				for (k in v) a[j++] = k, a[j++] = v[k];
				if (!a.length) s[i++] = _emap;
				else {
					s[i++] = _map;
					encode(a);
				}
			}
			else {
				return false;
			}
			return s;
		}

		encode(v);
		return s;
	}

	function deserialise(s, i) {
		var objects = [];
		for (var id = 0; i < s.length; ++id) objects[id] = read();
		return objects[objects.length-1];

		function read() {
			var v = s[i++], fv;
			// check ranges first
			if (0x00 <= v && v <= 0x3f) fv = v, v = $ref6;
			else if (0x80 <= v && v <= 0xbf) fv = v & 0x3f, v = $pint6;
			else if (0xe0 <= v && v <= 0xff) fv = v, v = $nint5;
			else if (0x71 <= v && v <= 0x7f) fv = v & 0xf, v = $fstring;
			else if (0x61 <= v && v <= 0x6f) fv = v & 0xf, v = $fdata;
			else if (0x41 <= v && v <= 0x5f) fv = v & 0x1f, v = $farray;
			else if (0xd8 <= v && v <= 0xdf) v = $reserved;
			switch (v) {
				case $ref6:
				case _ref8:
				case _ref16:
				case _ref32:
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
					var len = fv;
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
					var len = fv, a = [];
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
					var a = read(), m = {};
					for (var j = 0; j < a.length; j += 2) {
						m[a[j]] = a[j+1];
					}
					return m;
				case _emap:
					return {};
				case _sentinel:
					return undefined; // different from null
				case $reserved:
			}
		}
	}

	this.serialise = function(data) {
		return serialise(data, []);
	};

	this.deserialise = function(bytes) {
		return deserialise(bytes, 0);
	};

})();

