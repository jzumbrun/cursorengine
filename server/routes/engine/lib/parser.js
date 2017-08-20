// === Word Lists ===
const skipWords = ['','a','an','at','in','on','the','to'];
const subjectEndWords = ['on','with','and'];

exports.parse = function (string){
	// === Prep Input for Processing ===
	var components = string.toLowerCase();
	components = components.split(' ');

	// === Create Necessary Variables ===
	var command = {},
		subjectStartIndex,
		objectStartIndex;

	// === Determine Action ===
	command.action =  components[0];

	// === Determine Subject Start ===
	for (let i = 1; i < components.length; ++i){
		if(skipWords.indexOf(components[i]) === -1){
			command.subject = components[i];
			subjectStartIndex = i;
			break;
		}
	}
	// === Determine Subject End and Object Start ===
	for (let i = subjectStartIndex + 1; i < components.length; ++i){
		if(subjectEndWords.indexOf(components[i]) !== -1){
			command.object = '';
			objectStartIndex = i+1;
			break;
		} else if (components[i] === '') {
			continue;
		} else {
			command.subject = command.subject.concat(' '+components[i]);
		}
	}
	// === Determine End of Object ===
	for (let i = objectStartIndex + 1; i < components.length; ++i){
		if (skipWords.indexOf(components[i] === -1)){
			if(command.object === ''){
				command.object = command.object.concat(components[i]);
			} else {
				command.object = command.object.concat(' '+components[i]);
			}
		}
	}
	return command;
};