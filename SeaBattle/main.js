/**
 * Helper object
 *
 * {object}
 */
var Helper = {
    addEvent: function (element, event, func) {
        if(element.addEventListener) {
            element.addEventListener(event, func, false);
        } else {
            element.attachEvent('on' + event, func);
        }
    },
    removeEvent: function (element, event, func) {
        if(element.removeEventListener) {
            element.removeEventListener(event, func, false);
        } else {
            element.detachEvent('on' + event, func);
        }
    }
};

/**
 * Sea Battle game object
 *
 * {object}
 */
var SeaBattle = SeaBattle || {};
(function() {
    SeaBattle = {
        /**
         * If dragging started flag
         *
         * {boolean}
         */
        dragStarted: false,
        /**
         * If game can be started
         *
         * {boolean}
         */
        gameStartAllowed: false,
        /**
         * If game was started
         *
         * {boolean}
         */
        gameStarted: false,
        /**
         * If auto placement is activated
         *
         * {boolean}
         */
        autoPlacementActivated: false,
        /**
         * If it's player's turn
         *
         * {boolean}
         */
        myTurn: true,
        /**
         * Player's ships-storing object
         *
         * {object}
         */
        ships: {},
        /**
         * Number of player's ships left
         *
         * {object}
         */
        shipsLeft: 10,
        /**
         * Opponent's ships-storing object
         *
         * {object}
         */
        oppShips: {},
        /**
         * Number of opponent's ships left
         *
         * {object}
         */
        oppShipsLeft: 10,
        /**
         * Contains cells objects
         *
         * {object}
         */
        cells: {},
        /**
         * Contains an array of player's cells
         *
         * {object}
         */
        playersCells: [],
        /**
         * Contains opponent's cells objects
         *
         * {object}
         */
        oppCells: {},
        /**
         * Contains array with free cells when autoPlacement is enabled
         *
         * {object}
         */
        freeCells: [],
        /**
         * Contains shot ship to help AI to finish it
         *
         * {object}
         */
        shootingHelper: null,
        /**
         * Contains cells to shoot to help AI to finish a ship
         *
         * {object}
         */
        shootingHelperCells: [],
        /**
         * Contains Battlefield wrapper element
         *
         * {object}
         */
        playersBattleField: {
            el: document.getElementById('myBattlefield')
        },
        /**
         * Contains Opponent's Battlefield wrapper element
         *
         * {object}
         */
        opponentsBattleField: {
            el: document.getElementById('opponentsBattlefield')
        },
        /**
         * Contains buttons elements
         *
         * {object}
         */
        buttons: {
            startButton: document.getElementById('start-button'),
            autoPlaceButton: document.getElementById('auto-place-button'),
            reloadButton: document.getElementById('reload-button'),
            playAgainButton: document.getElementById('play-again-button')
        },
        /**
         * Contains elements used when game starts
         *
         * {object}
         */
        gameDOMElements: {
            cta: document.getElementById('cta'),
            log: document.getElementById('log'),
            disabler: document.getElementById('oppBattlefieldDisabler'),
            hideElements: document.getElementsByClassName('on-start-hide'),
            showElements: document.getElementsByClassName('on-start-show')
        },
        /**
         * Create object for a single cell
         */
        newCell: function (el, row, column) {
            this.el = el;
            this.row = row;
            this.column = column;
            this.state = 'free';
            this.coordinateY = el.offsetTop;
            this.coordinateX = el.offsetLeft;
            this.occupiedBy = 'none';
        },
        /**
         * Create objects for cells
         *
         * @param {object} field
         * @param {object} cellsObject
         */
        createCellsObjects: function(field, cellsObject) {
            var allCells = field.getElementsByClassName('battlefield-column'),
                row = 0,
                i,
                c,
                cellNumber,
                id,
                column,
                cellName;

            for (i = 0; i < allCells.length; i++) {
                cellNumber = i.toString();
                id = i;
                if (cellNumber.length > 1) {
                    cellNumber = cellNumber.substr(1);
                }
                for (c = 0; c < 10; c++) {
                    if (!cellNumber.match(c)) continue;
                    column = c;
                }
                if (0 < i && i%10 == 0) {
                    row++;
                    column = 0;
                }
                if (id < 10) {
                    id = '0' + i;
                }
                cellName = 'cell' + id;
                this[cellsObject][cellName] = new this.newCell(allCells[i], row, column);
            }
        },
        /**
         * Create object for a single ship
         */
        newShip: function(el) {
            this.el = el;
            this.position = {
                row: null,
                column: null
            };
            this.state = 'inDock';
            this.orientation = 0;
            this.coordinateY = el.offsetTop;
            this.coordinateX = el.offsetLeft;
            this.dropAllowed = true;
            this.turnAllowed = true;
        },
        /**
         * Create objects for ships
         *
         * @param {object} shipClassName
         * @param {object} shipsObject
         */
        createShipsObjects: function(shipClassName, shipsObject) {
            var allShips = document.getElementsByClassName(shipClassName),
                i,
                shipName,
                decks;

            for (i = 0; i < allShips.length; i++) {
                shipName = shipClassName + i;
                this[shipsObject][shipName] = new this.newShip(allShips[i]);
                decks = this[shipsObject][shipName].decks;
                if (allShips[i].className.match('four')) {
                    decks = 4;
                } else if (allShips[i].className.match('three')) {
                    decks = 3;
                } else if (allShips[i].className.match('two')) {
                    decks = 2;
                } else {
                    decks = 1;
                }
                this[shipsObject][shipName].decks = decks;
                this[shipsObject][shipName].name = shipName;
            }
        },
        /**
         * Set offset properties to Battlefield
         */
        setBattlefieldOffsets: function() {
            var battlefield = this.playersBattleField.el;

            this.playersBattleField.offsetTop = battlefield.offsetTop;
            this.playersBattleField.offsetLeft = battlefield.offsetLeft;
        },
        /**
         * Update position of a ship
         *
         * @param {object} ship
         * @param {object} shipContainingObject
         */
        updateShipCoordinates: function(ship, shipContainingObject) {
            this[shipContainingObject][ship].coordinateY = this[shipContainingObject][ship].el.offsetTop;
            this[shipContainingObject][ship].coordinateX = this[shipContainingObject][ship].el.offsetLeft;
        },
        /**
         * Update 'position' of a ship
         *
         * @param {object} ship
         */
        updateShipPosition: function(ship) {
            var i,
                thisCellPositionY,
                thisCellPositionX;

            for (i in this.cells) {
                if (!this.cells.hasOwnProperty(i)) continue;
                thisCellPositionY = this.cells[i].coordinateY - 2;
                thisCellPositionX = this.cells[i].coordinateX - 2;
                if (this.ships[ship].coordinateY != thisCellPositionY || this.ships[ship].coordinateX != thisCellPositionX) continue;
                this.ships[ship].position = {
                    row: this.cells[i].row,
                    column: this.cells[i].column
                }
            }
        },
        /**
         * Update dragging options of a ship
         */
        updateShipDragOpts: function(e, ship) {
            this.ships[ship].shiftHeight = e.pageY - this.ships[ship].coordinateY;
            this.ships[ship].shiftWidth = e.pageX - this.ships[ship].coordinateX;
            this.ships[ship].width = this.ships[ship].decks * 30;
        },
        /**
         * Trigger ship dragging logic
         */
        dragShipInit: function(e) {
            e = e || window.event;
            var target = e.target || e.srcElement,
                self = SeaBattle,
                thisShip,
                ship,
                dragOptions;

            for (ship in self.ships) {
                if (!self.ships.hasOwnProperty(ship)) continue;
                if (self.ships[ship].el == target) {
                    thisShip = ship;
                    break;
                }
            }
            self.updateShipDragOpts(e, thisShip);
            dragOptions = {
                target: target,
                thisShip: thisShip
            };
            self.dragShip(dragOptions);
            document.onmouseup = function() {
                document.onmousemove = null;
            };
            target.onmouseup = function() {
                if (!self.dragStarted && self.ships[thisShip].state == 'onField') {
                    self.turnShip(thisShip);
                }
            }
        },
        /**
         * Ship dragging logic
         *
         * @param {object} options
         */
        dragShip: function(options) {
            var self = this;

            document.onmousemove = function(e) {
                var cursorY = e.pageY - self.ships[options.thisShip].shiftHeight,
                    cursorX = e.pageX - self.ships[options.thisShip].shiftWidth,
                    battlefieldBottom,
                    battlefieldRight;

                self.dragStarted = true;
                options.target.style.top = cursorY;
                options.target.style.left = cursorX;
                options.target.style.zIndex = 3;
                if (self.dragStarted && self.ships[options.thisShip].state == 'onField') {
                    self.freeOccupied(self.getCellsOccupy(options.thisShip, 'cells', 'ships'));
                    self.freeDisabled(self.getCellsDisable(options.thisShip, 'cells', 'ships'));
                }
                if (self.ships[options.thisShip].orientation == 0) {
                    battlefieldBottom = self.playersBattleField.offsetTop + 290;
                    battlefieldRight = self.playersBattleField.offsetLeft + 322 - self.ships[options.thisShip].width;
                } else {
                    battlefieldBottom = self.playersBattleField.offsetTop + 322 - self.ships[options.thisShip].width;
                    battlefieldRight = self.playersBattleField.offsetLeft + 290;
                }
                if ((self.playersBattleField.offsetTop - 17) < cursorY && cursorY < battlefieldBottom && (self.playersBattleField.offsetLeft - 10) < cursorX && cursorX < battlefieldRight) {
                    self.stickToGrid({
                        ship: options.thisShip,
                        shipEl: options.target,
                        cursorX: cursorX,
                        cursorY: cursorY
                    });
                    document.onmouseup = function() {
                        if (self.dragStarted) {
                            options.target.style.borderColor = '#00ab1a';
                            if (self.ships[options.thisShip].dropAllowed) {
                                self.successDrag(options.thisShip);
                            } else {
                                self.failDrag(options.thisShip);
                            }
                        }
                    };
                } else {
                    options.target.style.borderColor = '#00ab1a';
                    document.onmouseup = function() {
                        if (self.dragStarted) {
                            self.failDrag(options.thisShip);
                        }
                    };
                }
            };
        },
        /**
         * Get cells that are/should be occupied
         *
         * @param {string} ship
         * @param {object} cellContainingObject
         * @param {object} shipContainingObject
         * @returns {object} arr
         */
        getCellsOccupy: function(ship, cellContainingObject, shipContainingObject) {
            var firstCell = 'cell' + this[shipContainingObject][ship].position.row.toString() + this[shipContainingObject][ship].position.column.toString(),
                arr = [firstCell],
                thisCellRow,
                thisCellColumn,
                cellId,
                d;

            if (this[shipContainingObject][ship].decks > 1) {
                thisCellRow = this[cellContainingObject][firstCell].row;
                thisCellColumn = this[cellContainingObject][firstCell].column;
                if (this[shipContainingObject][ship].orientation == 0) {
                    for (d = 1; d < this[shipContainingObject][ship].decks; d++) {
                        cellId = 'cell' + thisCellRow + (thisCellColumn + d).toString();
                        arr.push(cellId);
                    }
                } else {
                    for (d = 1; d < this[shipContainingObject][ship].decks; d++) {
                        cellId = 'cell' + (thisCellRow + d).toString() + thisCellColumn;
                        arr.push(cellId);
                    }
                }
            }
            return arr;
        },
        /**
         * Get cells that are/should be disabled
         *
         * @param {object} ship
         * @param {object} cellContainingObject
         * @param {object} shipContainingObject
         * @returns {object} arr
         */
        getCellsDisable: function(ship, cellContainingObject, shipContainingObject) {
            var firstCellRow = this[shipContainingObject][ship].position.row,
                firstCellColumn = this[shipContainingObject][ship].position.column,
                r,
                c,
                cellId,
                arr = [];

            if (this[shipContainingObject][ship].orientation == 0) {
                for (r = firstCellRow - 1; r <= firstCellRow + 1; r++) {
                    if (0 > r || r > 9) continue;
                    for (c = firstCellColumn - 1; c <= firstCellColumn + parseInt(this[shipContainingObject][ship].decks); c++) {
                        if (0 > c || c > 9) continue;
                        cellId = 'cell' + r.toString() + c.toString();
                        if (this[cellContainingObject][cellId].state !== 'occupied') {
                            arr.push(cellId);
                        } else if (this[cellContainingObject][cellId].occupiedBy !== this[shipContainingObject][ship].name) {
                            arr.push(cellId);
                        }
                    }
                }
            } else {
                for (c = firstCellColumn - 1; c <= firstCellColumn + 1; c++) {
                    if (0 > c || c > 9) continue;
                    for (r = firstCellRow - 1; r <= firstCellRow + parseInt(this[shipContainingObject][ship].decks); r++) {
                        if (0 > r || r > 9) continue;
                        cellId = 'cell' + r.toString() + c.toString();
                        if (this[cellContainingObject][cellId].state !== 'occupied') {
                            arr.push(cellId);
                        } else if (this[cellContainingObject][cellId].occupiedBy !== this[shipContainingObject][ship].name) {
                            arr.push(cellId);
                        }
                    }
                }
            }
            return arr;
        },
        /**
         * Change cells status to 'occupied'
         *
         * @param {object} cells
         * @param {object} ship
         */
        occupyCells: function(cells, ship) {
            var i;

            for (i = 0; i < cells.length; i++) {
                this.cells[cells[i]].state = 'occupied';
                this.cells[cells[i]].occupiedBy = this.ships[ship].name;
            }
        },
        /**
         * Change cells status to 'disabled'
         *
         * @param {object} cells
         */
        disableCells: function(cells) {
            var i;

            for (i = 0; i < cells.length; i++) {
                this.cells[cells[i]].state = 'disabled';
            }
        },
        /**
         * Change cells status from 'occupied' to 'free'
         *
         * @param {object} cells
         */
        freeOccupied: function(cells) {
            var i;

            for (i = 0; i < cells.length; i++) {
                this.cells[cells[i]].state = 'free';
            }
        },
        /**
         * Change cells status from 'disabled' to 'free'
         *
         * @param {object} cells
         */
        freeDisabled: function(cells) {
            var i,
                r,
                c,
                cellId,
                isOccupied;

            for (i = 0; i < cells.length; i++) {
                isOccupied = false;
                for (r = this.cells[cells[i]].row - 1; r <= this.cells[cells[i]].row + 1; r++) {
                    if (0 > r || r > 9) continue;
                    for (c = this.cells[cells[i]].column - 1; c <= this.cells[cells[i]].column + 1; c++) {
                        if (0 > c || c > 9) continue;
                        cellId = 'cell' + r.toString() + c.toString();
                        if (this.cells[cellId].state != 'occupied') continue;
                        isOccupied = true;
                    }
                }
                if (!isOccupied) {
                    this.cells[cells[i]].state = 'free';
                }
            }
            this.paintField();
        },
        /**
         * Stick ship to Battlefield grid and check if dropping here is allowed
         *
         * @param {object} options
         */
        stickToGrid: function (options) {
            var cell,
                cellTop,
                cellLeft;

            for (cell in this.cells) {
                if (!this.cells.hasOwnProperty(cell)) continue;
                cellTop = this.cells[cell].coordinateY;
                cellLeft = this.cells[cell].coordinateX;
                if ((cellTop - 17) < options.shipEl.offsetTop && options.shipEl.offsetTop < (cellTop + 17)) {
                    options.shipEl.style.top = cellTop - 2;
                }
                if ((cellLeft - 17) < options.cursorX && options.cursorX < (cellLeft + 37)) {
                    options.shipEl.style.left = cellLeft - 2;
                }
                this.allowShipDrop({
                    shipEl: options.shipEl,
                    cellTop: cellTop,
                    cellLeft: cellLeft,
                    cell: cell,
                    ship: options.ship
                });
            }
        },
        /**
         * Allow or deny ship dropping
         *
         * @param {object} options
         */
        allowShipDrop: function(options) {
            var thisCellRow,
                thisCellColumn,
                cellId,
                d;

            if (options.shipEl.offsetTop == options.cellTop - 2 && options.shipEl.offsetLeft == options.cellLeft - 2) {
                if (this.cells[options.cell].state !== 'occupied' || this.cells[options.cell].state !== 'disabled') {
                    options.shipEl.style.borderColor = '#00ab1a';
                    this.ships[options.ship].dropAllowed = true;
                }
                thisCellRow = this.cells[options.cell].row;
                thisCellColumn = this.cells[options.cell].column;
                for (d = 0; d < this.ships[options.ship].decks; d++) {
                    if (this.ships[options.ship].orientation) {
                        cellId = 'cell' + (thisCellRow + d).toString() + thisCellColumn;
                        if (this.cells[cellId].state == 'occupied' || this.cells[cellId].state == 'disabled') {
                            options.shipEl.style.borderColor = 'red';
                            this.ships[options.ship].dropAllowed = false;
                        }

                    } else {
                        cellId = 'cell' + thisCellRow + (thisCellColumn + d).toString();
                        if (this.cells[cellId].state == 'occupied' || this.cells[cellId].state == 'disabled') {
                            options.shipEl.style.borderColor = 'red';
                            this.ships[options.ship].dropAllowed = false;
                        }
                    }
                }
            }
        },
        /**
         * If ship can be dropped
         *
         * @param {object} ship
         */
        successDrag: function(ship) {
            document.onmousemove = null;
            this.updateShipCoordinates(ship, 'ships');
            this.updateShipPosition(ship);
            this.occupyCells(this.getCellsOccupy(ship, 'cells', 'ships'), ship);
            this.disableCells(this.getCellsDisable(ship, 'cells', 'ships'));
            this.ships[ship].occupyCells = this.getCellsOccupy(ship, 'cells', 'ships');
            this.ships[ship].disableCells = this.getCellsDisable(ship, 'cells', 'ships');
            this.paintField();
            if (this.ships[ship].state !== 'onField') {
                this.ships[ship].state = 'onField';
            }
            this.ships[ship].el.style.zIndex = 2;
            this.playersBattleField.el.appendChild(this.ships[ship].el);
            this.allowGameStart();
            this.dragStarted = false;
        },
        /**
         * If ship can't be dropped
         *
         * @param {object} ship
         */
        failDrag: function(ship) {
            this.ships[ship].el.style.top = this.ships[ship].coordinateY;
            this.ships[ship].el.style.left = this.ships[ship].coordinateX;
            if (this.ships[ship].state == 'onField') {
                this.occupyCells(this.getCellsOccupy(ship, 'cells', 'ships'), ship);
                this.disableCells(this.getCellsDisable(ship, 'cells', 'ships'));
                this.paintField();
            }
            this.ships[ship].el.style.zIndex = 2;
            document.onmousemove = null;
            this.dragStarted = false;
        },
        /**
         * Allow game starting if all ships are placed on Battlefield
         */
        allowGameStart: function() {
            var gameStartAllowed,
                ship;

            if (!this.gameStartAllowed) {
                gameStartAllowed = true;
                for (ship in this.ships) {
                    if (!this.ships.hasOwnProperty(ship)) continue;
                    if (this.ships[ship].state == 'inDock') {
                        gameStartAllowed = false;
                        break;
                    }
                }
                if (gameStartAllowed) {
                    this.buttons.startButton.disabled = false;
                    this.updateCta('Game can now be started!');
                    this.gameStartAllowed = true;
                }
            }
        },
        /**
         * Check if turn is possible
         *
         * @param {object} cells
         * @param {object} ship
         */
        checkBeforeTurn: function(cells, ship) {
            var self = this,
                cellId,
                i,
                r,
                c;

            for (i = 0; i < cells.length; i++) {
                function blinkColour() {
                    function blinkRed() {
                        self.ships[ship].el.style.borderColor = '#00ab1a';
                    }
                    setTimeout(blinkRed, 200);
                    self.ships[ship].el.style.borderColor = 'red';
                }
                if (!this.cells[cells[i]]) {
                    this.ships[ship].turnAllowed = false;
                    blinkColour();
                    break;
                }
                for (r = this.cells[cells[i]].row - 1; r <= this.cells[cells[i]].row + 1; r++) {
                    if (0 > r || r > 9) continue;
                    for (c = this.cells[cells[i]].column - 1; c <= this.cells[cells[i]].column + 1; c++) {
                        if (0 > c || c > 9) continue;
                        cellId = 'cell' + r.toString() + c.toString();
                        if (this.cells[cellId].state == 'occupied' && this.cells[cellId].occupiedBy != this.ships[ship].name) {
                            this.ships[ship].turnAllowed = false;
                            blinkColour();
                        }
                    }
                }
            }
        },
        /**
         * Ship turning logic
         *
         * @param {object} ship
         */
        turnShip: function(ship) {
            var widthToHeight,
                heightToWidth;

            if (this.ships[ship].decks > 1 && !this.gameStarted) {
                if (this.ships[ship].orientation) {
                    this.ships[ship].orientation = 0;
                    this.checkBeforeTurn(this.getCellsOccupy(ship, 'cells', 'ships'), ship);
                    this.ships[ship].orientation = 1;
                } else {
                    this.ships[ship].orientation = 1;
                    this.checkBeforeTurn(this.getCellsOccupy(ship, 'cells', 'ships'), ship);
                    this.ships[ship].orientation = 0;
                }
                if (this.ships[ship].turnAllowed) {
                    widthToHeight = this.ships[ship].el.offsetWidth - 4;
                    heightToWidth = this.ships[ship].el.offsetHeight - 4;
                    this.ships[ship].el.style.width = heightToWidth;
                    this.ships[ship].el.style.height = widthToHeight;
                    this.freeOccupied(this.getCellsOccupy(ship, 'cells', 'ships'));
                    this.freeDisabled(this.getCellsDisable(ship, 'cells', 'ships'));
                    if (this.ships[ship].orientation) {
                        this.ships[ship].orientation = 0;
                    } else {
                        this.ships[ship].orientation = 1;
                    }
                    this.occupyCells(this.getCellsOccupy(ship, 'cells', 'ships'), ship);
                    this.disableCells(this.getCellsDisable(ship, 'cells', 'ships'));
                    this.ships[ship].occupyCells = this.getCellsOccupy(ship, 'cells', 'ships');
                    this.ships[ship].disableCells = this.getCellsDisable(ship, 'cells', 'ships');
                    this.paintField();
                } else {
                    this.ships[ship].turnAllowed = true;
                }
            }
        },
        /**
         * Paint cells depending on state
         */
        paintField: function() {
            //DEBUGGING FUNCTION, USELESS IN FINAL VERSION
            /*for (var i in this.cells) {
                if (this.cells.hasOwnProperty(i)) {
                    if (this.cells[i].state == 'disabled') {
                        this.cells[i].el.style.background = '#ccc';
                    } else if (this.cells[i].state == 'occupied') {
                        this.cells[i].el.style.background = '#000';
                    } else  if (this.cells[i].state == 'triedOccupied'){
                        this.cells[i].el.style.background = 'yellow';
                    } else {
                        this.cells[i].el.style.background = '#fff';
                    }
                }
            }*/
            //Paint Opponent's field
            /*for (var i in SeaBattle.oppCells) {
                if (SeaBattle.oppCells.hasOwnProperty(i)) {
                    if (SeaBattle.oppCells[i].state == 'disabled') {
                        SeaBattle.oppCells[i].el.style.background = '#ccc';
                    } else if (SeaBattle.oppCells[i].state == 'occupied') {
                        SeaBattle.oppCells[i].el.style.background = '#000';
                    } else  if (SeaBattle.oppCells[i].state == 'triedOccupied'){
                        SeaBattle.oppCells[i].el.style.background = 'yellow';
                    } else {
                        SeaBattle.oppCells[i].el.style.background = '#fff';
                    }
                }
            }*/
        },
        /**
         * Initialize buttons events
         */
        buttonsSetInit: function() {
            var self = this;

            self.buttons.autoPlaceButton.onclick = function() {
                self.autoPlacementActivated = true;
                self.autoPlaceShips('cells', 'ships');
                self.allowGameStart();
                self.paintField();
            };
            self.buttons.reloadButton.onclick = function() {
                location.reload();
            };
            self.buttons.startButton.disabled = true;
            self.buttons.startButton.onclick = function() {
                self.startGameInit();
            };
        },
        /**
         * Auto placement logic
         *
         * @param {object} cellContainingObject
         * @param {object} shipContainingObject
         */
        autoPlaceShips: function(cellContainingObject, shipContainingObject) {
            var cell,
                ship;

            if (this.autoPlacementActivated) {
                for (cell in this[cellContainingObject]) {
                    if (!this[cellContainingObject].hasOwnProperty(cell)) continue;
                    this[cellContainingObject][cell].state = 'free';
                    this[cellContainingObject][cell].occupiedBy = 'none';
                }
            }
            for (ship in this[shipContainingObject]) {
                if (!this[shipContainingObject].hasOwnProperty(ship)) continue;
                if (shipContainingObject == 'ships') {
                    this.playersBattleField.el.appendChild(this[shipContainingObject][ship].el);
                }
                this[shipContainingObject][ship].orientation = Math.floor(Math.random() * 2);
                this.getFreeCells(cellContainingObject);
                this.tryToPlaceAtRandomFreeCell(ship, cellContainingObject, shipContainingObject);
            }
        },
        /**
         * Get all free cells on Battlefield
         *
         * @param {object} cellContainingObject
         */
        getFreeCells: function(cellContainingObject) {
            var arr = [],
                c;

            for (c in this[cellContainingObject]) {
                if (!this[cellContainingObject].hasOwnProperty(c)) continue;
                if (this[cellContainingObject][c].state != 'free') continue;
                arr.push(c);
            }
            this.freeCells = arr;
        },
        /**
         * Place ship at random free cell and calculate occupied and disabled cells
         *
         * @param {object} ship
         * @param {object} cellContainingObject
         * @param {object} shipContainingObject
         */
        tryToPlaceAtRandomFreeCell: function(ship, cellContainingObject, shipContainingObject) {
            var randomFreeCell = this.freeCells[Math.floor(Math.random() * this.freeCells.length)];

            if (this[cellContainingObject][randomFreeCell]) {
                this[shipContainingObject][ship].position = {
                    row: this[cellContainingObject][randomFreeCell].row,
                    column: this[cellContainingObject][randomFreeCell].column
                };
                this[shipContainingObject][ship].occupyCells = this.getCellsOccupy(ship, cellContainingObject, shipContainingObject);
                this[shipContainingObject][ship].disableCells = this.getCellsDisable(ship, cellContainingObject, shipContainingObject);
                this.checkIfShipFits(ship, cellContainingObject, shipContainingObject);
            }
        },
        /**
         * Check if ship fits on field and does not cover other ships
         *
         * @param {object} ship
         * @param {object} cellContainingObject
         * @param {object} shipContainingObject
         */
        checkIfShipFits: function(ship, cellContainingObject, shipContainingObject) {
            var cellsToOccupy = [],
                o,
                i;

            for (o = 0; o < this[shipContainingObject][ship].occupyCells.length; o++) {
                if (!this[cellContainingObject][this[shipContainingObject][ship].occupyCells[o]]) continue;
                cellsToOccupy.push(this[shipContainingObject][ship].occupyCells[o]);
            }
            //If ship fits on field
            if (cellsToOccupy.length == this[shipContainingObject][ship].decks) {
                for (i = 0; i < this[shipContainingObject][ship].disableCells.length; i++) {
                    //If ship doesn't cover other ships
                    if (this[cellContainingObject][this[shipContainingObject][ship].disableCells[i]].state != 'occupied') continue;
                    this.tryToPlaceAgain(ship, cellContainingObject, shipContainingObject);
                    return;
                }
            } else {
                this.tryToPlaceAgain(ship, cellContainingObject, shipContainingObject);
                return;
            }
            //If each cell fits well
            this.autoPlaceThisShip(ship, cellContainingObject, shipContainingObject);
        },
        /**
         * Place a ship using auto placement
         *
         * @param {object} ship
         * @param {object} cellContainingObject
         * @param {object} shipContainingObject
         */
        autoPlaceThisShip: function(ship, cellContainingObject, shipContainingObject) {
            this.autoOccupyCells(ship, cellContainingObject, shipContainingObject);
            this.autoDisableCells(ship, cellContainingObject, shipContainingObject);
            if (shipContainingObject == 'ships') {
                this.placeShipElement(ship);
            }
            this.updateShipCoordinates(ship, shipContainingObject);
            this[shipContainingObject][ship].state = 'onField';
        },
        /**
         * Occupy cells when using auto placement
         *
         * @param {object} ship
         * @param {object} cellContainingObject
         * @param {object} shipContainingObject
         */
        autoOccupyCells: function(ship, cellContainingObject, shipContainingObject) {
            var occupyId,
                occupiedCellIdInDisabledArr;

            for (occupyId = 0; occupyId < this[shipContainingObject][ship].occupyCells.length; occupyId++) {
                this[cellContainingObject][this[shipContainingObject][ship].occupyCells[occupyId]].state = 'occupied';
                this[cellContainingObject][this[shipContainingObject][ship].occupyCells[occupyId]].occupiedBy = this[shipContainingObject][ship].name;
                occupiedCellIdInDisabledArr = this[shipContainingObject][ship].disableCells.indexOf(this[shipContainingObject][ship].occupyCells[occupyId]);
                this[shipContainingObject][ship].disableCells.splice(occupiedCellIdInDisabledArr, 1);
            }
        },
        /**
         * Disable cells when using auto placement
         *
         * @param {object} ship
         * @param {object} cellContainingObject
         * @param {object} shipContainingObject
         */
        autoDisableCells: function(ship, cellContainingObject, shipContainingObject) {
            var occupyId;

            for (occupyId = 0; occupyId < this[shipContainingObject][ship].disableCells.length; occupyId++) {
                this[cellContainingObject][this[shipContainingObject][ship].disableCells[occupyId]].state = 'disabled';
            }
        },
        /**
         * Place ship element at ship position
         *
         * @param {object} ship
         */
        placeShipElement: function(ship) {
            var shipEl = this.ships[ship].el,
                additionalWidth = this.ships[ship].decks - 1;

            shipEl.style.top = this.cells[this.ships[ship].occupyCells[0]].coordinateY - 2;
            shipEl.style.left = this.cells[this.ships[ship].occupyCells[0]].coordinateX - 2;
            if (this.ships[ship].orientation == 1) {
                this.ships[ship].el.style.width = 30;
                this.ships[ship].el.style.height = (this.ships[ship].decks * 30) + additionalWidth;
            } else {
                this.ships[ship].el.style.width = (this.ships[ship].decks * 30) + additionalWidth;
                this.ships[ship].el.style.height = 30;
            }
        },
        /**
         * If ship placement wasn't successful, try to place again
         *
         * @param {object} ship
         * @param {object} cellContainingObject
         * @param {object} shipContainingObject
         */
        tryToPlaceAgain: function(ship, cellContainingObject, shipContainingObject) {
            var shipFirstCell = 'cell' + this[shipContainingObject][ship].position.row.toString() + this[shipContainingObject][ship].position.column.toString(),
                position = this.freeCells.indexOf(shipFirstCell);

            this.freeCells.splice(position, 1);
            this.tryToPlaceAtRandomFreeCell(ship, cellContainingObject, shipContainingObject);
        },
        /**
         * Make cursor style 'move' on ship hovering
         */
        movingCursor: function(e) {
            e = e || window.event;
            var target = e.target || e.srcElement;

            target.style.cursor = 'move';
        },

        //====================== Game logic =========================
        /**
         * Game starting logic
         */
        startGameInit: function() {
            this.gameStarted = true;
            this.hideAndShowElements();
            this.removeEventsOnStart();
            this.playersBattleField.el.style.position = 'relative';
            this.recalculateShipsCoordinates();
            this.createCellsObjects(this.opponentsBattleField.el, 'oppCells');
            this.createShipsObjects('oppShip', 'oppShips');
            this.autoPlaceShips('oppCells', 'oppShips');
            this.updateLog('Game started!', 'black');
            this.getPlayersCells();
            this.makeAMove();
        },
        /**
         * Hide and show some elements on game start
         */
        hideAndShowElements: function() {
            var i;

            for (i = 0; i < this.gameDOMElements.hideElements.length; i++) {
                this.gameDOMElements.hideElements[i].style.display = 'none';
            }
            for (i = 0; i < this.gameDOMElements.showElements.length; i++) {
                this.gameDOMElements.showElements[i].style.display = 'block';
            }
        },
        /**
         * Remove events on game start
         */
        removeEventsOnStart: function() {
            var ship;

            for (ship in this.ships) {
                if (!this.ships.hasOwnProperty(ship)) continue;
                Helper.removeEvent(this.ships[ship].el, 'mousedown', this.dragShipInit);
                Helper.removeEvent(this.ships[ship].el, 'mouseover', this.movingCursor);
                this.ships[ship].el.style.cursor = 'default';
            }
        },
        /**
         * Place ships in new coordinates after some elements were removed and added
         */
        recalculateShipsCoordinates: function() {
            var ship,
                cellToStick,
                cellToStickCoordinates;

            for (ship in this.ships) {
                if (!this.ships.hasOwnProperty(ship)) continue;
                cellToStick = 'cell' + this.ships[ship].position.row + this.ships[ship].position.column.toString();
                cellToStickCoordinates = {
                    top: this.cells[cellToStick].el.offsetTop,
                    left: this.cells[cellToStick].el.offsetLeft
                };
                this.ships[ship].el.style.top = cellToStickCoordinates.top - 2;
                this.ships[ship].el.style.left = cellToStickCoordinates.left - 2;
                this.ships[ship].coordinateY = this.ships[ship].el.offsetTop;
                this.ships[ship].coordinateX = this.ships[ship].el.offsetLeft;
            }
        },
        /**
         * Make an array of player's cells
         */
        getPlayersCells: function() {
            for (var cell in this.cells) {
                if (!this.cells.hasOwnProperty(cell)) continue;
                this.playersCells.push(cell);
            }
        },
        /**
         * Main game logic: making a move
         */
        makeAMove: function() {
            var self = this,
                randomPlayersCell;

            if (this.myTurn) {
                this.updateCta('It\'s your turn', 'black');
                this.gameDOMElements.disabler.style.display = 'none';
                this.letPlayerTakeAShot();
            } else {
                this.updateCta('It\'s your opponent\'s turn', 'black');
                this.gameDOMElements.disabler.style.display = 'block';
                //Timeout is set for adequacy of gaming experience
                function opponentsTurn() {
                    if (!self.shootingHelper) {
                        randomPlayersCell = self.playersCells[Math.floor(Math.random() * self.playersCells.length)];
                        self.shootCell(self.cells[randomPlayersCell]);
                    } else {
                        self.finishShip();
                    }
                }
                setTimeout(opponentsTurn, 500);
            }
        },
        /**
         * Let player take a shot
         */
        letPlayerTakeAShot: function() {
            var self = this,
                cell;

            for (cell in this.oppCells) {
                if (!this.oppCells.hasOwnProperty(cell)) continue;
                (function(cell) {
                    self.oppCells[cell].el.onmouseover = function() {
                        this.style.backgroundColor = 'rgba(255,71,71,0.5)';
                    };
                    self.oppCells[cell].el.onmouseout = function() {
                        self.oppCells[cell].el.style.backgroundColor = '#fff';
                    };
                    self.oppCells[cell].el.onclick = function() {
                        if (self.oppCells[cell].state != 'missed' && self.oppCells[cell].state != 'shot') {
                            self.shootCell(self.oppCells[cell]);
                        }
                    }
                })(cell);
            }
        },
        /**
         * When a cell is shot
         *
         * @param {object} cell
         */
        shootCell: function(cell) {
            var playerName;
            if (cell.state != 'shot' || cell.state != 'missed') {
                if (cell.state == 'occupied') {
                    cell.state = 'shot';
                    cell.el.className = cell.el.className + ' shot';
                    this.checkPlayersCellAsShot(cell);
                    this.shootingHelperCells = [];
                    this.shootShip(cell);
                } else {
                    cell.state = 'missed';
                    cell.el.className = cell.el.className + ' missed';
                    playerName = (this.myTurn) ? 'You' : 'Your opponent';
                    this.updateLog(playerName + ' missed', 'black');
                    this.checkPlayersCellAsShot(cell);
                    this.myTurn = !this.myTurn;
                    this.makeAMove();
                }
            }
            this.shootingHelperCells.splice(this.shootingHelperCells.indexOf('cell' + cell.row + cell.column));
        },
        /**
         * Remove a cell from playersCells
         *
         * @param {object} cell
         */
        checkPlayersCellAsShot: function(cell) {
            var cellToSplice;

            if (!this.myTurn) {
                cellToSplice = 'cell' + cell.row + cell.column.toString();
                this.playersCells.splice(this.playersCells.indexOf(cellToSplice), 1);
            }
        },
        /**
         * Ship-shooting logic
         *
         * @param {object} cell
         */
        shootShip: function(cell) {
            var ship = cell.occupiedBy,
                cellContainingObject,
                shipContainingObject,
                i,
                c,
                playerName,
                messageColor;

            if (this.myTurn) {
                playerName = 'You';
                messageColor = 'green';
            } else {
                playerName = 'Your opponent';
                messageColor = 'red';
            }
            if (this.myTurn) {
                cellContainingObject = 'oppCells';
                shipContainingObject = 'oppShips';
            } else {
                cellContainingObject = 'cells';
                shipContainingObject = 'ships';
            }
            for (i = 0, c = 0; i < this[shipContainingObject][ship].occupyCells.length; i++) {
                if (this[cellContainingObject][this[shipContainingObject][ship].occupyCells[i]].state != 'shot') continue;
                c++;
            }
            if (c == this[shipContainingObject][ship].occupyCells.length) {
                this.destroyShip(ship, cellContainingObject, shipContainingObject);
            } else {
                this.updateLog(playerName + ' shot a ship! ' + playerName + ' can shoot again.', messageColor);
                if (!this.myTurn) {
                    this.shootingHelper = ship;
                }
                this.makeAMove();
            }
        },
        /**
         * Destroy a ship
         *
         * @param {object} ship
         * @param {object} cellContainingObject
         * @param {object} shipContainingObject
         */
        destroyShip: function(ship, cellContainingObject, shipContainingObject) {
            var shipDecks = this[shipContainingObject][ship].decks,
                shipsLeft;

            this[shipContainingObject][ship].el.className = this[shipContainingObject][ship].el.className + ' destroyed';
            if (shipContainingObject == 'oppShips') {
                this.placeOpponentsDestroyedShip(ship, shipContainingObject);
                this.oppShipsLeft = this.oppShipsLeft - 1;
                shipsLeft = this.oppShipsLeft;
            } else {
                this.shipsLeft = this.shipsLeft - 1;
                shipsLeft = this.shipsLeft;
            }
            if (!this.myTurn) {
                this.shootingHelper = null;
            }
            this.shootCellsAroundDestroyedShip(ship, cellContainingObject, shipContainingObject);
            this.checkIfGameEnded(shipDecks, shipsLeft);
        },
        /**
         * Finish shooting a shot ship
         */
        finishShip: function() {
            var ship = this.shootingHelper,
                i,
                shotCellsInShip = [],
                cellsToCheck = [],
                cellToCheckTop,
                cellToCheckBottom,
                cellToCheckLeft,
                cellToCheckRight,
                cellToShootName;

            for (i = 0; i < this.ships[ship].occupyCells.length; i++) {
                if (this.cells[this.ships[ship].occupyCells[i]].state != 'shot') continue;
                shotCellsInShip.push(this.cells[this.ships[ship].occupyCells[i]]);
            }
            cellToCheckTop = 'cell' + (shotCellsInShip[0].row - 1) + shotCellsInShip[0].column.toString();
            cellToCheckLeft = 'cell' + shotCellsInShip[0].row + (shotCellsInShip[0].column - 1).toString();
            // If only one cell in ship is shot, try cells in four directions
            if (shotCellsInShip.length == 1) {
                if (this.cells[cellToCheckTop] && this.cells[cellToCheckTop].state != 'missed') {
                    cellsToCheck.push(cellToCheckTop);
                }
                cellToCheckBottom = 'cell' + (shotCellsInShip[0].row + 1) + shotCellsInShip[0].column.toString();
                if (this.cells[cellToCheckBottom] && this.cells[cellToCheckBottom].state != 'missed') {
                    cellsToCheck.push(cellToCheckBottom);
                }
                if (this.cells[cellToCheckLeft] && this.cells[cellToCheckLeft].state != 'missed') {
                    cellsToCheck.push(cellToCheckLeft);
                }
                cellToCheckRight = 'cell' + shotCellsInShip[0].row + (shotCellsInShip[0].column + 1).toString();
                if (this.cells[cellToCheckRight] && this.cells[cellToCheckRight].state != 'missed') {
                    cellsToCheck.push(cellToCheckRight);
                }
                this.checkCellToShoot(cellsToCheck, shotCellsInShip);
            } else {
                // If more than one cell is shot in ship, try only two directions
                if (shotCellsInShip[0].row == shotCellsInShip[1].row) {
                    if (this.cells[cellToCheckLeft] && this.cells[cellToCheckLeft].state != 'missed') {
                        cellsToCheck.push(cellToCheckLeft);
                    }
                    cellToCheckRight = 'cell' + shotCellsInShip[0].row + (shotCellsInShip[shotCellsInShip.length - 1].column + 1).toString();
                    if (this.cells[cellToCheckRight] && this.cells[cellToCheckRight].state != 'missed') {
                        cellsToCheck.push(cellToCheckRight);
                    }
                    this.checkCellToShoot(cellsToCheck, shotCellsInShip);
                } else {
                    if (this.cells[cellToCheckTop] && this.cells[cellToCheckTop].state != 'missed') {
                        cellsToCheck.push(cellToCheckTop);
                    }
                    cellToCheckBottom = 'cell' + (shotCellsInShip[shotCellsInShip.length - 1].row + 1) + (shotCellsInShip[0].column).toString();
                    if (this.cells[cellToCheckBottom] && this.cells[cellToCheckBottom].state != 'missed') {
                        cellsToCheck.push(cellToCheckBottom);
                    }
                    this.checkCellToShoot(cellsToCheck, shotCellsInShip);
                }
            }
            cellToShootName = this.shootingHelperCells[Math.floor(Math.random() * this.shootingHelperCells.length)];
            this.shootCell(this.cells[cellToShootName]);
        },
        /**
         * Check cells to be valid to try to shoot
         *
         * @param {object} cellsToCheck
         * @param {object} shotCellsInShip
         */
        checkCellToShoot: function(cellsToCheck, shotCellsInShip) {
            var thisCellRow,
                thisCellColumn,
                cellIsValid,
                rowToCheck,
                columnToCheck,
                c;
            for (c = 0; c < cellsToCheck.length; c++) {
                thisCellRow = this.cells[cellsToCheck[c]].row;
                thisCellColumn = this.cells[cellsToCheck[c]].column;
                cellIsValid = (0 <= thisCellRow && thisCellRow < 10 && 0 <= thisCellColumn && thisCellColumn < 10 && this.cells[cellsToCheck[c]].state != 'missed');
                if (this.cells[cellsToCheck[c]].row < shotCellsInShip[0].row) {
                    rowToCheck = this.cells[cellsToCheck[c]].row - 1;
                    columnToCheck = this.cells[cellsToCheck[c]].column - 1;
                    if (cellIsValid) {
                        this.checkCellsAroundNotToBeShot(cellsToCheck[c], rowToCheck, columnToCheck, 'vertical');
                    }
                } else if (this.cells[cellsToCheck[c]].row > shotCellsInShip[0].row) {
                    rowToCheck = this.cells[cellsToCheck[c]].row + 1;
                    columnToCheck = this.cells[cellsToCheck[c]].column - 1;
                    if (cellIsValid) {
                        this.checkCellsAroundNotToBeShot(cellsToCheck[c], rowToCheck, columnToCheck, 'vertical');
                    }
                } else if (this.cells[cellsToCheck[c]].column < shotCellsInShip[0].column) {
                    rowToCheck = this.cells[cellsToCheck[c]].row - 1;
                    columnToCheck = this.cells[cellsToCheck[c]].column - 1;
                    if (cellIsValid) {
                        this.checkCellsAroundNotToBeShot(cellsToCheck[c], rowToCheck, columnToCheck, 'horizontal');
                    }
                } else {
                    rowToCheck = this.cells[cellsToCheck[c]].row - 1;
                    columnToCheck = this.cells[cellsToCheck[c]].column + 1;
                    if (cellIsValid) {
                        this.checkCellsAroundNotToBeShot(cellsToCheck[c], rowToCheck, columnToCheck, 'horizontal');
                    }
                }
            }
        },
        /**
         * Check cells around checked cell not to be shot
         *
         * @param {object} cell
         * @param {number} rowToCheck
         * @param {number} columnToCheck
         * @param {string} direction
         */
        checkCellsAroundNotToBeShot: function(cell, rowToCheck, columnToCheck, direction) {
            var self = this,
                cellsToCheckNumber,
                cellToCheck,
                cellsToSkip,
                d;

            if (direction == 'vertical') {
                for (cellsToCheckNumber = 0, cellsToSkip = 0, d = columnToCheck; d <= columnToCheck + 2; d++) {
                    if (0 <= d && d < 10 && 0 <= rowToCheck && rowToCheck < 10) {
                        cellToCheck = 'cell' + rowToCheck.toString() + d;
                        if (self.cells[cellToCheck].state != 'shot') {
                            cellsToCheckNumber++;
                        }
                    } else {
                        cellsToSkip++;
                    }
                }
            } else {
                for (cellsToCheckNumber = 0, cellsToSkip = 0, d = rowToCheck; d <= rowToCheck + 2; d++) {
                    if (0 <= d && d < 10 && 0 <= columnToCheck && columnToCheck < 10) {
                        cellToCheck = 'cell' + d + columnToCheck.toString();
                        if (self.cells[cellToCheck].state != 'shot') {
                            cellsToCheckNumber++;
                        }
                    } else {
                        cellsToSkip++;
                    }
                }
            }
            if ((cellsToCheckNumber + cellsToSkip) == 3) {
                this.shootingHelperCells.push(cell);
            }
        },
        /**
         * Place opponent's destroyed ship's element on field
         *
         * @param {object} ship
         * @param {object} shipContainingObject
         */
        placeOpponentsDestroyedShip: function(ship, shipContainingObject) {
            var cellToStick = 'cell' + this[shipContainingObject][ship].position.row + this[shipContainingObject][ship].position.column.toString(),
                cellToStickCoordinates,
                widthToHeight,
                heightToWidth;

            cellToStickCoordinates = {
                top: this.oppCells[cellToStick].el.offsetTop,
                left: this.oppCells[cellToStick].el.offsetLeft
            };
            this.oppShips[ship].el.style.top = cellToStickCoordinates.top - 2;
            this.oppShips[ship].el.style.left = cellToStickCoordinates.left - 2;
            if (this.oppShips[ship].orientation == 1) {
                widthToHeight = this.oppShips[ship].el.offsetWidth - 4;
                heightToWidth = this.oppShips[ship].el.offsetHeight - 4;
                this.oppShips[ship].el.style.width = heightToWidth;
                this.oppShips[ship].el.style.height = widthToHeight;
            }
        },
        /**
         * Check cells around destroyed ship as shot
         *
         * @param {object} ship
         * @param {object} cellContainingObject
         * @param {object} shipContainingObject
         */
        shootCellsAroundDestroyedShip: function(ship, cellContainingObject, shipContainingObject) {
            var i,
                cellToShoot,
                cellToShootName;

            for (i = 0; i < this[shipContainingObject][ship].disableCells.length; i++) {
                cellToShoot = this[cellContainingObject][this[shipContainingObject][ship].disableCells[i]];
                cellToShoot.state = 'missed';
                cellToShoot.el.className = cellToShoot.el.className + ' missed';
                if (this.myTurn) continue;
                cellToShootName = 'cell' + cellToShoot.row + cellToShoot.column.toString();
                if (this.playersCells.indexOf(cellToShootName) > -1) {
                    this.playersCells.splice(this.playersCells.indexOf(cellToShootName), 1);
                }
            }
        },
        /**
         * Check if anybody won
         *
         * @param {object} shipDecks
         * @param {object} shipsLeft
         */
        checkIfGameEnded: function(shipDecks, shipsLeft) {
            var playerName,
                messageColor;

            if (this.myTurn) {
                playerName = 'You';
                messageColor = 'green';
            } else {
                playerName = 'Your opponent';
                messageColor = 'red';
            }
            if (!this.oppShipsLeft) {
                this.updateLog(playerName + ' destroyed a ' + shipDecks + '-decked ship! It was the last one.', messageColor);
                this.updateLog('<strong>Congratulations! You\'ve won!</strong>', 'green');
                this.updateCta('<strong>Congratulations! You\'ve won!</strong>', 'green');
                this.endGame();
            } else if (!this.shipsLeft) {
                this.updateLog(playerName + ' destroyed a ' + shipDecks + '-decked ship! It was the last one.', messageColor);
                this.updateLog('<strong>What a pity, your Opponent has won!</strong>', 'red');
                this.updateCta('<strong>Your Opponent has won!</strong>', 'red');
                this.endGame();
            } else {
                this.updateLog(playerName + ' destroyed a ' + shipDecks + '-decked ship! ' + shipsLeft + ' ship(s) left. ' + playerName + ' can shoot again.', messageColor);
                this.makeAMove();
            }
        },
        /**
         * End game logic
         */
        endGame: function() {
            this.gameDOMElements.disabler.style.display = 'block';
            this.buttons.playAgainButton.style.display = 'block';
            this.buttons.playAgainButton.onclick = function() {
                location.reload();
            };
        },
        /**
         * Update CTA block with provided text
         */
        updateCta: function(text, color) {
            this.gameDOMElements.cta.innerHTML = text;
            this.gameDOMElements.cta.style.color = color;
        },
        /**
         * Update log with provided text
         *
         * @param {string} text
         * @param {string} color
         */
        updateLog: function(text, color) {
            var date = new Date(),
                hours = date.getHours(),
                minutes = date.getMinutes(),
                seconds = date.getSeconds(),
                newTime = document.createElement('span'),
                newMessage = document.createElement('span');

            this.gameDOMElements.log.appendChild(newTime);
            newTime.innerHTML = hours + ':' + minutes + ':' + seconds + ': ';
            newMessage.innerHTML = text;
            newTime.appendChild(newMessage);
            newMessage.style.color = color;
            this.gameDOMElements.log.scrollTop = this.gameDOMElements.log.scrollHeight;
        },
        //==================== EO Game Logic ========================

        /**
         * Initialize SeaBattle logic
         */
        init: function() {
            var ship;

            this.createCellsObjects(this.playersBattleField.el, 'cells');
            this.createShipsObjects('ship', 'ships');
            this.setBattlefieldOffsets();
            this.buttonsSetInit();
            for (ship in this.ships) {
                if (!this.ships.hasOwnProperty(ship)) continue;
                Helper.addEvent(this.ships[ship].el, 'mousedown', this.dragShipInit);
                Helper.addEvent(this.ships[ship].el, 'mouseover', this.movingCursor);
            }
        }
    };
})();

SeaBattle.init();
