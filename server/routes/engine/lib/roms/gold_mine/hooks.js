const forEach = require('lodash/forEach')

module.exports.goActionHook = function(options){

    if(this._player.current_location == 'end'){
        this._player.game_over = true
        if(this._player.light_source){
            return this._setReponseMessage('You found more gold than you can carry.')
        } else {
            return this._setReponseMessage('It is so dark, you can\'t see anything! You fall down an unseen crevice. Your body is never recovered.')
        }
    }
}

module.exports.goActionExitBlockedHook = function(options){
    var keys = {}

    if(exit.blocked){

        // Check keys
        forEach(options.exit.access.keys, (key) => {
            // More than one player needs to contribute a key
            // No player can contribute more than one key
            if(options.exit.access.multiplayer){

                // If the current player has the key and has not contributed
                // add the key
                if(this._player.inventory[key] && !keys[this._player.id]){
                    keys[this._player.id] = key
                }
                // Check each player for the key
                else{
                    forEach(this._room_players, (player) => {
                        // Make sure the player has the key and has
                        // not contributed to another key
                        if(player.inventory[key] && !keys[player.id]){
                            keys[id] = key
                        }
                    })
                }
            }
            // Current use must have key
            else if(this._player.inventory[key]){
                keys[this._player.id] = key
            }
        })

        // Now that we have checked all keys
        // Make sure the invory key count is the same as the requirement
        if(Object.keys(keys).length == options.exit.access.keys.length){
            this._game.map[this._player.current_location].exits[options.name].blocked = false
            return this._setReponseMessage('Door unlocked.')
        }

        return this._setReponseMessage(`${options.exit.description} ${options.exit.access.keys.length} keys required. Each player here can only use one key.`)
    }

    this._setReponseMessage(options.name)
}

module.exports.useActionHook = function(options){

    if(options.name == 'helmet'){
        this._player.light_source = true
        return this._setReponseMessage('You click on the light attached to the helmet.')
    }

}
