
module.exports.goAction = (engine) => {

    if(engine.player.current_location == 'end'){
        engine.player.game_over = true
        if(engine.player.light_source){
            return 'You found more gold than you can carry.'
        } else {
            return 'It is so dark, you can\'t see anything! You fall down an unseen crevice. Your body is never recovered.'
        }
    }
}

module.exports.useAction = (engine) => {

    if(engine.options.name == 'helmet'){
        engine.player.light_source = true
        return 'You click on the light attached to the helmet.'
    }

}
