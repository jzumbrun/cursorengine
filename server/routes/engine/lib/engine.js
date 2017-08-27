// Requires
const fs = require('fs'),
    path = require('path'),
    isObject = require('lodash/isObject'),
    cloneDeep = require('lodash/cloneDeep'),
    forEach = require('lodash/forEach'),
    upperFirst = require('lodash/upperFirst'),
    config = require('../../../config'),
    parser = require('./parser.js')

/**
 * Engine
 *
 * Loads active game into memory if it can find one
 *   for the user, otherwise it lists available games
 * Take the parser commands and feeds them throught the rom
 *   hooks or through the engine hooks
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
        // this._player IS A REFERENCE to this._game.players[this._player.id]
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

        // The textual command we will be using to drive hooks
        // Once this object is "filled", it will be frozen
        this._command = null

        // The final response object
        this._response = {
            message: 'I don\'t know how to do that.'
        }

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

    /**
     * Get Response
     *
     * @return {object}
     */
    getResponse(){
        return this._response
    }

    // ========= PRIVATE =========

    /**
     * Log
     */
    _log(data){
        if(config.log) console.log(data)
    }

    /**
     * Set Response Message
     * @param {string} string 
     * @return void
     */
    _setResponseMessage(string){
        this._response.message = string
    }

    /**
     * Dequire
     * 
     * require an non-cached file
     * @params {string} module
     * @return mixed
     */
    _dequire(module){
        delete require.cache[require.resolve(module)]
        return require(module)
    }

    /**
     * Set Rom
     * @param {object} name
     */
    _setRom(name){
        this._log('_setRom')
        // Once set, do not change it!
        if(this._rom === null){

            try {
                // Load the active game from the player data
                if(name === undefined){
                    name = this._dequire(`./saves/${this._player.id}.json`).active_game
                }
                var rom = {
                    hooks: require(`./roms/${name}/hooks.js`),
                    info: require(`./roms/${name}/info.json`),
                    items: require(`./roms/${name}/items.json`),
                    map: require(`./roms/${name}/map.json`),
                    player: require(`./roms/${name}/player.json`),
                }

                // Make it immutable!
                Object.freeze(rom)
                this._rom = rom
            } catch(error){
                this._log(error)
                // Do nothing
            }
            
        }
    }

    /**
     * Set Save
     */
    _setSave(){
        this._log('_setSave')
        // Once set, do not change it!
        if(this._save === null){

            try{
                // Load the saved game
                var save = this._dequire(`./saves/${this._rom.info.name}.json`)

                // Make it immutable!
                Object.freeze(save)
                this._save = save
            } catch(error){
                this._log(error)
            }
        }
    }

    /**
     * Set Game
     * @param {object} game
     */
    _setGame(){
        this._log('_setGame')
        // Merge from save
        if(this._save){
            this._game = cloneDeep(this._save)
            // See if the player is in the game; add them if not
            if(!this._save.players[this._player.id]){
                 this._mergePlayerOntoSavedPlayers()
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

        // Make quick reference to the room players
        this._setRoomPlayers()

    }

    /**
     * Merge Player on to Saved Player
     * Let player reference be the same as the one
     * in the saved players list
     * 
     * @return {object}
     */
    _mergeSavedPlayerOntoPlayer(){
        this._log('_mergeSavedPlayerOntoPlayer')
        // Keep this as a reference
        this._player = cloneDeep(this._save.players[this._player.id])
        // Maintain the player to game player reference
        this._game.players[this._player.id] = this._player
    }

    /**
     * Merge Player on to Saved Player
     * @return {object}
     */
    _mergePlayerOntoSavedPlayers(){
        this._log('_mergePlayerOntoSavedPlayers')
        // List of players from the save
        var players = cloneDeep(this._save.players)
        
        // Add player object on to save players list
        players[this._player.id] = this._mergeRomPlayerOntoPlayer()

        // Maintain the player to game player reference
        this._game.players = players
    }

    /**
     * Merge Rom Player on to Player
     * @return {object}
     */
    _mergeRomPlayerOntoPlayer(){
        this._log('_mergeRomPlayerOntoPlayer')
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
        this._log('_getSavableMapFromRom')
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

            // Assign the exits blocked state
            if(room.exits){
                forEach(room.exits, (exit, exit_name) => {
                    let location = savable_map[name]
                    if(!isObject(location.exits)){
                        location.exits = {}
                        location.exits[exit_name] = {}
                    }
        
                    if(exit.blocked){
                        location.exits[exit_name].blocked = exit.blocked
                    }
                })
            }
        })

        return savable_map
    }

    /**
     * List Roms
     * @return {string}
     */
    _listRoms(){
        this._log('_listRoms')
        try{
            var roms = fs.readdirSync(path.resolve(__dirname) + '/roms/').filter((dir) => {
                return dir && dir[0] != '.'
            })
        }catch(error){
            this._log(error)
            return this._setResponseMessage('Error loading rom directory.')
        }

        if (roms.length === 0){
            return this._setResponseMessage('No roms found.')
        }

        var roms_formated = 'Available Roms: \n'
        forEach(roms, (rom, i) => {
            roms_formated = roms_formated.concat(`load ${rom}`)
            if(i < roms.length - 1){
                roms_formated = roms_formated.concat('\n')
            }
        })
        return this._setResponseMessage(roms_formated)
    }

    /**
     * Load Rom
     * 
     * @return void
     */
    _loadRom(){
        this._log('_loadRom')
        if (!this._command.subject)
            return this._setResponseMessage('Specify game to load.')

        this._setRom(this._command.subject)
        // See if we have a valid rom
        if(this._rom){
            this._setSave()
            this._setGame()
            this._saveGame()
            
            try{
                // Save the active rom for the user
                fs.writeFileSync(`${path.resolve(__dirname)}/saves/${this._player.id}.json`, JSON.stringify({active_game: this._command.subject}, null, 2))
                return this._setResponseMessage(this._rom.info.intro_text + '\n' + this._getLocationDescription())

            } catch(error){
                this._log(error)
                return this._setResponseMessage('Error loading rom file for ' + this._command.subject)
            }

        }
        
        return this._setResponseMessage('Could not load ' + this._command.subject)

    }

    _saveGame(){
        this._log('_saveGame')
        try{
            // Save the player data
            fs.writeFileSync(`${path.resolve(__dirname)}/saves/${this._rom.info.name}.json`, JSON.stringify(this._game, null, 2))
        }catch(error){
            this._log(error)
            return this._setResponseMessage(`Error writing ${this._rom.info.name} to file.`)
        }
    }

    _deleteSavedGame(){
        this._log('_deleteSavedGame')
        if (!this._command.subject) return this._setResponseMessage('Specify saved game to delete.')

        // Delete the saved game
        try {

            if(this._command.object != config.access) 
                return this._setResponseMessage('You do not have access to that command.')

            fs.unlinkSync(`${path.resolve(__dirname)}/saves/${this._player.id}.json`)
            fs.unlinkSync(`${path.resolve(__dirname)}/saves/${this._command.subject}.json`)
            return this._setResponseMessage(`${this._command.subject} deleted.`)
        } catch(error) {
            this._log(error)
            return this._setResponseMessage(`${this._command.subject} is not a saved game.`)
        }
    }

    // ======= Helpers =======

    /**
     * Check For Game End
     */
    _checkForGameEnd(){
        this._log('_checkForGameEnd')
        if(this._player.game_over){
            this._setResponseMessage(this._response.message + '\n' + this._rom.info.outro_text)
            this._dieAction()
        }
    }

    /**
     * Exits To String
     * @param {object} exits 
     * @return {string}
     */
    _exitsToString(exits){
        this._log('_exitsToString')
        var message = ''

        if(Object.keys(exits).length === 0) return ''

        var visible_exits = []
        forEach(exits, (exit) => {
            if(!exit.hidden){
                visible_exits.push(exit.display_name)
            }
        })

        message = ' Exits are '
        if(visible_exits.length === 0){
            return ''
        }

        if(visible_exits.length === 1){
            message = ' Exit is '
        }

        // Concat all the exits together
        forEach(visible_exits, (exit, i) => {
            message = message.concat(exit)
            if(i === visible_exits.length - 2){
                message = message.concat(' and ')
            } else if (i === visible_exits.length - 1){
                message = message.concat('.')
            } else {
                message = message.concat(', ')
            }
        })

        return message
    }

    /**
     * Get Current Location
     * @return {object}
     */
    _getCurrentLocation(){
        this._log('_getCurrentLocation')
        return this._rom.map[this._player.current_location]
    }

    /**
     * Get Player Map Visits
     * 
     * @param {string} location 
     * @return {integer}
     */
    _getPlayerMapVisits(location){
        this._log('_getPlayerMapVisits')
        if(this._player.map[location] && this._player.map[location].visits){
            return this._player.map[location].visits
        }
        return 0
    }

    /**
     * Get Location Description
     * 
     * @param {boolean} force_long_description 
     * @return {string}
     */
    _getLocationDescription(force_long_description){
        this._log('_getLocationDescription')
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
            description = current_location.description
        }

        // Prepend image
        if(config.graphical && current_location.image){
            description = `{[${current_location.image}]} ${description}`
        }

        return description
    }

    /**
     * Get Item
     * 
     * @param {object} location 
     * @param {string} name 
     * @return {object}
     */
    _getItem(location, name){
        this._log('_getItem')
        return location[this._getItemName(name)]
    }

    /**
     * Get Item Name
     * 
     * @param {string} name 
     * @return {string}
     */
    _getItemName(name){
        this._log('_getItemName')
        var message = ''
        if(this._rom.items[name]){
            message = name
        }
        else{
            forEach(this._rom.items, (item, item_name) => {
                if(item.display_name.toLowerCase() === name){
                    message = item_name
                }
            })
        }
        
        return message
    }

    /**
     * Get Item Limit Quantity
     * @param {object} item
     * @return {integer}
     */
    _getItemLimitQuantity(item){
        this._log('_getItemLimitQuantity')
        var quantity = item.quantity
        // Limit trumps quantity; -1 is Infinite
        if((item.limit === -1 || item.quantity > item.limit) && item.limit > -1 ){
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
        this._log('_itemsToString')
        var message = ''

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
        message = ' There are '
        if(visible_items[0].quantity === 1){
            message = ' There is '
        }

        forEach(visible_items, (item, i) => {
            // Get real item quantity
            let quantity = this._getItemLimitQuantity(item)

            // Got many
            if(quantity > 1){
                message = message.concat(`${quantity} ${item.name}s`)
            }
            // Got only 1
            else if(quantity === 1){
                message = message.concat(`a ${item.name}`)
            }
            // Got unlimited
            else if(quantity === -1){
                message = message.concat(`Unlimited ${item.name}s`)
            }

            if(i === visible_items.length - 2){
                message = message.concat(' and ')
            } else if (i === visible_items.length - 1){
                message = message.concat(' here.')
            } else {
                message = message.concat(', ')
            }
        })
        return message
    }

    /**
     * Iteract with Item
     * 
     * @param {string} item 
     * @return {string}
     */
    _interactWithItem(interaction, item){
        this._log('_interactWithItem')
        var location = this._getCurrentLocation(),
            message = ''

        // From item
        if(this._rom.items && this._rom.items[item] && this._rom.items[item][interaction]){
            message = this._rom.items[item][interaction]
        }

        return message
    }

    /**
     * Move Item
     * 
     * @param {string} action 
     * @param {object} start_location 
     * @param {object} end_location
     * @return void 
     */
    _moveItem(action, start_location, end_location){
        this._log('_moveItem')
        // Get the resolved name incase the display name was used
        var name = this._getItemName(this._command.subject)
        // Get origin item
        var item_at_origin = this._getItem(start_location, name)

        if(item_at_origin === undefined){
            throw 'itemDoesNotExist'
        }

        // Get desination item
        var item_at_destination = this._getItem(end_location, name)

        // Desitnation does not have the item so build it
        if(item_at_destination === undefined) {
            end_location[name] = {}
            end_location[name].quantity = 1
        } else {
            end_location[name].quantity++
        }

        if (item_at_origin.quantity > 0){
            item_at_origin.quantity--

            // Remove item from the player if none left
            if(action == 'drop'){
                delete start_location[name]
            }
        }

    }

    /**
     * Gett Room Players
     */
    _setRoomPlayers(){

        // Get user in room
        forEach(this._game.players, (player) => {
            // Ignore current user
            if(player.id != this._player.id){
                // Make sure player is in current room
                if(player.current_location == this._player.current_location){
                    this._room_players.push(player)
                }
            }
        })

    }

    /**
     * Action Hooks
     */
    _actionHook(options = []){
        this._log('_actionHook')
        var method = this._command.action + 'ActionHook'
        if(this._rom.hooks[method]){
            return this._rom.hooks[method].call(this, options)
        }
        return null
    }

    // ======= Actions =======

    /**
     * Die Action
     */
    _dieAction(){
        this._log('_dieAction')
        // Simply remove the player from the game
        delete this._game.players[this._player.id]

        this._setResponseMessage('You are dead')
        this._actionHook()
    }

    /**
     * Drop Action
     */
    _dropAction(){
        this._log('_dropAction')
        this._setResponseMessage(`You do not have a ${this._command.subject} to drop.`)

        if(!this._command.subject)
            this._setResponseMessage('What do you want to drop?')

        this._setResponseMessage(this._interactWithItem('drop', this._command.subject))

        if(!this._response.message){
            var current_location = this._getCurrentLocation()
            this._moveItem('drop', this._player.inventory, current_location.items)
            this._setResponseMessage(this._command.subject + ' dropped')
        }
        
        this._actionHook()
    }

    /**
     * Go Action
     */
    _goAction(){
        this._log('_goAction')
        if(!this._command.subject)
            return this._setResponseMessage('Where do you want to go?')

        var location = this._getCurrentLocation(),
            player_destination = null
    
        // Collect exits
        if(location.exits && location.exits[this._command.subject] && location.exits[this._command.subject].destination){
            player_destination = location.exits[this._command.subject].destination
         
        }
        else {
            forEach(location.exits, (exit, name) => {
                if(exit.display_name.toLowerCase() === this._command.subject){
                    // Allowed to enter
                    if(exit.blocked){
                        // Has action to unblock
                        if(this._rom.hooks.goActionExitBlockedHook){
                            player_destination = this._rom.hooks.goActionExitBlockedHook.call(this, {name: name, exit: exit})
                        }
                    }
                    
                    // Check again. If blocked the player_destination is just the return string
                    if(this._game.map[this._player.current_location].exits[name].blocked){
                        this._setResponseMessage(player_destination)
                    }
                }
            })
        }

        // If the exits populated the return string then the player is blocked
        if(!this._response.message){
            // If player_destination is null, then the player entered in a wrong exit
            if(!player_destination) 
                return this._setResponseMessage('You can\'t go there.')

            // Set the new destination
            this._player.current_location = player_destination
            this._setResponseMessage(this._getLocationDescription())

            // Update the visits
            if(!this._player.map[player_destination]) this._player.map[player_destination] = {visits: 1}
            else this._player.map[player_destination].visits++

            this._actionHook()
        }

    }

    /**
     * Inventory Action
     */
    _inventoryAction(){
        this._log('_inventoryAction')
        var inventory = ''

        forEach(this._player.inventory, (item, name) => {
            var display_name = this._rom.items[name].display_name
            if(item.quantity > 0){
                display_name = `${display_name} [${item.quantity}] `
            }
            inventory = inventory.concat('\n' + display_name)
        })
        if (!inventory){
            this._setResponseMessage('Your inventory is empty.')
        } else {
            this._setResponseMessage(`Your inventory contains: ${inventory}`)
        }

        this._actionHook()
    }

    /**
     * Look Action
     */
    _lookAction(){
        this._log('_lookAction')
        if(!this._command.subject){
            return this._getLocationDescription(true)
        }

        // Get item description
        var item = this._rom.items[this._command.subject],
            location = this._getCurrentLocation(),
            this._setResponseMessage(`There is nothing important about the ${this._command.subject}.`)
    
        // From item
        if(item){
            this._setResponseMessage(item.description)
            // Get item image if there is one
            if(config.graphical && item.image){
                this._response.image = item.image
            }
        }
        // From scenery
        else if(location.scenery){
            let scenery = location.scenery[this._command.subject]
            if(scenery){
                if(scenery.look) this._setResponseMessage(scenery.look)
                // Get item image if there is one
                if(scenery.image) this._response.image = item.image
            } 

        }

        this._actionHook()
    }

    /**
     * Take Action
     */
    _takeAction(){
        this._log('_takeAction')
        this._setResponseMessage(`Best just to leave the ${this._command.subject} as it is.`)

        if(!this._command.subject) 
            return this._setResponseMessage('What do you want to take?')

        this._setResponseMessage(this._interactWithItem('take', this._command.subject))

        if(!this._response.message){
            var current_location = this._getCurrentLocation()
            this._moveItem('take', current_location.items, this._player.inventory)
            this._setResponseMessage(this._command.subject + ' taken')
        }

        this._actionHook()
    }

    /**
     * Use Action
     */
    _useAction(){
        this._log('_useAction')
    
        if(!this._command.subject)
            return this._setResponseMessage('What would you like to use?')

        this._actionHook()

    }

    /**
     * Run
     *
     * @return void
     */
    run(){
        this._log('run')
        // Load a game
        if(this._command.action === 'load'){
            this._loadRom()
        }
        // Delete a game
        else if(this._command.action === 'delete'){
            this._deleteSavedGame()
        }
        else{

            // Continue a saved game
            this._setRom()
            if(this._rom){
                this._setSave()
                this._setGame()

                var method = `_${this._command.action}Action`

                // Increment the players command count
                this._player.command_counter++

                if(this[method]){
                    this[method]()
                }

                // Check to see if the player is dead
                this._checkForGameEnd()

                this._saveGame()
            }
            // We have no valid rom
            else {
                this._listRoms()
            }
        }

    }

}