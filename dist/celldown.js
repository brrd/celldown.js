
/*
    celldown.js - A small javascript library for manipulating markdown tables
    https://github.com/brrd/celldown
    MIT License - 2015 Thomas Brouard
 */

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
      var arr, getCursorMove, hyphensIndex, i, j, len, line, lineContent, lines, removeExtraPipes, row, tableHasExtraPipes, trimCells;
      getCursorMove = function(lineContent, start, length, cursor) {
        var end;
        if (length === 0) {
          return 0;
        }
        end = start + length;
        if (end <= cursor.ch) {
          return -length;
        } else if (start < cursor.ch && end > cursor.ch) {
          return -(cursor.ch - start);
        }
        return 0;
      };
      removeExtraPipes = function(lineContent, lineIndex, cursor) {
        var cursorMove, regex, result;
        regex = /^\s*\||\|\s*$/g;
        if ((cursor != null ? cursor.line : void 0) === lineIndex) {
          cursorMove = 0;
          while ((result = regex.exec(lineContent)) != null) {
            cursorMove += getCursorMove(lineContent, result.index, result[0].length, cursor);
          }
          cursor.ch += cursorMove;
        }
        return lineContent.replace(regex, "");
      };
      trimCells = function(lineContent, lineIndex, cursor) {
        var cursorMove, regex, result, spacesAfter, spacesBefore;
        regex = /(\s*)\|(\s*)/g;
        if ((cursor != null ? cursor.line : void 0) === lineIndex) {
          cursorMove = 0;
          while ((result = regex.exec(lineContent)) != null) {
            spacesBefore = result[1];
            cursorMove += getCursorMove(lineContent, result.index, spacesBefore.length, cursor);
            spacesAfter = result[2];
            cursorMove += getCursorMove(lineContent, result.index + spacesBefore.length + 1, spacesAfter.length, cursor);
          }
          cursor.ch += cursorMove;
        }
        return lineContent.replace(regex, "|");
      };
      lines = text.split("\n");
      hyphensIndex = 1;
      tableHasExtraPipes = /^\s?\|.*\|\s?$/.test(lines[hyphensIndex]);
      arr = [];
      for (i = j = 0, len = lines.length; j < len; i = ++j) {
        line = lines[i];
        if (tableHasExtraPipes) {
          lineContent = removeExtraPipes(line, i, cursor);
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
        var i, j, len, ref, row;
        ref = this.arr;
        for (i = j = 0, len = ref.length; j < len; i = ++j) {
          row = ref[i];
          callback(this.arr, row, i);
        }
        return this;
      };

      Table.prototype.eachCell = function(callback) {
        this.eachRow(function(arr, row, rowIndex) {
          var cell, i, j, len, results;
          results = [];
          for (i = j = 0, len = row.length; j < len; i = ++j) {
            cell = row[i];
            results.push(callback(this.arr, cell, rowIndex, i));
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
        if (number > size.rows - index) {
          number = size.rows - index;
        }
        this.arr.splice(index, number);
        if (this.cursor != null) {
          if ((index <= (ref = this.cursor.row) && ref <= index + number)) {
            this.cursor.ch = 0;
          }
          this.cursor.moveRow(index, -number);
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
        if (number > size.cols - index) {
          number = size.cols - index;
        }
        ref = this.arr;
        for (j = 0, len = ref.length; j < len; j++) {
          row = ref[j];
          row.splice(index, number);
        }
        if (this.cursor != null) {
          if ((index <= (ref1 = this.cursor.col) && ref1 <= index + number)) {
            this.cursor.ch = 0;
          }
          this.cursor.moveCol(index, -number);
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
            break;
          default:
            content = "-" + content + "-";
        }
        this.arr[1][colIndex] = content;
        return this;
      };

      Table.prototype.beautify = function() {
        var getColMaxSize, resizeCells;
        getColMaxSize = (function(_this) {
          return function() {
            var colMaxSize, i, j, len, minSize, size;
            colMaxSize = [];
            minSize = 3;
            _this.eachCell(function(arr, cell, rowIndex, colIndex) {
              var cellLength;
              if (rowIndex === 1) {
                return;
              }
              cellLength = cell.trim().length;
              if (!colMaxSize[colIndex] || colMaxSize[colIndex] < cellLength) {
                return colMaxSize[colIndex] = cellLength;
              }
            });
            for (i = j = 0, len = colMaxSize.length; j < len; i = ++j) {
              size = colMaxSize[i];
              if (size < minSize) {
                colMaxSize[i] = minSize;
              }
            }
            return colMaxSize;
          };
        })(this);
        resizeCells = (function(_this) {
          return function(colMaxSize) {
            return _this.eachCell(function(arr, cell, rowIndex, colIndex) {
              var beforeCursor, firstChar, isHyphens, lastChar, match, missingChars, moveLeft, size;
              if ((_this.cursor != null) && _this.cursor.row === rowIndex && _this.cursor.col === colIndex) {
                beforeCursor = _this.cursor.ch != null ? cell.substr(0, _this.cursor.ch) : cell;
                match = beforeCursor.match(/^\s?/);
                if (match != null) {
                  moveLeft = match[0].length;
                  _this.cursor.ch = moveLeft > _this.cursor.ch ? 0 : _this.cursor.ch - moveLeft;
                }
              }
              cell = cell.trim();
              size = colMaxSize[colIndex];
              isHyphens = rowIndex === 1;
              if (isHyphens) {
                firstChar = cell.substr(0, 1 != null ? 1 : "-");
                lastChar = cell.substr(-1, 1 != null ? 1 : "-");
                cell = firstChar + ((function() {
                  var j, ref, results;
                  results = [];
                  for (j = 1, ref = size - 2; 1 <= ref ? j <= ref : j >= ref; 1 <= ref ? j++ : j--) {
                    results.push("-");
                  }
                  return results;
                })()).join("") + lastChar;
              } else {
                missingChars = size - cell.length;
                if (missingChars > 0) {
                  cell += ((function() {
                    var j, ref, results;
                    results = [];
                    for (j = 1, ref = missingChars; 1 <= ref ? j <= ref : j >= ref; 1 <= ref ? j++ : j--) {
                      results.push(" ");
                    }
                    return results;
                  })()).join("");
                }
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
        var lastColIndex;
        if (move == null) {
          move = 1;
        }
        if (index <= this.col) {
          lastColIndex = this.table.arr[this.row].length - 1;
          this.col = (function() {
            switch (false) {
              case !(index + move > lastColIndex):
                return lastColIndex;
              case !(index + move < 0):
                return 0;
              default:
                return this.col + move;
            }
          }).call(this);
        }
        return this;
      };

      Cursor.prototype.moveRow = function(index, move) {
        var lastRowIndex;
        if (move == null) {
          move = 1;
        }
        if (index <= this.row) {
          lastRowIndex = this.table.arr.length - 1;
          this.row = (function() {
            switch (false) {
              case !(index + move > lastRowIndex):
                return lastRowIndex;
              case !(index + move < 0):
                return 0;
              default:
                return this.row + move;
            }
          }).call(this);
        }
        return this;
      };

      Cursor.prototype.get = function(extraPipes, extraSpaces) {
        var arr, cellIndex, chTxt, j, ref, ref1, row, separatorLength;
        arr = this.table.arr;
        row = (ref = arr[this.row]) != null ? ref : arr[arr.length - 1];
        chTxt = this.ch;
        if (this.col > 0) {
          for (cellIndex = j = 0, ref1 = this.col - 1; 0 <= ref1 ? j <= ref1 : j >= ref1; cellIndex = 0 <= ref1 ? ++j : --j) {
            chTxt += row[cellIndex].length;
          }
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
