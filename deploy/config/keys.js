// Classroom deployment keys (copied to secretsandconfig/keys.js inside the Docker image).
// Values come from the .env file that deploy/setup.sh generates. Never commit real values.
// The web server and the game server are separate processes, so these MUST be fixed values:
// if each process generated its own random keys, they couldn't talk to each other.

function required(name) {
	var value = process.env[name];
	if (!value) throw new Error("Missing " + name + " - run deploy/setup.sh to create the .env file");
	return value;
}

module.exports = {
	server_keyword: required("SERVER_MASTER"),
	mongodb_uri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/?replicaSet=rs0",
	mongodb_name: process.env.MONGODB_NAME || "adventureland",
	mongodb_config: {},
	stripe_test_api_key: "",
	stripe_test_pkey: "",
	stripe_api_key: "",
	stripe_pkey: "",
	steam_web_apikey: "",
	steam_publisher_web_apikey: "",
	sdk_password: required("SERVER_MASTER"),
	amazon_ses_user: "",
	amazon_ses_key: "",
	ACCESS_MASTER: required("ACCESS_MASTER"),
	BOT_MASTER: required("BOT_MASTER"),
	SERVER_MASTER: required("SERVER_MASTER"),
	discord_token: "",
	apple_token: "",
	steam_key: "",
};
