var HTTP_GET_TIMEOUT = 60000; // 1 minute
var USERS_UPDATE_TIMEOUT = 5000; // 5 seconds
var API_URL = "https://metaverse.highfidelity.com/api/v1/users?status=online";
var API_FRIENDS_FILTER = "&filter=friends";
var FRIENDS_ONLY = false;
var PUBLIC_ONLY = true;
var usersTimer;
var users = [];

function XHR(url, successCb, failureCb) {
    var self = this;
    var TIMEOUT = 60000; // 1 minute
    this.url = url;
    this.successCb = successCb;
    this.failureCb = failureCb;
    this.req = new XMLHttpRequest();
    this.req.open("GET", url, true);
    this.req.timeout = TIMEOUT;
    this.req.ontimeout = function () {
        if (self.failureCb) {
            self.failureCb(0, "timeout");
        }
    };
    this.req.onreadystatechange = function () {
        if (self.req.readyState === self.req.DONE) {
            if (self.req.status === 200) {
                if (self.successCb) {
                    self.successCb(self.req.responseText);
                }
            }
        }
    };
    this.req.send();
}

function pollUsers() {
    var url = API_URL;

    if (FRIENDS_ONLY) {
        url += API_FRIENDS_FILTER;
    }

    usersRequest = new XHR(url, function (response) {
        var obj = JSON.parse(response);
        if (obj.status !== "success") {
            print("Error: Request for users status returned status = " + obj.status);
            usersTimer = Script.setTimeout(pollUsers, HTTP_GET_TIMEOUT); // Try again
        } else if (!obj.hasOwnProperty("data") || !obj.data.hasOwnProperty("users")) {
            print("Error: Request for users status returned invalid data");
            usersTimer = Script.setTimeout(pollUsers, HTTP_GET_TIMEOUT); // Try again
        } else {
            users = obj.data.users;
        }
    }, function () {
        print("Error: Request for users status returned invalid data");
        usersTimer = Script.setTimeout(pollUsers, HTTP_GET_TIMEOUT); // Try again
    });
}

function initEnter() {
    location = "localhost";
    pollUsers();
}

function initUpdate(dt) {
    if (users && users.length > 0) {
        var i, l = users.length;
        for (i = 0; i < l; i++) {
            print("    " + users[i].username);
        }
        setState("idle");
    }
}

function idleEnter() {
    location = "localhost";
    pollUsers();
}

var visited = {};
var visitingUser;
var visitingDone;

var REVISIT_TIME = 3 * 60 * 1000;
function idleUpdate(dt) {
    // pick someone to visit?
    if (users && users.length > 0) {
        var choice = ~~(Math.random() * users.length);
        var candidate = users[choice];

        if (candidate && (!PUBLIC_ONLY || candidate.location.root)) {
            if (candidate.username != GlobalServices.username) {
                if (!visited[candidate.username] || visited[candidate.username] + REVISIT_TIME < Date.now()) {
                    visitingUser = candidate;
                    visited[candidate.username] = Date.now();
                    setState("visit");
                } else {
                    print("rejected " + candidate.username + " already visited " + (Date.now() - visited[candidate.username]) / 1000 + " seconds ago");
                }
            } else {
                print("rejected " + candidate.username + " is myself!");
            }
        }
        // try again next frame...
    }
}

var visitAudioReady;
var visitSound;
var visitInjector;
var AUDIO_URL = "file:///Users/ajt/code/hello-bot/greeting";

function visitEnter() {

    print("visitingUser = " + JSON.stringify(visitingUser));

    location.goToUser(visitingUser.username);

    visitSound = undefined;
    visitInjector = undefined;

    visitingDone = false;
    Script.setTimeout(function () {
        var req = new XHR("http://localhost:8080/?username=" + visitingUser.username, function () {
            Script.setTimeout(function () {
                visitAudioReady = true;
                Script.setTimeout(function () {
                    visitingDone = true;
                }, 10000);
            }, 1000);
        }, function () {});
    }, 5000);

    visitAudioReady = false;
}

function visitUpdate(dt) {
    if (visitAudioReady) {
        visitSound = SoundCache.getSound(AUDIO_URL + "_" + visitingUser.username + ".wav" + "?" + ~~(Math.random() * 10000));
    }
    if (visitAudioReady && visitSound.downloaded && !visitInjector) {
        visitInjector = Audio.playSound(visitSound, { position: MyAvatar.position, volume: 1, loop: false });
    }
    if (visitingDone) {
        setState("idle");
    }
}

var stateTable = {
    uninitialized: {},
    init: { enter: initEnter, update: initUpdate },
    idle: { enter: idleEnter, update: idleUpdate },
    visit: { enter: visitEnter, update: visitUpdate },
};

///
///
///

var state = "uninitialized";
var timeInState = 0;
var stateEnterTime = Date.now();

function setState(newState) {
    if (state !== newState) {

        // exit old state
        if (stateTable[state]) {
            var exitFunc = stateTable[state].exit;
            if (exitFunc) {
                exitFunc();
            }
        } else {
            print("ERROR: no state table for state = " + state);
        }

        stateEnterTime = Date.now();
        timeInState = 0;

        // enter new state
        if (stateTable[newState]) {
            var enterFunc = stateTable[newState].enter;
            if (enterFunc) {
                enterFunc();
            }
        } else {
            print("ERROR: no state table for state = " + newState);
        }

        state = newState;
        print("state = " + state);
    }
}

function update(dt) {
    var updateFunc = stateTable[state].update;

    timeInState = (Date.now() - stateEnterTime) / 1000.0;

    if (updateFunc) {
        updateFunc(dt);
    }
}

Script.update.connect(update);

setState("init");
