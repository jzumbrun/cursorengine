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
 * Actions
 *
 */
module.exports = class Actions {

    constructor(engine){
        this.engine = engine

        // Console actions
        this.console_actions = ['load', 'delete', 'roms', 'help']

        // Game actions
        this.game_actions = ['look', 'go', 'take', 'drop', 'use', 'inventory']

    }

    /**
     * Route
     */
    route() {
        this.engine.log('action')
        var method = `${this.engine.command.action}`

        if((this.console_actions.indexOf(method) > -1 
            || this.game_actions.indexOf(method) > -1)
            && this[method])
            this[method]()
    }

    /**
     * Action Pre Hook
     */
    actionHook(stage, options = []){
        this.engine.log('actionHook')
        var method = `${this.engine.command.action}${stage}ActionHook`
        if(this.engine.rom && this.engine.rom.hooks[method]){
            return this.engine.rom.hooks[method].call(this, options)
        }
        return null
    }

    // =======================
    // ======= Actions =======
    // =======================

    // ======= Console Actions =======
    // Console actions cannot be
    // extended by roms

    /**
     * Load
     */
    load(){
        this.engine.log('load')

        if (!this.engine.command.subject)
            return this.engine.setResponse({message: 'Specify game to load.'})

        this.engine.setRom(this.engine.command.subject)
        // See if we have a valid rom
        if(this.engine.rom){
            this.engine.setSave()
            this.engine.setGame()
            this.engine.saveGame()
            
            try{
                // Save the active rom for the user
                fs.writeFileSync(`${path.resolve(__dirname)}/saves/${this.engine.player.id}.json`, JSON.stringify({active_game: this.engine.command.subject}, null, 2))
                return this.engine.setResponse({message: this.engine.rom.info.intro_text + '\n' + this.engine.getLocationInfo().description})

            } catch(error){
                this.engine.log(error)
                return this.engine.setResponse({message: 'Error loading rom file for ' + this.engine.command.subject})
            }

        }
        
        return this.engine.setResponse({message: 'Could not load ' + this.engine.command.subject})

    }

    /**
     * Roms
     */
    roms(){
        this.engine.log('roms')
        try{
            var roms = fs.readdirSync(path.resolve(__dirname) + '/roms/').filter((dir) => {
                return dir && dir[0] != '.'
            })
        } catch(error){
            this.engine.log(error)
            return this.engine.setResponse({message: 'Error loading rom directory.'})
        }

        if (roms.length === 0){
            return this.engine.setResponse({message: 'No roms found.'})
        }

        var roms_formated = 'Available Roms: \n'
        forEach(roms, (rom, i) => {
            roms_formated = roms_formated.concat(`load ${rom}`)
            if(i < roms.length - 1){
                roms_formated = roms_formated.concat('\n')
            }
        })
        return this.engine.setResponse({message: roms_formated})

    }

    /**
     * Remove 
     */
    remove(){
        this.engine.log('remove')
        if (!this.engine.command.subject) return this.engine.setResponse({message: 'Specify saved game to remove.'})

        // Remove the saved game
        try {

            fs.unlinkSync(`${path.resolve(__dirname)}/saves/${this.engine.player.id}.json`)
            fs.unlinkSync(`${path.resolve(__dirname)}/saves/${this.engine.command.subject}.json`)
            return this.engine.setResponse({message: `${this.engine.command.subject} removed.`})
        } catch(error) {
            return this.engine.setResponse({message: `${this.engine.command.subject} is not a saved game.`})
        }

    }

    /**
     * Help
     */
    help(){
        this.engine.log('help')
        this.actionHook('Pre')
        let message = "Console actions: "
            .concat(this.console_actions.join(', '))
            .concat("\nGame actions: ")
            .concat(this.game_actions.join(', '))

        this.engine.setResponse({message: message})
        this.actionHook('Post')
    }

    // ======= Rom Actions =======

    /**
     * Die
     */
    die(){
        this.engine.log('die')
        this.actionHook('Pre')
        // Simply remove the player from the game
        delete this.engine.game.players[this.engine.player.id]

        this.engine.setResponse({message: 'You are dead'})
        this.actionHook('Post')
    }

    /**
     * Drop
     */
    drop(){
        this.engine.log('drop')
        this.actionHook('Pre')
        this.engine.setResponse({message: `You do not have a ${this.engine.command.subject} to drop.`})

        if(!this.engine.command.subject)
            this.engine.setResponse({message: 'What do you want to drop?'})

        if(this.engine.interactWithItem('take', this.engine.command.subject)){
            var current_location = this.engine.getCurrentLocation()
            this.engine.moveItem('drop', this.engine.player.inventory, current_location.items)
            this.engine.setResponse({message: this.engine.command.subject + ' dropped'})
        }
        
        this.actionHook('Post')
    }

    /**
     * Go
     */
    go(){
        this.engine.log('go')
        this.actionHook('Pre')

        if(!this.engine.command.subject)
            return this.engine.setResponse({message: 'Where do you want to go?'})

        var location = this.engine.getCurrentLocation(),
            player_location = null
    
        // Collect paths
        if(location.paths && location.paths[this.engine.command.subject] && location.paths[this.engine.command.subject].location){
            player_location = location.paths[this.engine.command.subject].location
         
        }

        // If player_location is null, then the player entered in a wrong path
        if(!player_location) 
            return this.engine.setResponse({message: 'You can\'t go there.'})

        // Set the new location
        this.engine.player.current_location = player_location
        this.engine.setResponse({message: this.engine.getLocationInfo().description})

        // Update the visits
        if(!this.engine.player.map[player_location]) this.engine.player.map[player_location] = {visits: 1}
        else this.engine.player.map[player_location].visits++

        this.actionHook('Post')

    }

    /**
     * Inventory
     */
    inventory(){
        this.engine.log('inventory')
        this.actionHook('Pre')
        var inventory = ''

        forEach(this.engine.player.inventory, (item, name) => {
            var display_name = this.engine.rom.items[name].display_name
            if(item.quantity > 0){
                display_name = `${display_name} [${item.quantity}] `
            }
            inventory = inventory.concat('\n' + display_name)
        })
        if (!inventory){
            this.engine.setResponse({message: 'Your inventory is empty.'})
        } else {
            this.engine.setResponse({message: `Your inventory contains: ${inventory}`})
        }

        this.actionHook('Post')
    }

    /**
     * Look
     */
    look(){
        this.engine.log('look')
        this.actionHook('Pre')
        if(!this.engine.command.subject){
            let location = this.engine.getLocationInfo(true)
            return this.engine.setResponse({message: location.description, image: location.image})
        }

        // Get item description
        var item = this.engine.rom.items[this.engine.command.subject],
            location = this.engine.getCurrentLocation()
            this.engine.setResponse({message: `There is nothing important about the ${this.engine.command.subject}.`})

        // From item
        if(item){
            this.engine.setResponse({message: item.description})
            // Get item image if there is one
            if(config.graphical && item.image){
                this.engine.setResponse({image: item.image})
            }
        }
        // From scenery
        else if(location.scenery){
            let scenery = location.scenery[this.engine.command.subject]
            if(scenery){
                if(scenery.look) this.engine.setResponse({message: scenery.look})
                // Get item image if there is one
                if(scenery.image) this.engine.setResponse({image: item.image})
            } 

        }

        this.actionHook('Post')
    }

    /**
     * Take
     */
    take(){
        this.engine.log('take')
        this.actionHook('Pre')
        this.engine.setResponse({message: `Best just to leave the ${this.engine.command.subject} as it is.`})

        if(!this.engine.command.subject) 
            return this.engine.setResponse({message: 'What do you want to take?'})

        if(this.engine.interactWithItem('take', this.engine.command.subject)){
            var current_location = this.engine.getCurrentLocation()
            this.engine.moveItem('take', current_location.items, this.engine.player.inventory)
            this.engine.setResponse({message: this.engine.command.subject + ' taken'})
        }

        this.actionHook('Post')
    }

    /**
     * Use 
     */
    use(){
        this.engine.log('use')
        this.actionHook('Pre')
        if(!this.engine.command.subject)
            return this.engine.setResponse({message: 'What would you like to use?'})

        this.actionHook('Post')

    }

}