const auth = firebase.auth();
var database = firebase.database();
var currentuser;
var room;
var player;
var offlineturn = 1;
var offlinestreak = 0;
var username;
var changing = false;

function googledirect()
{
    auth.signInWithRedirect(provider);
}

function loginAnon()
{
    firebase.auth().signInAnonymously();
}

function logout()
{
    const filename = location.pathname.substring(location.pathname.lastIndexOf("/") + 1);
    if (auth.currentUser.photoURL == null & filename != "index.html")
    {
        database.ref("users/" + auth.currentUser.uid).remove();
        auth.currentUser.delete().then(function() {
            console.log("user deleted");
        }).catch(function(error) {
            console.log(error);
        });
    }
    else
    {
        auth.signOut()
    }
}

auth.onAuthStateChanged(function(user)
{
    if(user) {
        const filename = location.pathname.substring(location.pathname.lastIndexOf("/") + 1);
        auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
        if (filename != 'game.html' && filename != 'offlinegame.html')
        {
            if (filename != 'gameselect.html') {
                changing = true;
                window.location = "gameselect.html";
            }
            currentuser = user;
        }
        else if (filename == 'game.html')
        {
            gameprep();
        }
        else if (filename == "singlegame.html")
        {
            resetlocal();
        }

        return database.ref('users/' + user.uid).once('value').then(function(snapshot) {
            if (snapshot.val() == null)
            {
                database.ref('users/' + user.uid).update({
                    username: 'New Player',
                    online: false
                });
            }
            if (filename == 'gameselect.html')
            {
                return database.ref('users/' + user.uid).once('value').then(function(snapshot) {
                    checkqueued();
                    document.getElementById('changeusername').value = snapshot.val().username
                    if (user.photoURL == null)
                    {
                        document.getElementById('userimage').src = 'anonuser.png'
                    }
                    else
                    {
                        document.getElementById('userimage').src = user.photoURL
                    }
                    document.getElementById('userinfo').innerHTML = user.displayName;
                });
            }
            changing = false;
        });
    }
    else
    {
        const filename = location.pathname.substring(location.pathname.lastIndexOf("/") + 1);
        if(filename != 'index.html' && filename != 'game.html')
        {
            changing = true;
            window.location = "index.html";
        }
        changing = false;
    }
});

function queue()
{
    return database.ref('queueid').once('value').then(function(snapshot) {
        database.ref('queue').update({
            [snapshot.val()]: currentuser.uid
        });
        database.ref().update({
            queueid: (snapshot.val() + 1)
        });
        document.getElementById('queue').style.background = '#C0392B';
        document.getElementById('queue').innerHTML = 'Exit Matchmaking';
        document.getElementById('queue').onclick = exitqueue;
        document.getElementById('queue').style.color = 'white'
    });

}

database.ref('users/').on('value', function(snapshot) {
    const filename = location.pathname.substring(location.pathname.lastIndexOf("/") + 1);
    return database.ref('users/' + auth.currentUser.uid).once('value').then(function(snapshot)
    {
        if (snapshot.val().online == false && filename != 'gameselect.html' && filename != 'offlinegame.html' && filename != 'singlegame.html')
        {
            changing = true;
            window.location = 'gameselect.html';
        }
        else if (snapshot.val().online != false && filename != 'game.html')
        {
            changing = true;
            window.location = 'game.html';
            return firebase.database().ref('users/' + auth.currentUser.uid + '/username').once('value').then(function(snapshot)
            {
                document.getElementById('changeusername').value = snapshot.val()
            });
        }
    });
});

function leavegame()
{
    return database.ref('users/' + auth.currentUser.uid + '/online').once('value').then(function(snapshot)
    {
        return database.ref('users/' + auth.currentUser.uid + '/online').once('value').then(function(snapshot)
        {
            database.ref('rooms/' + snapshot.val()).remove();
            database.ref('users/' + auth.currentUser.uid).update({
                online: false
            });
            database.ref('coin').remove();
            database.ref('streak').remove();
            database.ref('turn').remove();
        });
    });
}

function gameprep()
{
    return database.ref('users/' + auth.currentUser.uid + '/online').once('value').then(function(snapshot)
    {
        room = snapshot.val();
        return database.ref('rooms/' + snapshot.val()).once('value').then(function(snapshot)
        {
            var keys = Object.keys(snapshot.val());
            var values = Object.values(snapshot.val());
            player = values[keys.indexOf(auth.currentUser.uid)];
            return database.ref('users').once('value').then(function(snapshot)
            {
                document.getElementById('p1name').innerHTML = 'p1: ' + Object.values(snapshot.val())[Object.keys(snapshot.val()).indexOf(keys[values.indexOf('p1')])].username;
                document.getElementById('p2name').innerHTML = 'p2: ' + Object.values(snapshot.val())[Object.keys(snapshot.val()).indexOf(keys[values.indexOf('p2')])].username;
            });
        });
    });
}

function coinflip()
{
    return database.ref('rooms/' + room + '/turn').once('value').then(function(snapshot)
    {
        if (snapshot.val() == player)
        {
            document.getElementById('coinflip').style.background = 'white';
        }
        else
        {
            document.getElementById('coinflip').style.background = '#C0392B';
        }
        var coin = rand();
        if (snapshot.val() == player)
        {
            database.ref('rooms/' + room).update({
                coin: coin
            });
            if (snapshot.val() == 'p1' && coin != 1)
            {
                database.ref('rooms/' + room).update({
                    turn: 'p2',
                    streak: 0
                });
            }
            else if (snapshot.val() == 'p2' && coin != 1)
            {
                database.ref("rooms/" + room).update({
                    turn: 'p1',
                    streak: 0
                });
            }
            else if (coin == 1)
            {
                return database.ref('rooms/' + room + '/streak').once('value').then(function(snapshot)
                {
                    if (snapshot.val() == 1)
                    {
                        return database.ref('users/' + auth.currentUser.uid + '/username').once('value').then(function(snapshot)
                        {
                            database.ref('rooms/' + room).update({
                                winner: snapshot.val()
                            });
                        });
                    }
                    else
                    {
                        database.ref('rooms/' + room).update({
                            streak: 1
                        });
                    }
                });
            }
        }
    });
}

function rand() {
    return Math.floor(Math.random() * 2);
}

database.ref('rooms/').on('value', function(snapshot) {
    const filename = location.pathname.substring(location.pathname.lastIndexOf("/") + 1);
    if (filename != 'offlinegame.html' && filename != 'singlegame.html')
    {
        return database.ref('rooms/' + room + '/coin').once('value').then(function(snapshot)
        {
            if (snapshot.val() == 1)
            {
                document.getElementById('coin').src = 'heads.png';
            }
            else if (snapshot.val() == 0)
            {
                document.getElementById('coin').src = 'tails.png';
            }
            else
            {
                document.getElementById('coin').src = 'white.jpeg';
                document.getElementById('coin').style.left = '50%';
            }
            return database.ref('rooms/' + room + '/turn').once('value').then(function(snapshot)
            {
                if (snapshot.val() == null)
                {
                    document.getElementById('playerleftbackground').style.display = 'inline';
                    document.getElementById('playerleft').style.display = 'inline';
                }
                else if (snapshot.val() == 'p1')
                {
                    document.getElementById('p1name').style.color = 'green';
                    document.getElementById('p2name').style.color = 'black';
                    document.getElementById('coin').style.left = '20%';
                    //document.getElementById('coin').style.width = '0px';
                    //setTimeout(widthback, 500)
                }
                else if (snapshot.val() == 'p2')
                {
                    document.getElementById('p2name').style.color = 'green';
                    document.getElementById('p1name').style.color = 'black';
                    document.getElementById('coin').style.left = '80%';
                    //document.getElementById('coin').style.width = '0px';
                    //setTimeout(widthback, 500)
                }

                if (snapshot.val() == player)
                {
                    document.getElementById('coinflip').style.background = 'white';
                    document.getElementById('coinflip').style.color = 'black';
                }
                else
                {
                    document.getElementById('coinflip').style.background = '#C0392B';
                    document.getElementById('coinflip').style.color = 'white';
                }

                return  database.ref('rooms/' + room + '/winner').once('value').then(function(snapshot)
                {
                    if (snapshot.val() != null)
                    {

                        document.getElementById('playerleftbackground').style.display = 'inline';
                        document.getElementById('playerwon').style.display = 'inline';
                        document.getElementById('playerwonmessage').innerHTML = snapshot.val() + ' has won!';
                    }
                    else
                    {
                        document.getElementById('playerleftbackground').style.display = 'none';
                        document.getElementById('playerwon').style.display = 'none';
                    }

                    return  database.ref('rooms/' + room + '/again').once('value').then(function(snapshot)
                    {
                        if (snapshot.val() == 2)
                        {
                            resetgame();
                        }
                    });
                });
            });
        });
    }
});

function changeusername()
{
    if (document.getElementById('changeusername').value.length < 21)
    {
        database.ref('users/' + auth.currentUser.uid).update({
            username: document.getElementById('changeusername').value
        });
    }
    else
    {
        alert("That username is too long, please pick a name under 21 characters");
    }
}

function exitqueue()
{
    document.getElementById('queue').onclick = queue;
    return database.ref('queue').once('value').then(function(snapshot)
    {
        var queue = snapshot.val();
        database.ref('queue/' + Object.keys(queue)[Object.values(queue).indexOf(currentuser.uid)]).remove();
        document.getElementById('queue').style.background = 'white';
        document.getElementById('queue').style.color = 'black';
        document.getElementById('queue').innerHTML= 'Online Game';
    });
}


function checkqueued()
{
    return database.ref('queue').once('value').then(function(snapshot)
    {
        if (Object.values(snapshot.val()).indexOf(currentuser.uid) != -1)
        {
            document.getElementById('queue').style.background = '#C0392B';
            document.getElementById('queue').innerHTML = 'Exit Matchmaking';
            document.getElementById('queue').onclick = exitqueue;
            document.getElementById('queue').style.color = 'white'
        }
    });
}

function resetgame()
{
    database.ref('rooms/' + room).update({
        streak: 0,
        winner: null,
        again: null
    });
    document.getElementById('playerleftbackground').style.display = 'none';
    document.getElementById('playerwon').style.display = 'none';
    document.getElementById('playagain').innerHTML = 'Play Again';
    document.getElementById('playagain').style.backgroundColor = 'white';
}

function again()
{
    return database.ref('rooms/' + room + '/again').once('value').then(function(snapshot)
    {
       document.getElementById('playagain').innerHTML = 'Waiting for other player';
       document.getElementById('playagain').style.backgroundColor = 'lightgrey';
       if (snapshot.val() == null)
       {
           database.ref('rooms/' + room).update({
               again: 1
           });
       }
       else if (snapshot.val() == 1)
       {
           database.ref('rooms/' + room).update({
               again: 2
           });
       }
    });

}

function localgame()
{
    changing = true;
    window.location = "offlinegame.html";
}

function leavelocal()
{
    changing = true;
    window.location = "gameselect.html";
}

function offlineflip()
{
    var flip = rand();
    if (offlineturn == 1)
    {
        document.getElementById('p1name').style.color = 'green';
        document.getElementById('p2name').style.color = 'black';
        document.getElementById('coin').style.left = '20%';
        if (flip == 1)
        {
            document.getElementById("coin").src = "heads.png";
            if (offlinestreak == 1)
            {
                offlinewinner(offlineturn);
            }
            else
            {
                offlinestreak = 1;
                offlineturn = 1;
            }
        }
        else
        {
            document.getElementById("coin").src = "tails.png";
            offlinestreak = 0;
            offlineturn = 2;
            document.getElementById('coinflip1').style.background = '#C0392B';
            document.getElementById('coinflip1').style.color = 'white';
            document.getElementById('coinflip2').style.background = 'white';
            document.getElementById('coinflip2').style.color = 'black';
            document.getElementById('coinflip1').disabled = true;
            document.getElementById('coinflip2').disabled = false;
        }
    }
    else if (offlineturn == 2)
    {
        document.getElementById('p1name').style.color = 'black';
        document.getElementById('p2name').style.color = 'green';
        document.getElementById('coin').style.left = '80%';
        if (flip == 1)
        {
            document.getElementById("coin").src = "heads.png";
            if (offlinestreak == 1)
            {
                offlinewinner(offlineturn);
            }
            else
            {
                offlinestreak = 1;
                offlineturn = 2
            }
        }
        else
        {
            document.getElementById("coin").src = "tails.png";
            offlinestreak = 0;
            offlineturn = 1;
            document.getElementById('coinflip2').style.background = '#C0392B';
            document.getElementById('coinflip2').style.color = 'white';
            document.getElementById('coinflip1').style.background = 'white';
            document.getElementById('coinflip1').style.color = 'black';
            document.getElementById('coinflip2').disabled = true;
            document.getElementById('coinflip1').disabled = false;
        }
    }
}

function offlinewinner(winner)
{
    document.getElementById('playerleftbackground').style.display = 'inline';
    document.getElementById('playerwon').style.display = 'inline';
    document.getElementById('playerwonmessage').innerHTML = 'Player ' + winner + ' has won!';
}

function resetlocal()
{
    return database.ref('users/' + auth.currentUser.uid + '/username').once('value').then(function(snapshot)
    {
        document.getElementById('p1name').innerHTML = snapshot.val();
        document.getElementById('playerleftbackground').style.display = 'none';
        document.getElementById('playerwon').style.display = 'none';
        document.getElementById('coinflip').style.background = 'white';
        document.getElementById('coinflip').style.color = 'black';
        document.getElementById('coinflip').disabled = false;
        document.getElementById('p1name').style.color = 'green';
        document.getElementById('p2name').style.color = 'black';
        document.getElementById('coin').style.left = '20%';
        offlineturn = 1;
        offlinestreak = 0;
    });
}

function deleteAnon()
{
    database.ref("users/" + auth.currentUser.uid).remove();
    auth.currentUser.delete().then(function() {
        console.log("user deleted");
    }).catch(function(error) {
        console.log(error);
    });
}

window.onbeforeunload = function() {
    if (auth.currentUser.photoURL == null & changing == false)
    {
        deleteAnon();
    }
    else
    {
        if (changing == false)
        {
            leavegame();
        }
    }
}

window.onload = function()
{

}