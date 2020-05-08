const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.queue = functions.database.ref('/queue').onUpdate((snapshot, context) => {
	console.log("Function Invoked");
	var db = admin.database();
	const afterData = snapshot.after.val();
	const arrayResults = Object.values(afterData);
	const arrayKeys = Object.keys(afterData);
	console.log(arrayResults);
	return admin.database().ref('/roomid').once('value', (snapshot) => {
		var room = snapshot.val();
		db.ref('/users/' + arrayResults[0]).update({
			online: room
		});
		db.ref('/users/' + arrayResults[1]).update({
			online: room
		});
		db.ref('/').update({
			roomid: room + 1
		});		
		db.ref('/queue/').update({
			[arrayKeys[0]]: null,
			[arrayKeys[1]]:null
		});
	});
	
});