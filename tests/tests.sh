#!/bin/sh
testdir=$(dirname $0)
v8 $testdir/../objser.js $testdir/underscore-min.js $testdir/tests.js

