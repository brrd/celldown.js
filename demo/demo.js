/*
    celldown.js demo
    ================
*/

// Get and show table + cursor (demonstration purpose only)
function show (table, msg) {
	if (msg) {
			console.log(msg + "\n==============================\n");
	}
	var got = table.get();
	console.log( "Table: \n\n" + got.table);
	if (got.cursor !== null) {
			console.log("\nCursor line: " + got.cursor.line + "\nCursor ch: " + got.cursor.ch);
	}
	console.log("\n\n");
}

var celldown = require("../dist/celldown.js"),
	str = "|I'm a table   |generated   |with celldown.js|\n" +
	"|:--:|--|------------------------------------------------------------:|\n" +
	"|Hello World|  Cur      | Bar |\n" +
	"|Foo|Bar|This is the longest cell!|";
celldown.setConfig({
	autoBeautify: false
});

// 1. Create a new empty table
var table1 = celldown.new(4, 5);
show(table1, "1. Create a new empty table");

// 2. Table from string + beautify
var table2 = celldown.fromText(str).beautify();
show(table2, "2. Table from string + beautify");

// Auto beautify when get() from here
celldown.setConfig({
	autoBeautify: true
});

// 3. Playing with cols align
table2.align(0, "left").align(1, "right").align(2, "center");
show(table2, "3. Playing with cols align");

// 4. Adding a row and a col
table2.addRows(3).addCols(1);
show(table2, "4. Adding a row and a col");

// 5. Cursor tracking
var cursor = {
			line: 2,
			ch: 18
	};
var table3 = celldown.fromText(str, cursor).addRows(2, 3).addCols(0, 1);
show(table3, "5. Cursor tracking. We start a new table with cursor = {line: 2, ch: 21} and we play with rows and columns.");

// 6. Cursor tracking while removing cols and rows
table3.removeCols(1).removeRows(2, 3);
show(table3, "6. Cursor tracking while removing cols and rows");

// 7. Use cursor position when index is not specified
table3.removeRows().align(null, "center");
show(table3, "7. Use cursor position when index is not specified");

// 8. Alias methods
var table4 = celldown.fromText(str, cursor);
table4.addRowsAfterCursor().addColsAfterCursor(3).addRowsBeforeCursor(2);
show(table4, "8. Alias methods");
