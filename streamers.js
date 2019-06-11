var users = {};


function createStreamer(streamId, clientId) {
    users[streamId] = clientId;
}

function removeStreamer(streamId) {
    delete users[streamId]
    console.log("wdwaadwt")
    console.log(users);
}

function getStreamers(){
    return users;
}

module.exports = {createStreamer, removeStreamer, getStreamers}