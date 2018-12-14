const uuid = require("uuid/v4");

/*
	chattr.publish("premium:check", JSON.stringify({ org_id })).then(console.log).catch(console.dir);

	publish returns a promise that fulfills when the service responds. Service must use redisCallback in its implementation
	of the given channel to work, otherwise call will time out.

	usage is the same as redis client, must pass in sub & pub
	i.e.:
	const chattr = require("chattr")(sub, pub);

	chattr.on("message", (channel, message, callback) => {
		try { message = JSON.parse(message); } catch (e) {}
		// handle service logic
		// return to caller
		callback(data);
	});

	chattr.subscribe("premium:check");
*/

const INTERNAL = ":_INTERNAL_REDIS_CALLBACK_:";

const getBackChannel = channel => channel + INTERNAL + "response";

const sleep = ms => new Promise((resolve, reject) => {
	let id = setTimeout(() => {
		clearTimeout(id);
		reject(`Request timed out in ${ms} milliseconds.`);
	}, ms);
});

module.exports = (pub, sub, ms = null) => ({
	on: (event, handler) => {
		sub.on(event, (channel, message) => {
			if (!channel.includes(INTERNAL)) {
				try { message = JSON.parse(message); } catch (e) { throw "Invalid JSON request."; }
				const ack = message[INTERNAL];
				const backchannel = getBackChannel(channel);
				handler(channel, message.message, message => {
					message = { message };
					message[INTERNAL] = ack;
					pub.publish(backchannel, JSON.stringify(message));
				});
			}
		});
	},
	subscribe: channel => {
		sub.subscribe(channel);
	},
	publish: (channel, message) => {
		const backchannel = getBackChannel(channel);
		const ack = uuid();
		sub.subscribe(backchannel);
		message = { message };
		message[INTERNAL] = ack;
		pub.publish(channel, JSON.stringify(message));
		const response = new Promise((resolve, reject) => {
			sub.on("message", (channel, message) => {
				try { message = JSON.parse(message); } catch (e) { reject("Invalid JSON response."); }
				if (channel === backchannel && message[INTERNAL] === ack) {
					sub.unsubscribe(backchannel);
					resolve(message.message);
				}
			});
		});
		if (ms) return Promise.race([response, sleep(ms)]);
		else return response;
	}
});
