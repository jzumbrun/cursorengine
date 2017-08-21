
module.exports.endAction = (player) => {
    if(player.light_source){
        return 'You found more gold than you can carry.'
    } else {
        return 'It is so dark, you can\'t see anything! You fall down an unseen crevice. Your body is never recovered.'
    }
    player.game_over = true
}

module.exports.useHelmet = (player) => {
    player.light_source = true
    return 'You click on the light attached to the helmet.'
}
