// Requires
const fs = require('fs'),
    path = require('path'),
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
     * Log
     */
    _log(data){
        if(config.log) console.log(data)
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
                    actions: require(`./roms/${name}/actions.js`),
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
            return 'Error loading rom directory.'
        }

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
        this._log('_loadRom')
        if (!this._command.subject) return "Specify game to load."

        this._setRom(this._command.subject)
        // See if we have a valid rom
        if(this._rom){
            this._setSave()
            this._setGame()
            this._saveGame()
            
            try{
                // Save the active rom for the user
                fs.writeFileSync(`${path.resolve(__dirname)}/saves/${this._player.id}.json`, JSON.stringify({active_game: this._command.subject}, null, 2))

            }catch(error){
                this._log(error)
                return 'Error loading rom file for ' + this._command.subject
            }

            return this._rom.info.intro_text + '\n' + this._getLocationDescription()
        }
        
        return 'Could not load ' + this._command.subject

    }

    _saveGame(){
        this._log('_saveGame')
        try{
            // Save the player data
            fs.writeFileSync(`${path.resolve(__dirname)}/saves/${this._rom.info.name}.json`, JSON.stringify(this._game, null, 2))
        }catch(error){
            this._log(error)
            return `Error writing ${this._rom.info.name} to file.`
        }
    }

    _deleteSavedGame(){
        this._log('_deleteSavedGame')
        if (!this._command.subject) return "Specify saved game to delete."

        // Delete the saved game
        try {

            if(this._command.object != config.access) return 'You do not have access to that command.'

            fs.unlinkSync(`${path.resolve(__dirname)}/saves/${this._player.id}.json`)
            fs.unlinkSync(`${path.resolve(__dirname)}/saves/${this._command.subject}.json`)
            return `${this._command.subject} deleted.`
        } catch(error) {
            this._log(error)
            return `${this._command.subject} is not a saved game.`
        }
    }

    // ======= Helpers =======

    /**
     * Check For Game End
     * @param {string} return_string 
     */
    _checkForGameEnd(return_string){
        this._log('_checkForGameEnd')
        if(this._player.game_over){
            return_string = return_string + '\n' + this._rom.info.outro_text
            this._dieAction()
        }
        return return_string
    }

    _exitsToString(exits){
        this._log('_exitsToString')
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
        var return_string = ''
        if(this._rom.items[name]){
            return_string = name
        }
        else{
            forEach(this._rom.items, (item, item_name) => {
                if(item.display_name.toLowerCase() === name){
                    return_string = item_name
                }
            })
        }
        
        return return_string
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

    /**
     * Iteract with Item
     * 
     * @param {string} item 
     * @return {string}
     */
    _interactWithItem(interaction, item){
        this._log('_interactWithItem')
        var location = this._getCurrentLocation(),
            return_string = ''

        // From item
        if(this._rom.items && this._rom.items[item] && this._rom.items[item][interaction]){
            return_string = this._rom.items[item][interaction]
        }

        return return_string
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
     * Action Hook
     */
    _actionHook(options){
        this._log('_actionHook')
        var method = this._command.action + 'Action'
        if(this._rom.actions[method]){
            return this._rom.actions[method]({
                // Mutables
                player: this._player, 
                game: this._game,
                // Immutables
                options: cloneDeep(options), 
                rom: cloneDeep(this._rom), 
                command: cloneDeep(this._command)
            })
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

        let action_hook = this._actionHook()
        if(action_hook) return action_hook
        return 'You are dead'
    }

    /**
     * Drop Action
     */
    _dropAction(){
        this._log('_dropAction')
        var return_string = `You do not have a ${this._command.subject} to drop.`
        if(!this._command.subject) return 'What do you want to drop?'

        return_string = this._interactWithItem('drop', this._command.subject)

        if(!return_string){
            var current_location = this._getCurrentLocation()
            this._moveItem('drop', this._player.inventory, current_location.items)
            return_string = this._command.subject + ' dropped'
        }
        
        let action_hook = this._actionHook({return_string: return_string})
        if(action_hook) return action_hook
        return return_string
    }

    /**
     * Go Action
     */
    _goAction(){
        this._log('_goAction')
        var return_string = ''
        if(!this._command.subject) return 'Where do you want to go?'

        var location = this._getCurrentLocation(),
            player_destination = null
    
        // Collect exits
        if(location.exits && location.exits[this._command.subject] && location.exits[this._command.subject].destination){
            player_destination = location.exits[this._command.subject].destination
         
        }
        else {
            forEach(location.exits, (exit) => {
                if(exit.display_name.toLowerCase() === this._command.subject){
                    player_destination = exit.destination
                }
            })
        }

        if(player_destination === null) return 'You can\'t go there.'

        // Set the new destination
        this._player.current_location = player_destination
        return_string = this._getLocationDescription()

        // Update the visits
        if(!this._player.map[player_destination]) this._player.map[player_destination] = {visits: 1}
        else this._player.map[player_destination].visits++

        let action_hook = this._actionHook({return_string: return_string})
        if(action_hook) return action_hook
        return return_string
    }

    /**
     * Inventory Action
     */
    _inventoryAction(){
        this._log('_inventoryAction')
        var inventory = '',
            return_string = ''

        forEach(this._player.inventory, (item, name) => {
            var display_name = this._rom.items[name].display_name
            if(item.quantity > 0){
                display_name = `${display_name} [${item.quantity}] `
            }
            inventory = inventory.concat('\n' + display_name)
        })
        if (!inventory){
            return_string = 'Your inventory is empty.'
        } else {
            return_string = `Your inventory contains: ${inventory}`
        }

        let action_hook = this._actionHook({return_string: return_string})
        if(action_hook) return action_hook
        return return_string

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
            return_string = `There is nothing important about the ${this._command.subject}.`
    
        // From item
        if(item){
            return_string = item.description
            // Get item image if there is one
            if(config.graphical && item.image){
                return_string = `{[${item.image}]} ${return_string}`
            }
        }
        // From scenery
        else if(location.scenery){
            let scenery = location.scenery[this._command.subject]
            if(scenery){
                if(scenery.look) return_string = scenery.look
                // Get item image if there is one
                if(scenery.image ) return_string = `{[${scenery.image}]} ${return_string}`
            } 

        }

        let action_hook = this._actionHook({return_string: return_string})
        if(action_hook) return action_hook
        return return_string
    }

    /**
     * Take Action
     */
    _takeAction(){
        this._log('_takeAction')
        var return_string = `Best just to leave the ${this._command.subject} as it is.`

        if(!this._command.subject) return 'What do you want to take?'

        return_string = this._interactWithItem('take', this._command.subject)

        if(!return_string){
            var current_location = this._getCurrentLocation()
            this._moveItem('take', current_location.items, this._player.inventory)
            return_string = this._command.subject + ' taken'

        }

        let action_hook = this._actionHook({return_string: return_string})
        if(action_hook) return action_hook
        return return_string
    }

    /**
     * Use Action
     */
    _useAction(){
        this._log('_useAction')
        var return_string = 'Can\'t do that.',
            name = this._getItemName(this._command.subject),
            method = `use${upperFirst(name)}`
    
        if(!this._command.subject) return 'What would you like to use?'

        let action_hook = this._actionHook({name: name, return_string: return_string})
        if(action_hook) return action_hook
        return return_string

    }

    /**
     * Run
     *
     * @return String
     */
    run(){
        this._log('run')
        // Load a game
        if(this._command.action === 'load'){
            return_string = this._loadRom()
        }
        // Delete a game
        else if(this._command.action === 'delete'){
            return_string = this._deleteSavedGame()
        }
        else{

            // Continue a saved game
            this._setRom()
            if(this._rom){
                this._setSave()
                this._setGame()

                var method = `_${this._command.action}Action`,
                    return_string = 'I don\'t know how to do that.'

                // Increment the players command count
                this._player.command_counter++

                if(this[method]){
                    return_string = this[method]()
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