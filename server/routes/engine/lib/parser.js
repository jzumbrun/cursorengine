// === Word Lists ===
const skip_words = ['','a','an','at','in','on','the','to'],
	subject_end_words = ['on','with','and']

exports.parse = (string) => {
	// === Prep Input for Processing ===
	var components = string.toLowerCase()
	components = components.split(' ')

	// === Create Necessary Variables ===
	var command = {},
		subject_start_index,
		object_start_index

	// === Determine Action ===
	command.action = components[0]

	// === Determine Subject Start ===
	for (let i = 1; i < components.length; ++i){
		if(skip_words.indexOf(components[i]) === -1){
			command.subject = components[i]
			subject_start_index = i
			break
		}
	}
	// === Determine Subject End and Object Start ===
	for (let i = subject_start_index + 1; i < components.length; ++i){
		if(subject_end_words.indexOf(components[i]) !== -1){
			command.object = ''
			object_start_index = i
			break
		} else if (components[i] === '') {
			continue
		} else {
			command.subject = command.subject.concat(' ' + components[i])
		}
	}
	// === Determine End of Object ===
	for (let i = object_start_index + 1; i < components.length; ++i){
		if (skip_words.indexOf(components[i] === -1)){
			if(command.object === ''){
				command.object = command.object.concat(components[i])
			} else {
				command.object = command.object.concat(' '+components[i])
			}
		}
	}
	return command
}