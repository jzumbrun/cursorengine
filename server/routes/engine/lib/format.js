
/**
 * Format Slack
 */
exports.slack = (respone) => {

    // Convert images
    if(respone.image){
        return {text: respone.message, attachments: [{image_url: respone.image}]}
    }

    return {text: respone.message}
}