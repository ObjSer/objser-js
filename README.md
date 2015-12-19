# ObjSer: object graph serialisation for JavaScript

[![GitHub license](https://img.shields.io/github/license/ObjSer/objser-js.svg)](https://github.com/ObjSer/objser-js/blob/master/LICENSE)
[![GitHub release](https://img.shields.io/github/release/ObjSer/objser-js.svg)](https://github.com/ObjSer/objser-js/releases)

## Restrictions

The following restrictions are imposed on objects that can be serialised:

- Properties beginning with `__objser_` should not be used, to avoid conflict with the implementation
- Objects must not contain functions
- Nil, floating point numbers, and data are not implemented.
- References greater than 8 bits are not implemented.

