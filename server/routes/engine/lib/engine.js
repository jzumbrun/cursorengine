// Requires
const fs = require('fs'),
    path = require('path'),
    cloneDeep = require('lodash/cloneDeep'),
    forEach = require('lodash/forEach'),
    parser = require('./parser.js')

/**
 * Engine
 *
 * Loads active game into memory if it can find one
 *   for the user, otherwise it lists available games
 * Take the parser commands and feeds them throught the rom
 *   actions or through the engine actions
 *
 * Always returns a string for the main run method
 *
 * API:
 *
 * setCommand(String)
 * setPlayerId(String)
 * run()
 *
 */
module.exports = class Engine {

    constructor(){

        // ========= MUTABLE =========

        // The active player's info
        // This object IS MUTABLE
        // This will be a reference in the saved players list
        this._player = null

        // The live game data
        // This object IS MUTABLE
        this._game = null

        // ========= IMMUTABLE =========

        // The saved game data
        // Once this object is "filled", it will be frozen
        this._save = null

        // The original source of the game
        // Once this object is "filled", it will be frozen
        this._rom = null

        // The textual command we will be using to drive actions
        // Once this object is "filled", it will be frozen
        this._command = null

    }

    // ========= PUBLIC =========

    /**
     * Set Command
     *
     * @param {string} text
     * @return void
     */
    setCommand(text){
        // Once set, do not change it!
        if(this._command === null){
            var command = parser.parse(text)
            // Make it immutable!
            Object.freeze(command)
            this._command = command
        }
    }

    /**
     * Set Player
     *
     * @param {string} id
     * @param {string} name
     * @return void
     */
    setPlayer(id, name){
        this._player = {
            id: id,
            name: name
        }
    }

    // ========= PRIVATE =========

    /**
     * Set Rom
     * @param {object} name
     */
    _setRom(name){
        // Once set, do not change it!
        if(this._rom === null){

            try {
                // Load the active game from the player data
                if(name === undefined){
                    name = require(`./saves/${this._player.id}.json`).active_game
                }
                var rom = {
                    actions: require(`./roms/${name}/actions.js`),
                    info: require(`./roms/${name}/info.json`),
                    items: require(`./roms/${name}/items.json`),
                    map: require(`./roms/${name}/map.json`),
                    player: require(`./roms/${name}/player.json`),
                }

                // Make it immutable!
                Object.freeze(rom)
                this._rom = rom
            } catch(setRomError){
                // Do nothing
            }
            
        }
    }

    /**
     * Set Save
     * @param {object} name
     */
    _setSave(name){
        // Once set, do not change it!
        if(this._save === null){

            try{
                // Load the saved game
                var save = require(`./saves/.${name}.json`)

                // Make it immutable!
                Object.freeze(save)
                this._save = save
            } catch(errorSetSave){
                // do nothing
            }
        }
    }

    /**
     * Set Game
     * @param {object} game
     */
    _setGame(){

        // Merge from save
        if(this._save){
            this._game = deepClone(this._save)
            // See if the player is in the game; add them if not
            if(!this._save.players[this._player.id]){
                this._game.players = this._mergePlayerOntoSavedPlayers()
            }
            // Update the player from the saved player
            else{
                this._mergeSavedPlayerOntoPlayer()
            }
        }
        // Merge from rom
        else {
            var players = {}
            players[this._player.id] = this._mergeRomPlayerOntoPlayer()
            this._game = {
                players: players,
                map: this._getSavableMapFromRom()
            }
        }

    }

    /**
     * Merge Player on to Saved Player
     * Let player reference be the same as the one
     * in the saved players list
     * 
     * @return {object}
     */
    _mergeSavedPlayerOntoPlayer(){
        // Keep this as a reference
        this._player = this._save.players[this._player.id]
    }

    /**
     * Merge Player on to Saved Player
     * @return {object}
     */
    _mergePlayerOntoSavedPlayers(){
        // List of players from the save
        var players = cloneDeep(this._save.players)
        
        // Add player object on to save players list
        players[this._player.id] = this._mergeRomPlayerOntoPlayer()

        return players
    }

    /**
     * Merge Rom Player on to Player
     * @return {object}
     */
    _mergeRomPlayerOntoPlayer(){
        // Copy of rom player object
        var player = cloneDeep(this._rom.player)

        // Add player details to rom player object
        player.id = this._player.id
        player.name = this._player.name

        // Update the player's data
        this._player = player

        return player
    }

    /**
     * Get Savable From Map
     * 
     * @return {object}
     */
    _getSavableMapFromRom(){
        // Savable map
        var savable_map = {},
            // Copy of rom map object
            map = cloneDeep(this._rom.map)

        // Now we only want the data that can be mutated,
        // for example items in rooms. Title, description, ect,
        // can be access from the rom. This makes the
        // saved object much smaller
        forEach(map, (room, name) => {
            savable_map[name] = {items: room.items}
        })

        return savable_map
    }

    /**
     * List Roms
     * @return {string}
     */
    _listRoms(){

        var roms = fs.readdirSync(path.resolve(__dirname) + '/roms/').filter((dir) => {
            return dir && dir[0] != '.'
        })

        if (roms.length === 0){
            return 'No roms found.'
        }

        var roms_formated = 'Available Roms: \n'
        forEach(roms, (rom, i) => {
            roms_formated = roms_formated.concat(`load ${rom}`)
            if(i < roms.length - 1){
                roms_formated = roms_formated.concat('\n')
            }
        })
        return roms_formated
    }

    /**
     * Load Rom
     * 
     * @return {string}
     */
    _loadRom(){
        if (!this._command.subject) return "Specify game to load."

        this._setRom(this._command.subject)
        // See if we have a valid rom
        if(this._rom){
            this._setSave()
            this._setGame()
            this._saveGame()
            
            // Save the active rom for the user
            fs.writeFileSync(`${path.resolve(__dirname)}/saves/${this._player.id}.json`, JSON.stringify({active_game: this._command.subject}))

            return this._rom.info.intro_text + '\n' + this._getLocationDescription()
        }
        
        return "Could not load " + this._command.subject

    }

    _saveGame(){
        // Save the player data
        fs.writeFileSync(`${path.resolve(__dirname)}/saves/${this._rom.info.name}.json`, JSON.stringify(this._game))
    }

    // ======= Helpers =======

    /**
     * Check For Game End
     * @param {string} return_string 
     */
    _checkForGameEnd(return_string){
        if(this._player.game_over){
        return_string = return_string + '\n' + game.outro_text
            this._dieAction()
        }
        return return_string
    }

    _engineInterface(game, command){
        return actions[command.action](game, command)
    }

    _exitsToString(exits){
        var return_string = ''

        if(Object.keys(exits).length === 0) return ''

        var visible_exits = []
        forEach(exits, (exit) => {
            if(!exit.hidden){
                visible_exits.push(exit.display_name)
            }
        })

        return_string = ' Exits are '
        if(visible_exits.length === 0){
            return ''
        }

        if(visible_exits.length === 1){
            return_string = ' Exit is '
        }

        // Concat all the exits together
        forEach(visible_exits, (exit, i) => {
            return_string = return_string.concat(exit)
            if(i === visible_exits.length - 2){
                return_string = return_string.concat(' and ')
            } else if (i === visible_exits.length - 1){
                return_string = return_string.concat('.')
            } else {
                return_string = return_string.concat(', ')
            }
        })

        return return_string
    }

    /**
     * Get Current Location
     * @return {object}
     */
    _getCurrentLocation(){
        return this._rom.map[this._player.current_location]
    }

    /**
     * Get Player Map Visits
     * 
     * @param {string} location 
     * @return {integer}
     */
    _getPlayerMapVisits(location){
        try{
            return this._player.map[location].visits
        } catch(playerMapVisitsError){
            return 0
        }
    }

    /**
     * Get Location Description
     * 
     * @param {boolean} force_long_description 
     * @return {string}
     */
    _getLocationDescription(force_long_description){
        var current_location = this._getCurrentLocation(),
            description = ''

        if(this._getPlayerMapVisits(this._player.current_location) == 0 || force_long_description){
            description = current_location.description

            // List the items
            if(current_location.items){
                description = description.concat(this._itemsToString(current_location.items))
            }
            // List the exits
            if(current_location.exits){
                description = description.concat(this._exitsToString(current_location.exits))
            }
        }
        // Just list the name since we have been here before 
        else {
            description = current_location.display_name
        }

        // Prepend image
        if(current_location.image){
            description = `{[${current_location.image}]} ${description}`
        }

        return description
    }

    _getItem(itemLocation, itemName){
        return itemLocation[this._getItemName(itemLocation, itemName)]
    }

    _getItemName(itemLocation, itemName){
        if(itemLocation[itemName] !== undefined) {
            return itemName
        } else {
            for(let item in itemLocation){
                if(itemLocation[item].displayName.toLowerCase() === itemName){
                    return item
                }
            }
        }
    }

    /**
     * Get Item Limit Quantity
     * @param {object} item
     * @return {integer}
     */
    _getItemLimitQuantity(item){
        var quantity = item.quantity
        // Limit trumps quantity; -1 is Infinite
        if((item.quantity > item.limit === -1 || item.quantity > item.limit) && item.limit > -1 ){
            quantity = item.limit
        }

        return quantity
    }

    /**
     * Items To String
     * @param {object} items 
     * @return {string}
     */
    _itemsToString(items){
        var return_string = ''

        if(!Object.keys(items).length) return ''

        // Get Visible items
        var visible_items = []
        forEach(items, (item, name) => {
            let rom_item = this._rom.items[name]
            if(!rom_item.hidden){
                visible_items.push({name: rom_item.display_name, quantity: item.quantity, limit: item.limit})
            }
        })

        // No visible item; we are done
        if(!visible_items.length) return ''

        // Set string for visible items concat
        return_string = ' There are '
        if(visible_items[0].quantity === 1){
            return_string = ' There is '
        }

        forEach(visible_items, (item, i) => {
            // Get real item quantity
            let quantity = this._getItemLimitQuantity(item)

            // Got many
            if(quantity > 1){
                return_string = return_string.concat(`${quantity} ${item.name}s`)
            }
            // Got only 1
            else if(quantity === 1){
                return_string = return_string.concat(`a ${item.name}`)
            }
            // Got unlimited
            else if(quantity === -1){
                return_string = return_string.concat(`Unlimited ${item.name}s`)
            }

            if(i === visible_items.length - 2){
                return_string = return_string.concat(' and ')
            } else if (i === visible_items.length - 1){
                return_string = return_string.concat(' here.')
            } else {
                return_string = return_string.concat(', ')
            }
        })
        return return_string
    }

    _interact(interaction, subject){
        try{
            return this._getCurrentLocation().items[subject].interactions[interaction]
        } catch(error) {
            return this._getCurrentLocation().interactables[subject][interaction]
        }
    }

    _moveItem(action, itemName, startLocation, endLocation){
        var itemName = this._getItemName(startLocation, itemName)
        var itemAtOrigin = this._getItem(startLocation, itemName)

        if(itemAtOrigin === undefined){
            throw 'itemDoesNotExist'
        }

        var itemAtDestination = this._getItem(endLocation, itemName)

        if(itemAtDestination === undefined) {
            endLocation[itemName] = {}
            endLocation[itemName].quantity = 1
        } else {
            ++endLocation[itemName].quantity
        }

        if (itemAtOrigin.hasOwnProperty('quantity')){
            --itemAtOrigin.quantity

            // Remove item from the player if none left
            if(itemAtOrigin.quantity && action == 'drop'){
                delete startLocation[itemName]
            }
        }

    }

    // ======= Actions =======

    _dieAction(){
        delete this._game.players[this._player.id]
        return 'You are dead'
    }

    _dropAction(){
        if(!command.subject){
            return 'What do you want to drop?'
        }
        try{
            return this._interact('drop', command.subject)
        } catch(error) {
            try {
                var current_location = this._getCurrentLocation()
                this._moveItem('drop', command.subject, game.player.inventory, current_location.items)
                var item = this._getItem(current_location.items, command.subject)
                return command.subject + ' dropped'
            } catch(error2){
                return `You do not have a ${command.subject} to drop.`
            }
        }
    }

    _goAction(){
        if(!command.subject){
            return 'Where do you want to go?'
        }
        var exits = this._getCurrentLocation().exits
        var player_destination = null
        try {
            player_destination = exits[command.subject].destination
        } catch (error) {
            for(let exit in exits){
                let exitObject = exits[exit]
                if(exitObject.displayName.toLowerCase() === command.subject){
                    player_destination = exitObject.destination
                }
            }
        }
        if(player_destination === null){
            return 'You can\'t go there.'
        }

        if(!this._player.map[player_destination]){
            this._player.map[player_destination] = {visits: 1}
        }
        else{
            this._player.map[player_destination].visits++
        }

        if (this._getCurrentLocation().teardown !== undefined){
            this._getCurrentLocation().teardown()
        }
        if (this._rom.actions['endAction']){
            this._rom.actions['endAction']()
        }
        this._player.current_location = player_destination
        return this._getLocationDescription()
    }

    _inventoryAction(){
        var inventoryList = 'Your inventory contains:'
        for (var item in game.player.inventory){
            var itemObject = game.player.inventory[item]
            var itemName = itemObject.displayName
            if(itemObject.quantity > 1){
                itemName = itemName.concat(' x'+itemObject.quantity)
            }
            inventoryList = inventoryList.concat('\n'+itemName)
        }
        if (inventoryList === 'Your inventory contains:'){
            return 'Your inventory is empty.'
        } else {
            return inventoryList
        }
    }

    _lookAction(){
        if(!this._command.subject){
            return this._getLocationDescription(true)
        }
        try {
            try {
                var item = this._getItem(this._player.inventory, this._command.subject),
                    description = item.description
                if(item.image){
                    description = `{[${item.image}]} ${description}`
                }
                return description
            } catch (itemNotInInventoryError){
                var item = this._getItem(this._getCurrentLocation().items, this._command.subject),
                    description = item.description
                if(item.image){
                    description = `{[${item.image}]} ${description}`
                }
                return description
            }
        } catch(isNotAnItemError) {
            try {
                return this._interact('look', this._command.subject)
            } catch(subjectNotFound
                ) {
                return `There is nothing important about the ${command.subject}.`
            }
        }
    }

    _takeAction(){
        if(!command.subject){
            return 'What do you want to take?'
        }
        try{
            return this._interact(game, 'take', command.subject)
        } catch(takeInteractError) {
            try {
                this._moveItem('take', command.subject, this._getCurrentLocation().items, game.player.inventory)
                return command.subject + ' taken'
            } catch(takeMoveItemError){
                return 'Best just to leave the ' + command.subject + ' as it is.'
            }
        }
    }

    _useAction(){
        if(!command.subject){
            return 'What would you like to use?'
        }
        try {
            return this._getItem(game.player.inventory, command.subject).use()
        } catch (itemNotInInventoryError) {
            return 'Can\'t do that.'
        }
    }

    /**
     * Run
     *
     * @return String
     */
    run(){

        if(this._command.action === 'load'){
            return_string = this._loadRom()
        }
        else{

            // Continue a saved game
            this._setRom()
            if(this._rom){
                this._setSave()
                this._setGame()

                // Increment the players commant count
                this._game.players[this._player.id].command_counter++
                var player = this._game.players[this._player.id],
                    method = `_${this._command.action}Action`,
                    return_string = ''

                // Try the rom actions first
                if(this._rom[method]){
                    return_string = this._rom[method](player, this._game, this._rom, this._engineInterface)
                }
                // Then try the engine actions
                else if(this[method]){
                    return_string = this[method]()
                }
                // Then let the user know they suck at typing the things
                else{
                    return_string = this._interact(command.action, command.subject)
                }

                if(return_string === undefined){
                    return_string = "I don't know how to do that."
                } else {
                    let location_string = this._getCurrentLocation().description
                    if(location_string) return_string = location_string
                }

                // Check to see if the player is dead
                return_string = this._checkForGameEnd(return_string)

                this._saveGame()
            }
            // We have no valid rom
            else {
                return_string = this._listRoms()
            }
        }

        return return_string
    }

}