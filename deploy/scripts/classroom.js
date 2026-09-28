// Classroom server helper. Run inside the web container, for example:
//   docker compose exec web node deploy/scripts/classroom.js list-users
//
// Commands:
//   seed                       Load the map data into a fresh database (skipped if already done)
//   mark-offline               Mark the game server offline (lets it restart right after a crash)
//   list-users                 List accounts and their characters
//   make-admin <email>         Give an account admin rights (/admin pages, in-game ACCESS button)
//   remove-admin <email>       Take admin rights away
//   verify-all                 Mark every account's email as verified (removes the "not verified" debuff)
//   reset-password <email>     Print a link the student can open to choose a new password
//   allow-ip <ip> [limit]      Allow more characters online from one IP (default 40), e.g. a shared NAT address

const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const keys = require(path.join(root, "secretsandconfig/keys.js"));
const options = require(path.join(root, "secretsandconfig/options.js"));
const { MongoClient } = require(path.join(root, "node_modules/mongodb"));

function usage(message) {
	if (message) console.error(message + "\n");
	console.error(
		require("node:fs")
			.readFileSync(__filename, "utf8")
			.split("\n")
			.filter((line) => line.startsWith("//"))
			.map((line) => line.slice(3))
			.join("\n"),
	);
	process.exit(1);
}

async function with_db(fn) {
	const client = new MongoClient(keys.mongodb_uri, { serverSelectionTimeoutMS: 10000 });
	await client.connect();
	try {
		return await fn(client.db(keys.mongodb_name));
	} finally {
		await client.close();
	}
}

async function find_user(db, email) {
	if (!email) usage("Missing <email>");
	const user = await db.collection("user").findOne({ email: email.toLowerCase() });
	if (!user) {
		console.error("No account with the email " + email);
		process.exit(1);
	}
	return user;
}

const commands = {
	async seed() {
		const done = await with_db(async (db) => {
			if (await db.collection("map").countDocuments({}, { limit: 1 })) return true;
			const collections = await db.listCollections({}, { nameOnly: true }).toArray();
			if (collections.length) {
				throw new Error("The database has collections but no maps. Seeding needs an empty database: see deploy/README.md, 'Starting over'.");
			}
			return false;
		});
		if (done) return console.log("Map data is already loaded.");
		const result = spawnSync(process.execPath, ["scripts/seed_mongodb.js", "--confirm", keys.mongodb_name], { cwd: root, stdio: "inherit" });
		process.exitCode = result.status;
	},

	async "mark-offline"() {
		const ids = Object.values(options.servers).map((server) => "SR_" + server.region + server.name);
		await with_db((db) => db.collection("server").updateMany({ _id: { $in: ids } }, { $set: { online: false } }));
		console.log("Marked offline: " + ids.join(", "));
	},

	async "list-users"() {
		await with_db(async (db) => {
			const users = await db.collection("user").find({}, { projection: { email: 1, admin: 1, created: 1, "info.verified": 1 } }).sort({ created: 1 }).toArray();
			for (const user of users) {
				const characters = await db
					.collection("character")
					.find({ owner: user._id }, { projection: { name: 1, type: 1, level: 1, online: 1 } })
					.toArray();
				const flags = [user.admin && "admin", user.info && user.info.verified && "verified"].filter(Boolean).join(", ");
				console.log((user.email || []).join(" ") + (flags ? " [" + flags + "]" : ""));
				for (const c of characters) console.log("    " + c.name + " - level " + c.level + " " + c.type + (c.online ? " (online)" : ""));
			}
			console.log(users.length + " account(s)");
		});
	},

	async "make-admin"(email) {
		await with_db(async (db) => {
			const user = await find_user(db, email);
			await db.collection("user").updateOne({ _id: user._id }, { $set: { admin: true } });
			console.log(email + " is now an admin. Reload the game page to see the ACCESS button.");
		});
	},

	async "remove-admin"(email) {
		await with_db(async (db) => {
			const user = await find_user(db, email);
			await db.collection("user").updateOne({ _id: user._id }, { $set: { admin: false } });
			console.log(email + " is no longer an admin.");
		});
	},

	async "verify-all"() {
		await with_db(async (db) => {
			const result = await db.collection("user").updateMany({ "info.verified": { $ne: true } }, { $set: { "info.verified": true } });
			console.log("Verified " + result.modifiedCount + " account(s).");
		});
	},

	async "reset-password"(email) {
		await with_db(async (db) => {
			const user = await find_user(db, email);
			const key = crypto.randomBytes(15).toString("hex");
			await db.collection("user").updateOne({ _id: user._id }, { $set: { "info.password_key": key } });
			console.log("Give this link to the student (it works once):");
			console.log(options.base_url + "/reset/" + user._id + "/" + key);
		});
	},

	async "allow-ip"(ip, limit) {
		if (!ip) usage("Missing <ip>");
		const value = Number(limit || 40);
		await with_db((db) =>
			db.collection("ip").updateOne(
				{ _id: "IP_" + ip },
				{
					$set: { exception: true, "info.limit": value },
					// Same shape as get_ip_info() in adventure_functions.js creates
					$setOnInsert: {
						created: new Date(),
						users: [],
						characters: [],
						random_id: "",
						referrer: "",
						last_exception: null,
						"info.users": [],
						"info.characters": [],
						"info.metrics": {},
						"info.last_decay": new Date(),
					},
				},
				{ upsert: true },
			),
		);
		console.log("Up to " + value + "x the normal character limit is now allowed from " + ip + ".");
	},
};

const [command, ...args] = process.argv.slice(2);
if (!commands[command]) usage(command ? "Unknown command: " + command : "");
commands[command](...args).catch((error) => {
	console.error(error.message || error);
	process.exit(1);
});
