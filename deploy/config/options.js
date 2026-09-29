// Classroom deployment options (copied to secretsandconfig/options.js inside the Docker image).
// Values come from the .env file that deploy/setup.sh generates.

// The address students type into their browser: a LAN IP (192.168.1.50) or hostname (adventure.lan)
var public_host = process.env.PUBLIC_HOST || "localhost";
var web_port = Number(process.env.WEB_PORT || 80);
var game_port = Number(process.env.GAME_PORT || 7192);
var base_url = "http://" + public_host + (web_port == 80 ? "" : ":" + web_port);
// Browsers connect straight to the game server, on its own port
var game_address = public_host + ":" + game_port;

// Behind a Cloudflare Tunnel (deploy/CLOUDFLARE.md) everything shares one https address:
// the tunnel sends /socket.io/ to the game server and everything else to the website
if (process.env.PUBLIC_URL) {
	var public_url = new URL(process.env.PUBLIC_URL);
	base_url = public_url.origin;
	game_address = public_url.host;
}

machines = {
	local: {
		key: "",
		ip: "0.0.0.0",
		user: "",
	},
};

servers = {
	classroom: {
		region: "US",
		name: "I",
		path: "/socket.io/",
		msgpack_path: "/msgpack/", // required by the game server, even though the browser client doesn't use it
		api_path: "/server.api/",
		local_ip: "0.0.0.0",
		local_port: game_port,
		// Students' browsers connect straight to this address, so it must be reachable from their computers
		address: game_address,
		// The website reaches the game server here (both run on this machine, see docker-compose.yml)
		internal_address: "127.0.0.1:" + game_port,
		machine: "local",
		db: "dev",
		secure: false,
		nginx: false,
		Dev: true,
	},
};

module.exports = {
	project_name: "adventureland",
	name: "Adventure Land",
	base_url: base_url,
	// Dev must stay on: web signups (the "Free Signup [Educational Use]" link) only work in Dev mode
	Dev: true,
	Local: true,
	Prod: false,
	Staging: false,
	Engine: "mongodb",
	observer_map: "main",
	merchant_map: "main",
	port: web_port,
	close_timeout: 4000,
	ip_limit: Number(process.env.IP_LIMIT || 3),
	character_limit: 3,
	fast_sdk: 0,
	machines: machines,
	servers: servers,
	cookie_key: "auth",
	// Game events to switch off (DISABLED_EVENTS in .env, comma-separated, empty = none). By default the
	// anniversary event is off: it asks players to find a featured player and send them a kiss.
	disabled_events: (process.env.DISABLED_EVENTS === undefined ? "anniversary" : process.env.DISABLED_EVENTS)
		.split(",")
		.map((name) => name.trim())
		.filter(Boolean),
	// NEVER turn this on for a server students can reach: it makes every visitor an admin,
	// including POST /api/execute, which runs any JavaScript on the server.
	// Use deploy/scripts/classroom.js make-admin <email> instead.
	unsecure_admin: false,
};
