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
    "|--|--|-- |\n" +
    "|Hello World|Foo        | Bar |\n" +
    "|Foo|Bar|This is the longest cell!|";

// 1. Create a new empty table
var table1 = celldown.new(4, 5);
show(table1, "1. Create a new empty table");

// 2. Table from string + beautify
var table2 = celldown.fromText(str).beautify();
show(table2, "2. Table from string + beautify");

// 3. Playing with cols align
table2.align(0, "left").align(1, "right").align(2, "center");
show(table2, "3. Playing with cols align");

// 4. Adding a row and a col
table2.addRows(3).addCols(1).beautify();
show(table2, "4. Adding a row and a col");

// 5. Cursor tracking
// Cursor is placed here :
// "|Hello World|Foo        | Bar |\n"
//                  -----L-- -   -
//  0123456789012345678901234567890"

var cursor = {
        line: 2,
        ch: 21
    };
var table3 = celldown.fromText(str, cursor).addRows(2, 3).addCols(0, 1).beautify();

show(table3, "5. Cursor tracking. We start a new table with cursor = {line: 2, ch: 21} and we play with rows and columns.");
