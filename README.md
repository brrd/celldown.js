# celldown.js

**celldown.js** is a small javascript library for manipulating markdown tables.

It provides several very basic features for handling markdown (GFM) tables in a web-based application.

## Features

* Creating markdown tables from text or from coordinates
* Adding and removing cols and rows
* Setting columns alignment
* Improving format (beautify)
* Tracking the cursor position while doing those operations

## Install

Use it as a Node.js module :

```
$ npm install celldown
```

then :

```javascript
var celldown = require("celldown");
```

...Or directly in the browser :

```
$ bower install celldown
```

and :

```html
<script src="path_to_script/celldown.min.js">
```

## Usage

### Initialization

First, create a new table from a string :

```javascript
var myTable = celldown.fromText(str);
```

Or create an empty table :

```javascript
// 3 cols and 5 rows
var myTable = celldown.empty(3, 5);
```

Then do stuff:

```javascript
var editedTable = myTable.addRow(3).beautify().get().text;
console.log(editedTable);
```

### Cursor tracking

If you need to track a cursor while the table is edited, add it as a {line, ch} object in the last parameter :

```javascript
var myCursor = {
    line: 2,
    ch: 10
};
var myTable = celldown.fromText(str, cursor);
```

### Get table and cursor position

`table.get()` method returns a `{table, cursor}` object.

* `table` is a string containing the modified table.
* `cursor` is a `{line, ch}` object that indicates cursor coordinates within `table`.

**Example:**

```javascript
var t = table.get();
console.log("Modified table is:\n" + t.table + "\n...and cursor position is line: " + t.cursor.line + ", ch: " +  t.cursor.ch);
```

### Configuration

Configuration is stored in `celldown.config` and can be modified with `celldown.setConfig()`.

The following are available:

* `rows` is the number of rows added to an empty table when not specified  (default is `3`)
* `cols` is the number of columns added to an empty table when not specified  (default is `2`)
* If set to `true`, `extraPipes` wraps each line of the table into optional pipes.
* If set to `true`, `extraSpaces` adds extra spaces around each cell's of the table (default is `true`)
* If `autoBeautify` is set to `true`, table is beautified on `table.get()` (default is `true`)

Use `celldown.setConfig(newConfigObj)` to change defaults:

```javascript
celldown.setConfig({
    rows: 2,
    autoBeautify: false
});
```

### Actions on table

#### Add rows and columns

* `.addRows(index, numberOfAdditions)`
* `.addCols(index, numberOfAdditions)`
* `addRowsBeforeCursor(numberOfAdditions)`
* `addRowsAfterCursor(numberOfAdditions)`
* `addColsBeforeCursor(numberOfAdditions)`
* `addColsAfterCursor(numberOfAdditions)`

When not defined `index` is set to cursor position if cursor exists (otherwise it is set to 0).  
When not defined `numberOfAdditions` is set to 1.

```javascript
// Adding a row before the 4th row
table.addRows(3);

// Adding two cols at the first position
table.addCols(0, 2);
```

#### Remove rows and columns

* `.removeRows(index, numberOfDeletions)`
* `.removeCols(index, numberOfDeletions)`

When not defined `index` is set to cursor position if cursor exists (otherwise function is not executed).  
When not defined `numberOfAdditions` is set to 1.

```javascript
// Removing the third col
table.removeCols(2);

// Removing 4 rows from the 3th
table.removeRows(2, 4);
```

#### Align columns

* `.align(colIndex, side)`

When not defined `colIndex` is set to cursor position if cursor exists (otherwise function is not executed).  
When `side` is not defined, column alignment is cleared.

```javascript
// Align columns 0, 1 and 2
table.align(0, "left");
table.align(1, "center");
table.align(3, "right");

// Clear align of col 0
table.align(0);
```

#### Get alignment of columns
* `.align(colIndex)`

Returns alignment of colIndex-th column, one of `"left"`,`"center"`, `"right"` or `undefined`, when alignment is not defined.

#### Beautify table

* `.beautify()`

Beautify the table. It transforms this:

```
|I'm a table   |generated   |with celldown.js|
|--|--|-----------------------------------------------------------: |
|Hello World|  Foo      | Bar |
|Foo|Bar|This is the longest cell!|
```

into this:

```
| I'm a table | generated | with celldown.js          |
| ----------- | :-------: | ------------------------: |
| Hello World |  FooFoo   |                       Bar |
| Foo         |    Bar    | This is the longest cell! |
```

#### Do things on each row/each cell

* `eachRow(callback)`, with `callback = function (array, row, rowIndex)`
* `eachCell(callback)`, with `callback = function (array, cell, rowIndex, colIndex)`

#### Get table size

* `getSize()`

Returns a `{cols, rows}` object that contains the length of cols and rows.


### Other functions

`celldown.isValidTable(str)` returns true if `str` is recognized as a valid GFM table. Please view celldown.js source for more information.

## Development

Contributions are welcome.

### Building

1. Fork repo
2. Init project: `$ npm init`
3. Modify source in `src/celldown.coffee`
4. Build project: `$ grunt`
5. Pull request

### Todo list

Some ideas:

* Support `null` as a coordinate for representing the last item of a collection (line, row, cell...)
* Add methods to perform tranlation between `{line, ch}` and `{col, row, ch}` coordinates. Actually it already exists in `txt2arr()` and `cursor.get()` methods for handling cursor coord conversion, so we could possibly get inspired.
* Add a `.addContent(arr, coord)` method for filling with `content` a set of cells defined in `coord`.
* ...?

## Licence

The MIT License (MIT)

Copyright (c) 2015 Thomas Brouard

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

