###
    celldown.js - A small javascript library for manipulating markdown tables
    https://github.com/brrd/celldown
    MIT License - 2015 Thomas Brouard
###
celldown = do () ->

    # Celldown default configuration
    config =
        header: true
        rows: 3
        cols: 2
        extraPipes: true
        extraSpaces: true
        autoBeautify: true

    # Table
    # =====

    # Count "|" chars in str
    countPipes = (str) ->
        match = str.match /\|/g
        if not match? then 0 else match.length

    # Check if a string is recognized as a valid table
    # To know if text is a markdown table we count "|" characters: it is supposed to be the same for each line. We also check for a hyphens row.
    # TODO: prepend header when table is ok but has no header
    isValidTable = (text) ->
        lines = text.split("\n")
        hasHeader = /^[\s-:|]+$/.test lines[1]
        if lines.length < 2 or !hasHeader then return false
        for line in lines
            numberOfPipes = countPipes line
            if numberOfPipes is 0 or (prevNumberOfPipes? and numberOfPipes isnt prevNumberOfPipes) then return false
            prevNumberOfPipes = numberOfPipes
        return true

    # Get an normalized array and an updated {line, ch} cursor from a text and a {line, ch}
    text2arr = (text, cursor) ->
        # Compute if deleting a fragment of lineContent from position start to position start + length should cause the cursor to move. Return the corresponding move.
        getCursorMove = (lineContent, start, length, cursor) ->
            if length is 0 then return 0
            end = start + length
            if end <= cursor.ch
                return -length
            else if start < cursor.ch && end > cursor.ch
                return -(cursor.ch - start)
            return 0

        # Remove opional pipes that surround rows
        removeExtraPipes = (lineContent, lineIndex, cursor) ->
            regex = /^\s*\||\|\s*$/g
            # Track cursor if needed
            if cursor?.line is lineIndex
                cursorMove = 0
                while (result = regex.exec lineContent)?
                    cursorMove += getCursorMove lineContent, result.index, result[0].length, cursor
                cursor.ch += cursorMove
            return lineContent.replace regex, ""

        # Trim cells
        trimCells = (lineContent, lineIndex, cursor) ->
            regex = /(\s*)\|(\s*)/g
            # Track cursor if needed
            if cursor?.line is lineIndex
                cursorMove = 0
                while (result = regex.exec lineContent)?
                    spacesBefore = result[1]
                    cursorMove += getCursorMove lineContent, result.index, spacesBefore.length, cursor
                    spacesAfter = result[2]
                    cursorMove += getCursorMove lineContent, result.index + spacesBefore.length + 1, spacesAfter.length, cursor
                cursor.ch += cursorMove
            return lineContent.replace regex, "|"

        lines = text.split("\n")
        hyphensIndex = 1
        tableHasExtraPipes = /^\s?\|.*\|\s?$/.test lines[hyphensIndex]
        arr = []
        for line, i in lines
            lineContent = removeExtraPipes line, i, cursor if tableHasExtraPipes
            lineContent = trimCells lineContent, i, cursor
            row = lineContent.split("|")
            arr.push row
        return {arr, cursor}

    # Get a markdown table and a {line, ch} cursor
    # extraPipes : add optional pipes before and after row
    # extraSpaces : add extra spaces into cells
    arr2text = (arr, cursor, extraPipes, extraSpaces) ->
        extraPipes ?= config.extraPipes
        extraSpaces ?= config.extraSpaces
        cursorText = cursor?.get extraPipes, extraSpaces
        cursorText ?= null
        cellSeparator = if extraSpaces then " | " else "|"
        if extraPipes and extraSpaces
            lineStart = "| "
            lineStop = " |"
        else if extraPipes
            lineStart = lineStop = "|"
        else
            lineStart = lineStop = ""
        text = (lineStart + row.join(cellSeparator) + lineStop for row in arr).join "\n"
        return { table: text, cursor: cursorText }

    # Get an empty array
    getEmptyArr = (colsNumber, rowsNumber) ->
        emptyRow = ("   " for [1..colsNumber])
        hyphensRow = ("---" for [1..colsNumber])
        return [emptyRow, hyphensRow].concat (emptyRow for [1..rowsNumber])

    # Table in created and returned by celldown
    class Table
        constructor: (options) ->
            cursor = options.cursor ? null
            if options.text?
                ### From text ###
                if !isValidTable options.text then console.error "String is not recognized as a valid markdown table."
                {@arr, cursor} = text2arr options.text, cursor
            else if options.cols? and options.rows?
                @arr = getEmptyArr options.cols, options.rows
            @cursor = if cursor? then new Cursor this, cursor else null

        # Run callback(@arr, row, rowIndex) for each row of the table
        eachRow: (callback) ->
            callback @arr, row, i for row, i in @arr
            return this

        # Run callback(@arr, cell, rowIndex, colIndex) for each cell of the table
        eachCell: (callback) ->
            @eachRow (arr, row, rowIndex) ->
                callback @arr, cell, rowIndex, i for cell, i in row
            return this

        # Add 'number' rows at 'index' position
        addRows: (index, number) ->
            if not number? then number = 1 else if number <= 0 then return this
            size = @getSize()
            index ?= @cursor?.row ?= 0
            if index > size.rows then index = size.rows
            if index <= 1 then index =  2
            row = ("   " for [1..size.cols])
            @arr.splice index, 0, row
            @cursor?.moveRow index
            if number > 1 then @addRows index, number-1
            return this

        # Add 'number' cols at 'index' position
        addCols: (index, number) ->
            if not number? then number = 1 else if number <= 0 then return this
            index ?= @cursor?.col ?= 0
            @eachRow (arr, row, rowIndex) ->
                indexInRow = if index > row.length then row.length else index
                cellContent = if rowIndex is 1 then "---" else "   "
                row.splice indexInRow, 0, cellContent
            @cursor?.moveCol index
            if number > 1 then @addCols index, number-1
            return this

        # [Alias] Add 'number' rows before cursor
        addRowsBeforeCursor: (number) -> @addRows null, number

        # [Alias] Add 'number' rows after cursor
        addRowsAfterCursor: (number) -> if @cursor? then @addRows(@cursor.row + 1, number) else this

        # [Alias] Add 'number' cols before cursor
        addColsBeforeCursor: (number) -> @addCols null, number

        # [Alias] Add 'number' cols after cursor
        addColsAfterCursor: (number) -> if @cursor? then @addCols(@cursor.col + 1, number) else this

        # Remove 'number' rows at 'index' position
        removeRows: (index, number) ->
            if not number? then number = 1 else if number <= 0 then return this
            size = @getSize()
            index ?= @cursor?.row ?= null
            if not index? or index <= 1 or index > size.rows-1 then return this
            if number > size.rows - index then number = size.rows - index
            @arr.splice index, number
            if @cursor?
                if index <= @cursor.row <= index + number - 1 then @cursor.ch = 0
                @cursor.moveRow index, -number
            return this

        # Remove 'number' cols at 'index' position
        removeCols: (index, number) ->
            if not number? then number = 1 else if number <= 0 then return this
            size = @getSize()
            index ?= @cursor?.col ?= null
            if not index? or index < 0 or index > size.cols - 1 then return this
            if number > size.cols - index then number = size.cols - index
            row.splice index, number for row in @arr
            if @cursor?
                if index <= @cursor.col <= index + number - 1 then @cursor.ch = 0
                @cursor.moveCol index, -number
            return this

        # Set 'colIndex'th column align according to 'side' parameter
        align: (colIndex, side) ->
            colIndex ?= @cursor?.col ?= null
            if not colIndex? or colIndex < 0 or colIndex > @arr.length-1 then return this
            cell = @arr[1][colIndex]
            content = ""
            content += "-" for [1..cell.length-2]
            switch side
                when "left" then content = ":" + content + "-"
                when "right" then content = "-" + content + ":"
                when "center" then content = ":" + content + ":"
                else content = "-" + content + "-"
            @arr[1][colIndex] = content
            return this

        # Beautify table. It remains normalized (ie no extra pipes, no extra spaces in cells)
        beautify: () ->
            # For each col, store the highest text length
            getColMaxSize = () =>
                colMaxSize = []
                minSize = 3
                @eachCell (arr, cell, rowIndex, colIndex) ->
                    if rowIndex is 1 then return # dont check hyphens row
                    cellLength = cell.trim().length
                    if !colMaxSize[colIndex] or colMaxSize[colIndex] < cellLength
                        colMaxSize[colIndex] = cellLength
                colMaxSize[i] = minSize for size, i in colMaxSize when size < minSize
                return colMaxSize
            # Resize (= fill) all cells according to the given max size for each col
            resizeCells = (colMaxSize) =>
                @eachCell (arr, cell, rowIndex, colIndex) =>
                    # Watch cursor first (before trim)
                    # TODO: create a cursor.moveCh method from this code
                    if @cursor? and @cursor.row is rowIndex and @cursor.col is colIndex
                        beforeCursor = if @cursor.ch? then cell.substr 0, @cursor.ch else cell
                        match = beforeCursor.match /^\s?/
                        if match?
                            moveLeft = match[0].length
                            @cursor.ch = if moveLeft > @cursor.ch then 0 else @cursor.ch - moveLeft
                    # Then modify cell
                    cell = cell.trim()
                    size = colMaxSize[colIndex]
                    isHyphens = rowIndex is 1
                    if isHyphens
                        firstChar = cell.substr 0, 1 ? "-"
                        lastChar = cell.substr -1, 1 ? "-"
                        cell = firstChar + ("-" for [1..size-2]).join("") + lastChar
                    else
                        missingChars = size - cell.length
                        if missingChars > 0 then cell += (" " for [1..missingChars]).join("")
                    @arr[rowIndex][colIndex] = cell

            resizeCells getColMaxSize()
            return this

        # Get the markdown table as text and the updated cursor
        get: (extraPipes, extraSpaces, beautify) ->
            beautify ?= config.autoBeautify
            if beautify is true then @beautify()
            return arr2text @arr, @cursor, extraPipes, extraSpaces

        # Get the size of the table {cols, rows}
        getSize: () -> { cols: @arr[0].length, rows: @arr.length }

    # Cursor
    # ======

    # Given a {line, ch} coord and a markdown table, return a {row, col, ch} coord object
    translateCoord = (coord, text) ->
        rows = text.split "\n"
        rowIndex = if coord.line? and coord.line < rows.length then coord.line else null
        row = if rowIndex? then rows[rowIndex] else rows[rows.length-1]
        beforeCursor = if coord.ch? then row.substr 0, coord.ch else row
        colIndex = countPipes beforeCursor
        remainingChars = beforeCursor.match /\|[^|]*$/
        chIndex = if remainingChars? then remainingChars[0].length else 0
        return {
            row: rowIndex
            col: colIndex
            ch: chIndex
        }

    # Represent the tracked cursor
    class Cursor
        constructor: (table, coord) ->
            @table = table
            tableText = (row.join("|") for row in table.arr).join "\n"
            if typeof coord.line? then coord = translateCoord coord, tableText
            {@row, @col, @ch} = coord

        # Move cursor in the 'move' direction in col when table is modified
        # 'index' is the modified position, so the cursor is moved only if it is located after the modifed col
        # Use index=0 for moving cursor without testing its relative position
        moveCol: (index, move) ->
            index ?= 0
            move ?= 1
            if index <= @col
                lastColIndex = @table.arr[@row].length - 1
                @col = switch
                    when @col + move > lastColIndex then lastColIndex
                    when @col + move < 0 then 0
                    else @col + move
            return this

        # Move cursor in the 'move' direction in row when table is modified
        # 'index' is the modified position, so the cursor is moved only if it is located after the modifed row
        # Use index=0 for moving cursor without testing its relative position
        moveRow: (index, move) ->
            index ?= 0
            move ?= 1
            if index <= @row
                lastRowIndex = @table.arr.length - 1
                @row = switch
                    when @row + move > lastRowIndex then lastRowIndex
                    when @row + move < 0 then 0
                    else @row + move
            return this

        # Get a converted {line, ch} cursor for using with text
        get: (extraPipes, extraSpaces) ->
            arr = @table.arr
            row = arr[@row] ? arr[arr.length-1]
            chTxt = @ch
            if @col > 0 then chTxt += row[cellIndex].length for cellIndex in [0..@col-1]
            # extraPipes
            if extraPipes then chTxt += 1
            # extraSpaces
            separatorLength = if extraSpaces then 3 else 1
            chTxt += @col * separatorLength
            return {
                line: @row,
                ch: chTxt
            }

    # celldown
    # ========

    _celldown =
        # Create a new empty Table
        new: (cols, rows, cursor) ->
            cols ?= config.cols
            rows ?= config.rows
            return new Table {cols, rows, cursor}
        # Create a new Table from text
        fromText: (text, cursor) -> new Table {text, cursor}

        isValidTable: (text) -> isValidTable(text)

        isInstanceOfTable: (obj) -> obj instanceof Table

        isInstanceOfCursor: (obj) -> obj instanceof Cursor

    return _celldown

if typeof module isnt 'undefined' and typeof module.exports isnt 'undefined'
    module.exports = celldown
else if typeof define is 'function' and define.amd
    define [], () -> celldown
else
    window.celldown = celldown
