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
        ### Attention : fonction à n'utiliser que sur la ligne qui contient le curseur ###
        trackCursorWhenReplace = (lineContent, start, length, replacement, cursor) ->
            if length is 0 then return
            end = start + length
            if end <= cursor.ch
                cursor.ch -= length - replacement.length
            else if start < cursor.ch && end > cursor.ch
                cursor.ch -= cursor.ch - start - replacement.length

        removeExtraPipes = (lineContent, lineIndex, cursor) ->
            regex = /^\s*\||\|\s*$/g
            ### Track cursor if needed ###
            if cursor?.line is lineIndex
                while (result = regex.exec lineContent)?
                    trackCursorWhenReplace lineContent, result.index, result[0].length, "", cursor
            return lineContent.replace regex, ""

        trimCells = (lineContent, lineIndex, cursor) ->
            regex = /(\s*)\|(\s*)/g
            ### Track cursor if needed ###
            if cursor?.line is lineIndex
                while (result = regex.exec lineContent)?
                    spacesBefore = result[1]
                    spacesAfter = result[2]
                    trackCursorWhenReplace lineContent, result.index, spacesBefore.length, "", cursor
                    trackCursorWhenReplace lineContent, result.index + spacesBefore.length + 1, spacesAfter.length, "", cursor
            return lineContent.replace regex, "|"

        lines = text.split("\n")
        hyphensIndex = 1
        tableHasExtraPipes = /^\s?\|.*\|\s?$/.test lines[hyphensIndex]
        arr = []
        for i in [0..lines.length-1]
            lineContent = removeExtraPipes lines[i], i, cursor if tableHasExtraPipes
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
            callback @arr, @arr[rowIndex], rowIndex for rowIndex in [0..@arr.length-1] # FIXME: voir menu i + 1, dish for dish, i in courses (ici et partout ailleurs)
            return this

        eachCell: (callback) ->
            @eachRow (arr, row, rowIndex) ->
                callback @arr, row[colIndex], rowIndex, colIndex for colIndex in [0..row.length-1]
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

        # TODO: do tests
        removeRows: (index, number) ->
            if not number? then number = 1 else if number <= 0 then return this
            size = @getSize()
            if index <= 1 or index > size.rows-1 then return this
            if number > size.rows - index then number = size.rows - index
            @arr.splice index, number
            @cursor?.moveRow index -number
            return this

        # TODO: do tests
        removeCols: (index, number) ->
            if not number? then number = 1 else if number <= 0 then return this
            size = @getSize()
            if index < 0 or index > size.cols - 1 then return this
            if number > size.cols - index then number = size.cols - index
            row.splice index, number for row in @arr
            @cursor?.moveCol index -number
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

        ###
        FIXME: si on a une header line super trop longue alors elle est conservée. Il faut la recalculer à chaque fois
        ###
        beautify: () ->

            getColMaxSize = () =>
                colMaxSize = []
                @eachCell (arr, cell, rowIndex, colIndex) ->
                    cellLength = cell.trim().length
                    if !colMaxSize[colIndex] || colMaxSize[colIndex] < cellLength
                        colMaxSize[colIndex] = cellLength
                return colMaxSize

            resizeCells = (colMaxSize) =>
                @eachCell (arr, cell, rowIndex, colIndex) =>
                    cell = cell.trim() # TODO: cursor
                    missingChars = colMaxSize[colIndex] - cell.length
                    isHyphens = /^:?-+:?$/.test cell
                    lastChar = cell.substr -1, cell.length-1
                    fillingChar = if isHyphens then "-" else " "
                    if isHyphens then cell.replace /\s/g, "-"
                    while missingChars > 0
                        if isHyphens and lastChar is ":" and colMaxSize[colIndex] > 1
                            cell = cell.substr(0, cell.length-1) + fillingChar + lastChar
                        else
                            cell += fillingChar
                        missingChars--
                    @arr[rowIndex][colIndex] = cell

            resizeCells getColMaxSize()
            return this

        get: (extraPipes, extraSpaces) -> arr2text @arr, @cursor

        getSize: () -> { cols: @arr[0].length, rows: @arr.length }

        # TODO: @getCoord
        # TODO: setCol, setCell & setRow for adding content in table

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

    ###
    coord can be either :
    * a {line, ch} object (position in text) or
    * a {row, col, ch} object (position in table)
    Only the position is used to keep track of the cursor.
    NOTE: null means last element. TODO: do tests
    ###

    class Cursor
        constructor: (table, coord) ->
            @table = table
            tableText = (row.join("|") for row in table.arr).join "\n"
            if typeof coord.line? then coord = translateCoord coord, tableText
            {@row, @col, @ch} = coord

        moveCol: (index, move) ->
            move ?= 1
            if index <= @col
                lastColIndex = @table.arr[@col].length - 1
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
            row = arr[@row] ? arr[arr.length-1] # FIXME: issue here ?
            chTxt = @ch
            chTxt += row[cellIndex].length for cellIndex in [0..@col-1]
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
