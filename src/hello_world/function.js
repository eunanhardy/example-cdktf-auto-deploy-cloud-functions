const functions = require('firebase-functions');

exports.handler = functions.https.onRequest((request, response) => {
    response.send("Hello World 2");
});