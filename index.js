const auth = firebase.auth();
var database = firebase.database();
var currentuser;
var room;
var player;
var offlineturn = 1;
var offlinestreak = 0;
var username;

function googledirect()
{
    auth.signInWithRedirect(provider);
}

function logout()
{
    auth.signOut()
}

auth.onAuthStateChanged(function(user)
{
    if(user) {
        const filename = location.pathname.substring(location.pathname.lastIndexOf("/") + 1);

        if (filename != 'game.html' && filename != 'offlinegame.html' && filename != 'singlegame.html')
        {
            if (filename != 'gameselect.html') {
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

        return database.ref('users/' + user.uid + '/registered').once('value').then(function(snapshot) {
            if (snapshot.val() == null)
            {
                database.ref('users/' + user.uid).update({
                    username: 'New Player',
                    online: false,
                    registered: true
                });
            }
            if (filename == 'gameselect.html')
            {
                checkqueued();
                document.getElementById('userimage').src = user.photoURL
                document.getElementById('userinfo').innerHTML = user.displayName;
            }
        });
    }
    else
    {
        const filename = location.pathname.substring(location.pathname.lastIndexOf("/") + 1);
        if(filename != 'index.html' && filename != 'game.html')
        {
            window.location = "index.html";
        }
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

database.ref('queue').on('value', function(snapshot) {
    var queue = Object.values(snapshot.val());
    if (queue[0] == currentuser.uid && queue.length >= 2)
    {
        return database.ref('roomid').once('value').then(function(snapshot)
        {
            database.ref('rooms/' + snapshot.val()).set({
                [auth.currentUser.uid]: 'p1',
                [queue[1]]: 'p2',
                turn: 'p1',
                streak: 0
            });

            return database.ref('queue').once('value').then(function(snapshot)
            {
                database.ref('queue/' + Object.keys(snapshot.val())[0]).remove();
                database.ref('queue/' + Object.keys(snapshot.val())[1]).remove();
                return database.ref('roomid').once('value').then(function(snapshot)
                {
                    database.ref().update({
                        roomid: snapshot.val() + 1
                    });
                    database.ref('users/' + currentuser.uid).update({
                        online: snapshot.val()
                    });
                });
            });
        });
    }
});

database.ref('users/').on('value', function(snapshot) {
    const filename = location.pathname.substring(location.pathname.lastIndexOf("/") + 1);
    if (Object.values(snapshot.val())[Object.keys(snapshot.val()).indexOf(auth.currentUser.uid)].online != false && filename != 'game.html')
    {
        return database.ref('users/' + currentuser.uid + '/online').once('value').then(function(snapshot)
        {
            var room = snapshot.val();
            return database.ref('rooms/' + snapshot.val()).once('value').then(function(snapshot)
            {
                var uid2 = Object.keys(snapshot.val())[(1 - Object.keys(snapshot.val()).indexOf(currentuser.uid))];
                database.ref('users/' + uid2).update({
                    online: room
                });
                window.location = 'game.html';
            });
        });
    }
    else if (Object.values(snapshot.val())[Object.keys(snapshot.val()).indexOf(auth.currentUser.uid)].online == false && filename != 'gameselect.html' && filename != 'offlinegame.html' && filename != 'singlegame.html')
    {
        window.location = 'gameselect.html';
    }
    return firebase.database().ref('users/' + auth.currentUser.uid + '/username').once('value').then(function(snapshot)
    {
        document.getElementById('changeusername').value = snapshot.val()
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
                    document.getElementById('coin').style.width = '0px';
                    setTimeout(widthback, 500)
                }
                else if (snapshot.val() == 'p2')
                {
                    document.getElementById('p2name').style.color = 'green';
                    document.getElementById('p1name').style.color = 'black';
                    document.getElementById('coin').style.left = '80%';
                    document.getElementById('coin').style.width = '0px';
                    setTimeout(widthback, 500)
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
    database.ref('users/' + auth.currentUser.uid).update({
        username: document.getElementById('changeusername').value
    });
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
    window.location = "offlinegame.html";
}

function singlegame()
{
    window.location = "singlegame.html";
}

function leavelocal()
{
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
        document.getElementById('coin').style.width = '0px';
        setTimeout(widthback, 550)
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
        document.getElementById('coin').style.width = '0px';
        setTimeout(widthback, 550)
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


function singleflip()
{
    var flip = rand();
    if (offlineturn == 1)
    {
        document.getElementById('p1name').style.color = 'green';
        document.getElementById('p2name').style.color = 'black';
        document.getElementById('coin').style.left = '20%';
        document.getElementById('coin').style.width = '0px';
        setTimeout(widthback, 500)
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
            document.getElementById('coinflip').style.background = '#C0392B';
            document.getElementById('coinflip').style.color = 'white';
            document.getElementById('coinflip').disabled = true;
            setTimeout(singleflip, 1000);
        }
    }
    else if (offlineturn == 2)
    {
        document.getElementById('p1name').style.color = 'black';
        document.getElementById('p2name').style.color = 'green';
        document.getElementById('coin').style.left = '80%';
        document.getElementById('coin').style.width = '0px';
        setTimeout(widthback, 500)
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
                setTimeout(singleflip, 1000);
            }
        }
        else
        {
            document.getElementById("coin").src = "tails.png";
            offlinestreak = 0;
            offlineturn = 1;
            document.getElementById('coinflip').style.background = 'white';
            document.getElementById('coinflip').style.color = 'black';
            document.getElementById('coinflip').disabled = false;
        }
    }
}

function widthback()
{
    document.getElementById('coin').style.width = '300px';
}

window.addEventListener("beforeunload", function(e){
    leavegame();
}, false);
