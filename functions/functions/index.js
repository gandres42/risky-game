const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.queue = functions.database.ref('/queue').onUpdate((snapshot, context) => {
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
		db.ref('rooms/' + room).update({
			[arrayResults[0]]: 'p1',
			[arrayResults[1]]: 'p2',
			turn: 'p1',
			streak: 0
		});
		db.ref('/queue/').update({
			[arrayKeys[0]]: null,
			[arrayKeys[1]]: null
		});
	});
	
});