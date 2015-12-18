
var data = {
	"aoeu 1 2 3 4 5 6 7 8 9 10 11 12": "aøeu",
	"b": ["c", ""]
};

print(JSON.stringify(data));

var enc = objser.serialise(data);
print(enc);
var se = [];
for (var i = 0; i < enc.length; ++i) se[i] = enc[i].toString(16);
print(se);
print(JSON.stringify(objser.deserialise(enc)));

