const forEach = require('lodash/forEach')

module.exports.goPostActionHook = function(){

    if(this.engine.player.current_location == 'end'){
        this.engine.player.game_over = true
        if(this.engine.player.light_source){
            return this.engine.setResponse({message: 'You found more gold than you can carry.'})
        } else {
            return this.engine.setResponse({message: 'It is so dark, you can\'t see anything! You fall down an unseen crevice. Your body is never recovered.'})
        }
    }

    // if(path.blocked){

    //     // Check keys
    //     forEach(options.path.access.keys, (key) => {
    //         // More than one player needs to contribute a key
    //         // No player can contribute more than one key
    //         if(options.path.access.multiplayer){

    //             // If the current player has the key and has not contributed
    //             // add the key
    //             if(this.engine.player.inventory[key] && !keys[this.engine.player.id]){
    //                 keys[this.engine.player.id] = key
    //             }
    //             // Check each player for the key
    //             else{
    //                 forEach(this.engine.room_players, (player) => {
    //                     // Make sure the player has the key and has
    //                     // not contributed to another key
    //                     if(player.inventory[key] && !keys[player.id]){
    //                         keys[id] = key
    //                     }
    //                 })
    //             }
    //         }
    //         // Current use must have key
    //         else if(this.engine.player.inventory[key]){
    //             keys[this.engine.player.id] = key
    //         }
    //     })

    //     // Now that we have checked all keys
    //     // Make sure the invory key count is the same as the requirement
    //     if(Object.keys(keys).length == options.path.access.keys.length){
    //         this.engine.game.map[this.engine.player.current_location].locations[options.name].blocked = false
    //         return this.engine.setResponse({message: 'Door unlocked.'})
    //     }

    //     return this.engine.setResponse({message: `${options.path.description} ${options.path.access.keys.length} keys required. Each player here can only use one key.`})
    // }

}

module.exports.usePostActionHook = function(){

    if(this.engine.command.subject == 'helmet'){
        this.engine.player.light_source = true
        return this.engine.setResponse({message: 'You click on the light attached to the helmet.'})
    }

    return this.engine.setResponse({message: 'You do not have that item.'})
}
