
/**
 * Format Slack
 */
exports.slack = (text) => {
    var url = text.match(/{\[(.*)\]}/)

    // Convert images
    if(url){
        return {text: text.replace(url[0], ''), attachments: [{image_url: url[1]}]}
    }

    return {text: text}
}