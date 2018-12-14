chattr - an abstraction over redis pubsub
===========================

This is an extension of node's redis library which enables communication between microservices written around redis' pubsub system. Incoming messages pass the service a callback, and publish calls return a promise that resolves when the listener executes the callback (or optionally rejects after a timeout); otherwise chattr is a drop-in replacement for redis.createClient(), except for handling conversion from JSON to strings for you automatically.

Install with:
       `npm install chattr`
	   (eventually)
	   
### Usage Examples

Increment as a service:
```js
const redis = require("redis");
const pub = redis.createClient();
const sub = redis.createClient();
const chattr = require("chattr")(pub, sub);

chattr.on("message", (channel, message, callback) => {
  if (channel === increment && !isNaN(message)) {
    callback(message + 1);
  }
});

chattr.subscribe("increment");
```

Consumer of increment service:
```js
const redis = require("redis");
const pub = redis.createClient();
const sub = redis.createClient();
const chattr = require("chattr")(pub, sub, 3000); // last argument is the optional timeout in milliseconds

function main() {
  chattr.publish("increment", 42)
    .then(response => console.log(response)) // logs 43
	.catch(console.dir)
}

main();
```
