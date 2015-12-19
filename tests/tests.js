
var data = {
    "aoeu 1 2 3 4 5 6 7 8 9 10 11 12": "aøeu",
    "mixed": ["c", true, 6, null, false],
    "integers": [4, 0, 127, 128, 129, 255, 256, 32767, 32768, 65535, 65536, 2111222333, 111222333444555, -128, -129, -256, -589, -1112223334, -555444333222111]
};
// data.data = data;

var prettyspace = 0;

print(JSON.stringify(data, undefined, prettyspace));

var enc = objser.serialise(data);
// print(enc);
var se = [];
for (var i = 0; i < enc.length; ++i) se[i] = enc[i].toString(16);
// print(se);
var dec = objser.deserialise(enc);
print(JSON.stringify(dec, undefined, prettyspace));
print(_.isEqual(data, dec) ? "Test passed." : "Test failed. Compare output to find the difference.");

