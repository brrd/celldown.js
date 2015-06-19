celldown = do () ->

    # Celldown default configuration
    config =
        header: true
        rows: 3
        cols: 2
        extraPipes: true
        extraSpaces: true

    # Table
    # =====

    # Count "|" chars in str
    countPipes = (str) ->
        match = str.match /\|/g
        if not match? then 0 else match.length

    ### Check if a string is recognized as a valid table ###
    ### To know if text is a markdown table we count the "|" character: it is supposed to be the same for each line. We also check for a line header. ###
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

    # Les deux func arr2text et text2arr gèrent l'entrée et la sortie : il entrent et sortent text, cursor à chaque fois. Ça permet la conversion data --(text2arr)--> celldown --(arr2text)--> data. Toutes les fioritures sont gérées ici.

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

        removeExtraPipes = (lineContent, lineIndex, cursor) ->
            regex = /^\s*\||\|\s*$/g
            # Track cursor if needed
            if cursor?.line is lineIndex
                cursorMove = 0
                while (result = regex.exec lineContent)?
                    cursorMove += getCursorMove lineContent, result.index, result[0].length, cursor
                cursor.ch += cursorMove
            return lineContent.replace regex, ""

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

    arr2text = (arr, cursor, extraPipes, extraSpaces) ->
        extraPipes ?= config.extraPipes
        extraSpaces ?= config.extraSpaces
        cursorText = cursor?.get extraPipes, extraSpaces # TODO: il faudrait qu'a l'entree aussi ce soit nommé cursorText
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

    getEmptyArr = (colsNumber, rowsNumber) ->
        emptyRow = ("   " for [1..colsNumber])
        hyphensRow = ("---" for [1..colsNumber])
        return [emptyRow, hyphensRow].concat (emptyRow for [1..rowsNumber])

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

        eachRow: (callback) ->
            callback @arr, row, i for row, i in @arr
            return this

        eachCell: (callback) ->
            @eachRow (arr, row, rowIndex) ->
                callback @arr, cell, rowIndex, i for cell, i in row
            return this

        addRows: (index, number) ->
            if not number? then number = 1 else if number <= 0 then return this
            size = @getSize()
            index = size.rows if (not index?) or index > size.rows
            index =  2 if index <= 1
            row = ("   " for [1..size.cols])
            @arr.splice index, 0, row
            @cursor?.moveRow index
            if number > 1 then @addRows index, number-1
            return this

        addCols: (index, number) ->
            if not number? then number = 1 else if number <= 0 then return this
            @eachRow (arr, row, rowIndex) ->
                indexInRow = if not index? or index > row.length then row.length else index
                cellContent = if rowIndex is 1 then "---" else "   "
                row.splice indexInRow, 0, cellContent
            @cursor?.moveCol index
            if number > 1 then @addCols index, number-1
            return this

        removeRows: (index, number) ->
            if not number? then number = 1 else if number <= 0 then return this
            size = @getSize()
            if index <= 1 or index > size.rows-1 then return this
            if number > size.rows - index then number = size.rows - index
            @arr.splice index, number
            if @cursor?
                if index <= @cursor.row <= index + number then @cursor.ch = 0
                @cursor.moveRow index, -number
            return this

        removeCols: (index, number) ->
            if not number? then number = 1 else if number <= 0 then return this
            size = @getSize()
            if index < 0 or index > size.cols - 1 then return this
            if number > size.cols - index then number = size.cols - index
            row.splice index, number for row in @arr
            if @cursor?
                if index <= @cursor.col <= index + number then @cursor.ch = 0
                @cursor.moveCol index, -number
            return this

        align: (colIndex, side) ->
            if colIndex < 0 or colIndex > @arr.length-1 then return this
            cell = @arr[1][colIndex]
            content = ""
            content += "-" for [1..cell.length-2]
            switch side
                when "left" then content = ":" + content + "-"
                when "right" then content = "-" + content + ":"
                when "center" then content = ":" + content + ":"
            @arr[1][colIndex] = content
            return this

        beautify: () ->

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

        get: (extraPipes, extraSpaces) -> arr2text @arr, @cursor

        getSize: () -> { cols: @arr[0].length, rows: @arr.length }

    # Cursor
    # ======

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

    class Cursor
        constructor: (table, coord) ->
            @table = table
            tableText = (row.join("|") for row in table.arr).join "\n"
            if typeof coord.line? then coord = translateCoord coord, tableText
            {@row, @col, @ch} = coord

        moveCol: (index, move) ->
            move ?= 1
            if index <= @col
                lastColIndex = @table.arr[@row].length - 1
                @col = switch
                    when index + move > lastColIndex then lastColIndex
                    when index + move < 0 then 0
                    else @col + move
            return this

        moveRow: (index, move) ->
            move ?= 1
            if index <= @row
                lastRowIndex = @table.arr.length - 1
                @row = switch
                    when index + move > lastRowIndex then lastRowIndex
                    when index + move < 0 then 0
                    else @row + move
            return this

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
        new: (cols, rows, cursor) ->
            cols ?= config.cols
            rows ?= config.rows
            return new Table {cols, rows, cursor}

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
