// Requires
const fs = require('fs'),
    path = require('path'),
    isObject = require('lodash/isObject'),
    cloneDeep = require('lodash/cloneDeep'),
    forEach = require('lodash/forEach'),
    config = require('../../../config'),
    parser = require('./parser.js'),
    Actions = require('./actions.js')

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
        // this.player IS A REFERENCE to this.game.players[this.player.id]
        this.player = null

        // The live game data
        // This object IS MUTABLE
        this.game = null

        // ========= IMMUTABLE =========

        // The saved game data
        // Once this object is "filled", it will be frozen
        this.save = null

        // The original source of the game
        // Once this object is "filled", it will be frozen
        this.rom = null

        // The textual command we will be using to drive hooks
        // Once this object is "filled", it will be frozen
        this.command = null

        // The final response object
        this.response = {
            message: 'I don\'t know how to do that.'
        }

        // Room players
        this.room_players = []

        // Actions
        this.actions = new Actions(this)

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
        if(this.command === null){
            var command = parser.parse(text)
            // Make it immutable!
            Object.freeze(command)
            this.command = command
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
        this.player = {
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
        return this.response
    }

    // ========= PRIVATE =========

    /**
     * Log
     */
    log(data){
        if(config.log) console.log(data)
    }

    /**
     * Set Response
     * @param {string} string 
     * @return void
     */
    setResponse({message, image}){
        if(message) this.response.message = message
        if(image) this.response.image = image
    }

    /**
     * Dequire
     * 
     * require an non-cached file
     * @params {string} module
     * @return mixed
     */
    dequire(module){
        delete require.cache[require.resolve(module)]
        return require(module)
    }

    /**
     * Set Rom
     * @param {object} name
     */
    setRom(name){
        this.log('setRom')
        // Once set, do not change it!
        if(this.rom === null){

            try {
                // Load the active game from the player data
                if(name === undefined){
                    name = this.dequire(`./saves/${this.player.id}.json`).active_game
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
                this.rom = rom
            } catch(error){
                this.log(error)
                // Do nothing
            }
            
        }
    }

    /**
     * Set Save
     */
    setSave(){
        this.log('setSave')
        // Once set, do not change it!
        if(this.save === null){

            try{
                // Load the saved game
                var save = this.dequire(`./saves/${this.rom.info.name}.json`)

                // Make it immutable!
                Object.freeze(save)
                this.save = save
            } catch(error){
                this.log(error)
            }
        }
    }

    /**
     * Set Game
     * @param {object} game
     */
    setGame(){
        this.log('setGame')
        // Merge from save
        if(this.save){
            this.game = cloneDeep(this.save)
            // See if the player is in the game; add them if not
            if(!this.save.players[this.player.id]){
                 this.mergePlayerOntoSavedPlayers()
            }
            // Update the player from the saved player
            else{
                this.mergeSavedPlayerOntoPlayer()
            }
        }
        // Merge from rom
        else {
            var players = {}
            players[this.player.id] = this.mergeRomPlayerOntoPlayer()
            this.game = {
                players: players,
                map: this.getSaveableMapFromRom()
            }
        }

        // Make quick reference to the room players
        this.setRoomPlayers()

    }

    /**
     * Merge Player on to Saved Player
     * Let player reference be the same as the one
     * in the saved players list
     * 
     * @return {object}
     */
    mergeSavedPlayerOntoPlayer(){
        this.log('mergeSavedPlayerOntoPlayer')
        // Keep this as a reference
        this.player = cloneDeep(this.save.players[this.player.id])
        // Maintain the player to game player reference
        this.game.players[this.player.id] = this.player
    }

    /**
     * Merge Player on to Saved Player
     * @return {object}
     */
    mergePlayerOntoSavedPlayers(){
        this.log('mergePlayerOntoSavedPlayers')
        // List of players from the save
        var players = cloneDeep(this.save.players)
        
        // Add player object on to save players list
        players[this.player.id] = this.mergeRomPlayerOntoPlayer()

        // Maintain the player to game player reference
        this.game.players = players
    }

    /**
     * Merge Rom Player on to Player
     * @return {object}
     */
    mergeRomPlayerOntoPlayer(){
        this.log('mergeRomPlayerOntoPlayer')
        // Copy of rom player object
        var player = cloneDeep(this.rom.player)

        // Add player details to rom player object
        player.id = this.player.id
        player.name = this.player.name

        // Update the player's data
        this.player = player

        return player
    }

    /**
     * Get Savable From Map
     * 
     * @return {object}
     */
    getSaveableMapFromRom(){
        this.log('getSaveableMapFromRom')
        // Savable map
        var savable_map = {},
            // Copy of rom map object
            map = cloneDeep(this.rom.map)

        // Now we only want the data that can be mutated,
        // for example items in rooms. Title, description, ect,
        // can be access from the rom. This makes the
        // saved object much smaller
        forEach(map, (room, name) => {
            savable_map[name] = {items: room.items}

            // Assign the paths blocked state
            if(room.paths){
                forEach(room.paths, (path, path_name) => {
                    let location = savable_map[name]
                    if(!isObject(location.paths)){
                        location.paths = {}
                        location.paths[path_name] = {}
                    }
        
                    if(path.blocked){
                        location.paths[path_name].blocked = path.blocked
                    }
                })
            }
        })

        return savable_map
    }

    saveGame(){
        this.log('saveGame')
        try{
            // Save the player data
            fs.writeFileSync(`${path.resolve(__dirname)}/saves/${this.rom.info.name}.json`, JSON.stringify(this.game, null, 2))
        }catch(error){
            this.log(error)
            return this.setResponse({message: `Error writing ${this.rom.info.name} to file.`})
        }
    }

    // ======= Helpers =======

    /**
     * Check For Game End
     */
    checkForGameEnd(){
        this.log('checkForGameEnd')
        if(this.player.game_over){
            this.setResponse({message: this.response.message + '\n' + this.rom.info.outro_text})
            this.actions.die()
        }
    }

    /**
     * Paths To String
     * @param {object} paths 
     * @return {string}
     */
    pathsToString(paths){
        this.log('pathsToString')
        var message = ''

        if(Object.keys(paths).length === 0) return ''

        var visible_paths = []
        forEach(paths, (path) => {
            if(!path.hidden){
                visible_paths.push(path.display_name)
            }
        })

        message = ' Paths are '
        if(visible_paths.length === 0){
            return ''
        }

        if(visible_paths.length === 1){
            message = ' Path is '
        }

        // Concat all the paths together
        forEach(visible_paths, (path, i) => {
            message = message.concat(path)
            if(i === visible_paths.length - 2){
                message = message.concat(' and ')
            } else if (i === visible_paths.length - 1){
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
    getCurrentLocation(){
        this.log('getCurrentLocation')
        return this.rom.map[this.player.current_location]
    }

    /**
     * Get Player Map Visits
     * 
     * @param {string} location 
     * @return {integer}
     */
    getPlayerMapVisits(location){
        this.log('getPlayerMapVisits')
        if(this.player.map[location] && this.player.map[location].visits){
            return this.player.map[location].visits
        }
        return 0
    }

    /**
     * Get Location Description
     * 
     * @param {boolean} force_long_description 
     * @return {string}
     */
    getLocationInfo(force_long_description){
        this.log('getLocation')
        var current_location = this.getCurrentLocation(),
            description = '',
            image = ''

        if(this.getPlayerMapVisits(this.player.current_location) == 0 || force_long_description){
            description = current_location.description

            // List the items
            if(current_location.items){
                description = description.concat(this.itemsToString(current_location.items))
            }
            // List the paths
            if(current_location.paths){
                description = description.concat(this.pathsToString(current_location.paths))
            }
        }
        // Just list the name since we have been here before 
        else {
            description = current_location.description
        }

        // Prepend image
        if(config.graphical && current_location.image){
            image = current_location.image
        }

        return {description: description, image: image}
    }

    /**
     * Get Item
     * 
     * @param {object} location 
     * @param {string} name 
     * @return {object}
     */
    getItem(location, name){
        this.log('getItem')
        return location[this.getItemName(name)]
    }

    /**
     * Get Item Name
     * 
     * @param {string} name 
     * @return {string}
     */
    getItemName(name){
        this.log('getItemName')
        var message = ''
        if(this.rom.items[name]){
            message = name
        }
        else{
            forEach(this.rom.items, (item, item_name) => {
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
    getItemLimitQuantity(item){
        this.log('getItemLimitQuantity')
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
    itemsToString(items){
        this.log('itemsToString')
        var message = ''

        if(!Object.keys(items).length) return ''

        // Get Visible items
        var visible_items = []
        forEach(items, (item, name) => {
            let rom_item = this.rom.items[name]
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
            let quantity = this.getItemLimitQuantity(item)

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
    interactWithItem(interaction, item){
        this.log('interactWithItem')
        var location = this.getCurrentLocation(),
        state = null

        // From item
        if(location.items[item] && this.rom.items && this.rom.items[item] && this.rom.items[item][interaction]){
            state = this.rom.items[item][interaction]
        }

        return state
    }

    /**
     * Move Item
     * 
     * @param {string} action 
     * @param {object} start_location 
     * @param {object} end_location
     * @return void 
     */
    moveItem(action, start_location, end_location){
        this.log('moveItem')
        // Get the resolved name incase the display name was used
        var name = this.getItemName(this.command.subject)
        // Get origin item
        var item_at_origin = this.getItem(start_location, name)

        if(item_at_origin === undefined){
            throw 'itemDoesNotExist'
        }

        // Get desination item
        var item_at_destination = this.getItem(end_location, name)

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
    setRoomPlayers(){

        // Get user in room
        forEach(this.game.players, (player) => {
            // Ignore current user
            if(player.id != this.player.id){
                // Make sure player is in current room
                if(player.current_location == this.player.current_location){
                    this.room_players.push(player)
                }
            }
        })

    }

    /**
     * Run
     *
     * @return void
     */
    run(){
        this.log('run')

        // Run console actions
        if(this.actions.console_actions.indexOf(this.command.action) > -1)
            return this.actions.route()

        // Continue a saved game
        this.setRom()
        if(this.rom){
            this.setSave()
            this.setGame()

            this.actions.route()

            // Check to see if the player is dead
            this.checkForGameEnd()

            this.saveGame()
        }
        // We have no valid rom
        else {
            this.actions.roms()
        }

    }

}