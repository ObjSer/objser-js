
var data = {
	"aoeu 1 2 3 4 5 6 7 8 9 10 11 12": "aøeu",
	"b": ["c", ""]
};
data.data = data;

// print(JSON.stringify(data));

var enc = objser.serialise(data);
// print(enc);
var se = [];
for (var i = 0; i < enc.length; ++i) se[i] = enc[i].toString(16);
print(se);
var dec = objser.deserialise(enc);
// print(JSON.stringify(dec));
// print(data == dec);
print("these should all be true:");
print(dec["aoeu 1 2 3 4 5 6 7 8 9 10 11 12"] === "aøeu");
print(dec.b.length === 2 && dec.b[0] === "c" && dec.b[1] === "");
print(dec.data === dec);

