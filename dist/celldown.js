(function() {
  var celldown;

  celldown = (function() {
    var Cursor, Table, _celldown, arr2text, config, countPipes, getEmptyArr, isValidTable, text2arr, translateCoord;
    config = {
      header: true,
      rows: 3,
      cols: 2,
      extraPipes: true,
      extraSpaces: true
    };
    countPipes = function(str) {
      var match;
      match = str.match(/\|/g);
      if (match == null) {
        return 0;
      } else {
        return match.length;
      }
    };

    /* Check if a string is recognized as a valid table */

    /* To know if text is a markdown table we count the "|" character: it is supposed to be the same for each line. We also check for a line header. */
    isValidTable = function(text) {
      var hasHeader, j, len, line, lines, numberOfPipes, prevNumberOfPipes;
      lines = text.split("\n");
      hasHeader = /^[\s-:|]+$/.test(lines[1]);
      if (lines.length < 2 || !hasHeader) {
        return false;
      }
      for (j = 0, len = lines.length; j < len; j++) {
        line = lines[j];
        numberOfPipes = countPipes(line);
        if (numberOfPipes === 0 || ((typeof prevNumberOfPipes !== "undefined" && prevNumberOfPipes !== null) && numberOfPipes !== prevNumberOfPipes)) {
          return false;
        }
        prevNumberOfPipes = numberOfPipes;
      }
      return true;
    };
    text2arr = function(text, cursor) {

      /* Attention : fonction à n'utiliser que sur la ligne qui contient le curseur */
      var arr, hyphensIndex, i, j, lineContent, lines, ref, removeExtraPipes, row, tableHasExtraPipes, trackCursorWhenReplace, trimCells;
      trackCursorWhenReplace = function(lineContent, start, length, replacement, cursor) {
        var end;
        if (length === 0) {
          return;
        }
        end = start + length;
        if (end <= cursor.ch) {
          return cursor.ch -= length - replacement.length;
        } else if (start < cursor.ch && end > cursor.ch) {
          return cursor.ch -= cursor.ch - start - replacement.length;
        }
      };
      removeExtraPipes = function(lineContent, lineIndex, cursor) {
        var regex, result;
        regex = /^\s*\||\|\s*$/g;

        /* Track cursor if needed */
        if ((cursor != null ? cursor.line : void 0) === lineIndex) {
          while ((result = regex.exec(lineContent)) != null) {
            trackCursorWhenReplace(lineContent, result.index, result[0].length, "", cursor);
          }
        }
        return lineContent.replace(regex, "");
      };
      trimCells = function(lineContent, lineIndex, cursor) {
        var regex, result, spacesAfter, spacesBefore;
        regex = /(\s*)\|(\s*)/g;

        /* Track cursor if needed */
        if ((cursor != null ? cursor.line : void 0) === lineIndex) {
          while ((result = regex.exec(lineContent)) != null) {
            spacesBefore = result[1];
            spacesAfter = result[2];
            trackCursorWhenReplace(lineContent, result.index, spacesBefore.length, "", cursor);
            trackCursorWhenReplace(lineContent, result.index + spacesBefore.length + 1, spacesAfter.length, "", cursor);
          }
        }
        return lineContent.replace(regex, "|");
      };
      lines = text.split("\n");
      hyphensIndex = 1;
      tableHasExtraPipes = /^\s?\|.*\|\s?$/.test(lines[hyphensIndex]);
      arr = [];
      for (i = j = 0, ref = lines.length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
        if (tableHasExtraPipes) {
          lineContent = removeExtraPipes(lines[i], i, cursor);
        }
        lineContent = trimCells(lineContent, i, cursor);
        row = lineContent.split("|");
        arr.push(row);
      }
      return {
        arr: arr,
        cursor: cursor
      };
    };
    arr2text = function(arr, cursor, extraPipes, extraSpaces) {
      var cellSeparator, cursorText, lineStart, lineStop, row, text;
      if (extraPipes == null) {
        extraPipes = config.extraPipes;
      }
      if (extraSpaces == null) {
        extraSpaces = config.extraSpaces;
      }
      cursorText = cursor != null ? cursor.get(extraPipes, extraSpaces) : void 0;
      if (cursorText == null) {
        cursorText = null;
      }
      cellSeparator = extraSpaces ? " | " : "|";
      if (extraPipes && extraSpaces) {
        lineStart = "| ";
        lineStop = " |";
      } else if (extraPipes) {
        lineStart = lineStop = "|";
      } else {
        lineStart = lineStop = "";
      }
      text = ((function() {
        var j, len, results;
        results = [];
        for (j = 0, len = arr.length; j < len; j++) {
          row = arr[j];
          results.push(lineStart + row.join(cellSeparator) + lineStop);
        }
        return results;
      })()).join("\n");
      return {
        table: text,
        cursor: cursorText
      };
    };
    getEmptyArr = function(colsNumber, rowsNumber) {
      var emptyRow, hyphensRow;
      emptyRow = (function() {
        var j, ref, results;
        results = [];
        for (j = 1, ref = colsNumber; 1 <= ref ? j <= ref : j >= ref; 1 <= ref ? j++ : j--) {
          results.push("   ");
        }
        return results;
      })();
      hyphensRow = (function() {
        var j, ref, results;
        results = [];
        for (j = 1, ref = colsNumber; 1 <= ref ? j <= ref : j >= ref; 1 <= ref ? j++ : j--) {
          results.push("---");
        }
        return results;
      })();
      return [emptyRow, hyphensRow].concat((function() {
        var j, ref, results;
        results = [];
        for (j = 1, ref = rowsNumber; 1 <= ref ? j <= ref : j >= ref; 1 <= ref ? j++ : j--) {
          results.push(emptyRow);
        }
        return results;
      })());
    };
    Table = (function() {
      function Table(options) {
        var cursor, ref, ref1;
        cursor = (ref = options.cursor) != null ? ref : null;
        if (options.text != null) {

          /* From text */
          if (!isValidTable(options.text)) {
            console.error("String is not recognized as a valid markdown table.");
          }
          ref1 = text2arr(options.text, cursor), this.arr = ref1.arr, cursor = ref1.cursor;
        } else if ((options.cols != null) && (options.rows != null)) {
          this.arr = getEmptyArr(options.cols, options.rows);
        }
        this.cursor = cursor != null ? new Cursor(this, cursor) : null;
      }

      Table.prototype.eachRow = function(callback) {
        var j, ref, rowIndex;
        for (rowIndex = j = 0, ref = this.arr.length - 1; 0 <= ref ? j <= ref : j >= ref; rowIndex = 0 <= ref ? ++j : --j) {
          callback(this.arr, this.arr[rowIndex], rowIndex);
        }
        return this;
      };

      Table.prototype.eachCell = function(callback) {
        this.eachRow(function(arr, row, rowIndex) {
          var colIndex, j, ref, results;
          results = [];
          for (colIndex = j = 0, ref = row.length - 1; 0 <= ref ? j <= ref : j >= ref; colIndex = 0 <= ref ? ++j : --j) {
            results.push(callback(this.arr, row[colIndex], rowIndex, colIndex));
          }
          return results;
        });
        return this;
      };

      Table.prototype.addRows = function(index, number) {
        var ref, row, size;
        if (number == null) {
          number = 1;
        } else if (number <= 0) {
          return this;
        }
        size = this.getSize();
        if ((index == null) || index > size.rows) {
          index = size.rows;
        }
        if (index <= 1) {
          index = 2;
        }
        row = (function() {
          var j, ref, results;
          results = [];
          for (j = 1, ref = size.cols; 1 <= ref ? j <= ref : j >= ref; 1 <= ref ? j++ : j--) {
            results.push("   ");
          }
          return results;
        })();
        this.arr.splice(index, 0, row);
        if ((ref = this.cursor) != null) {
          ref.moveRow(index);
        }
        if (number > 1) {
          this.addRows(index, number - 1);
        }
        return this;
      };

      Table.prototype.addCols = function(index, number) {
        var ref;
        if (number == null) {
          number = 1;
        } else if (number <= 0) {
          return this;
        }
        this.eachRow(function(arr, row, rowIndex) {
          var cellContent, indexInRow;
          indexInRow = (index == null) || index > row.length ? row.length : index;
          cellContent = rowIndex === 1 ? "---" : "   ";
          return row.splice(indexInRow, 0, cellContent);
        });
        if ((ref = this.cursor) != null) {
          ref.moveCol(index);
        }
        if (number > 1) {
          this.addCols(index, number - 1);
        }
        return this;
      };

      Table.prototype.removeRows = function(index, number) {
        var ref, size;
        if (number == null) {
          number = 1;
        } else if (number <= 0) {
          return this;
        }
        size = this.getSize();
        if (index <= 1 || index > size.rows - 1) {
          return this;
        }
        this.arr.splice(index, number);
        if ((ref = this.cursor) != null) {
          ref.moveRow(index(-number));
        }
        return this;
      };

      Table.prototype.removeCols = function(index, number) {
        var j, len, ref, ref1, row, size;
        if (number == null) {
          number = 1;
        } else if (number <= 0) {
          return this;
        }
        size = this.getSize();
        if (index < 0 || index > size.cols - 1) {
          return this;
        }
        ref = this.arr;
        for (j = 0, len = ref.length; j < len; j++) {
          row = ref[j];
          row.splice(index, number);
        }
        if ((ref1 = this.cursor) != null) {
          ref1.moveCol(index(-number));
        }
        return this;
      };

      Table.prototype.align = function(colIndex, side) {
        var cell, content, j, ref;
        if (colIndex < 0 || colIndex > this.arr.length - 1) {
          return this;
        }
        cell = this.arr[1][colIndex];
        content = "";
        for (j = 1, ref = cell.length - 2; 1 <= ref ? j <= ref : j >= ref; 1 <= ref ? j++ : j--) {
          content += "-";
        }
        switch (side) {
          case "left":
            content = ":" + content + "-";
            break;
          case "right":
            content = "-" + content + ":";
            break;
          case "center":
            content = ":" + content + ":";
        }
        this.arr[1][colIndex] = content;
        return this;
      };


      /*
      FIXME: si on a une header line super trop longue alors elle est conservée. Il faut la recalculer à chaque fois
       */

      Table.prototype.beautify = function() {
        var getColMaxSize, resizeCells;
        getColMaxSize = (function(_this) {
          return function() {
            var colMaxSize;
            colMaxSize = [];
            _this.eachCell(function(arr, cell, rowIndex, colIndex) {
              var cellLength;
              cellLength = cell.trim().length;
              if (!colMaxSize[colIndex] || colMaxSize[colIndex] < cellLength) {
                return colMaxSize[colIndex] = cellLength;
              }
            });
            return colMaxSize;
          };
        })(this);
        resizeCells = (function(_this) {
          return function(colMaxSize) {
            return _this.eachCell(function(arr, cell, rowIndex, colIndex) {
              var fillingChar, isHyphens, lastChar, missingChars;
              cell = cell.trim();
              missingChars = colMaxSize[colIndex] - cell.length;
              isHyphens = /^:?-+:?$/.test(cell);
              lastChar = cell.substr(-1, cell.length - 1);
              fillingChar = isHyphens ? "-" : " ";
              if (isHyphens) {
                cell.replace(/\s/g, "-");
              }
              while (missingChars > 0) {
                if (isHyphens && lastChar === ":" && colMaxSize[colIndex] > 1) {
                  cell = cell.substr(0, cell.length - 1) + fillingChar + lastChar;
                } else {
                  cell += fillingChar;
                }
                missingChars--;
              }
              return _this.arr[rowIndex][colIndex] = cell;
            });
          };
        })(this);
        resizeCells(getColMaxSize());
        return this;
      };

      Table.prototype.get = function(extraPipes, extraSpaces) {
        return arr2text(this.arr, this.cursor);
      };

      Table.prototype.getSize = function() {
        return {
          cols: this.arr[0].length,
          rows: this.arr.length
        };
      };

      return Table;

    })();
    translateCoord = function(coord, text) {
      var beforeCursor, chIndex, colIndex, remainingChars, row, rowIndex, rows;
      rows = text.split("\n");
      rowIndex = (coord.line != null) && coord.line < rows.length ? coord.line : null;
      row = rowIndex != null ? rows[rowIndex] : rows[rows.length - 1];
      beforeCursor = coord.ch != null ? row.substr(0, coord.ch) : row;
      colIndex = countPipes(beforeCursor);
      remainingChars = beforeCursor.match(/\|[^|]*$/);
      chIndex = remainingChars != null ? remainingChars[0].length : 0;
      return {
        row: rowIndex,
        col: colIndex,
        ch: chIndex
      };
    };

    /*
    coord can be either :
    * a {line, ch} object (position in text) or
    * a {row, col, ch} object (position in table)
    Only the position is used to keep track of the cursor.
    NOTE: null means last element. TODO: do tests
     */
    Cursor = (function() {
      function Cursor(table, coord) {
        var row, tableText;
        this.table = table;
        tableText = ((function() {
          var j, len, ref, results;
          ref = table.arr;
          results = [];
          for (j = 0, len = ref.length; j < len; j++) {
            row = ref[j];
            results.push(row.join("|"));
          }
          return results;
        })()).join("\n");
        if (typeof (coord.line != null)) {
          coord = translateCoord(coord, tableText);
        }
        this.row = coord.row, this.col = coord.col, this.ch = coord.ch;
      }

      Cursor.prototype.moveCol = function(index, move) {
        if (move == null) {
          move = 1;
        }
        if (index <= this.col) {
          this.col += move;
        }
        return this;
      };

      Cursor.prototype.moveRow = function(index, move) {
        if (move == null) {
          move = 1;
        }
        if (index <= this.row) {
          this.row += move;
        }
        return this;
      };

      Cursor.prototype.get = function(extraPipes, extraSpaces) {
        var arr, cellIndex, chTxt, j, ref, ref1, row, separatorLength;
        arr = this.table.arr;
        row = (ref = arr[this.row]) != null ? ref : arr[arr.length - 1];
        chTxt = this.ch;
        for (cellIndex = j = 0, ref1 = this.col - 1; 0 <= ref1 ? j <= ref1 : j >= ref1; cellIndex = 0 <= ref1 ? ++j : --j) {
          chTxt += row[cellIndex].length;
        }
        if (extraPipes) {
          chTxt += 1;
        }
        separatorLength = extraSpaces ? 3 : 1;
        chTxt += this.col * separatorLength;
        return {
          line: this.row,
          ch: chTxt
        };
      };

      return Cursor;

    })();
    _celldown = {
      "new": function(cols, rows, cursor) {
        if (cols == null) {
          cols = config.cols;
        }
        if (rows == null) {
          rows = config.rows;
        }
        return new Table({
          cols: cols,
          rows: rows,
          cursor: cursor
        });
      },
      fromText: function(text, cursor) {
        return new Table({
          text: text,
          cursor: cursor
        });
      },
      isValidTable: function(text) {
        return isValidTable(text);
      },
      isInstanceOfTable: function(obj) {
        return obj instanceof Table;
      },
      isInstanceOfCursor: function(obj) {
        return obj instanceof Cursor;
      }
    };
    return _celldown;
  })();

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = celldown;
  } else if (typeof define === 'function' && define.amd) {
    define([], function() {
      return celldown;
    });
  } else {
    window.celldown = celldown;
  }

}).call(this);
