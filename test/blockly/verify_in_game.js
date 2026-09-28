// Runs every Blockly Edition block inside a real game server, in a real browser, and reports what
// each one did. Needs a running server (see deploy/README.md) and Chromium for Playwright:
//   cd test/blockly && npm install && npx playwright install chromium
//   BASE=http://localhost node verify_in_game.js
// Options: BASE (server URL), CLASS (character class, default mage), CHROMIUM (path to a chromium binary)

const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost";
const CLASS = process.env.CLASS || "mage";
const NAME = "Tester" + Math.floor(Math.random() * 100000);

const num = (n) => `<block type="math_number"><field name="NUM">${n}</field></block>`;
const txt = (t) => `<block type="text"><field name="TEXT">${t}</field></block>`;
const B = (type, inner = "") => `<block type="${type}">${inner}</block>`;
const V = (name, block) => `<value name="${name}">${block}</value>`;
const F = (name, v) => `<field name="${name}">${v}</field>`;
const nearest = B("getNearestMonster");
const me = () => B("getPlayerByName", F("PLAYER_NAME", NAME));

const isNum = (r) => (typeof r.value === "number" && !isNaN(r.value) ? null : "expected a number, got " + r.repr);
const isBool = (r) => (typeof r.value === "boolean" ? null : "expected true/false, got " + r.repr);
const isEntity = (r) => (r.repr.startsWith("entity:") ? null : "expected a monster/player, got " + r.repr);
const isText = (r) => (typeof r.value === "string" ? null : "expected text, got " + r.repr);
const says = (text) => (r) => ((r.message || "").includes(text) ? null : "expected the message '" + text + "', got '" + r.message + "'");
const logs = (text) => (r) => (r.log.includes(text) ? null : "expected '" + text + "' in the game log");

// [label, block xml, "action" | "value", check(result, before, after)]
function cases() {
	const list = [
		["moveto", B("moveto", F("X_COORD", "__X__") + F("Y_COORD", "__Y__")), "action", (r, b, a) => (Math.abs(a.x - b.x) > 5 ? null : "didn't move")],
		["moveUp", B("moveUp", F("STEPS", 25)), "action", (r, b, a) => (b.y - a.y > 10 ? null : "didn't move up")],
		["moveDown", B("moveDown", F("STEPS", 25)), "action", (r, b, a) => (a.y - b.y > 10 ? null : "didn't move down")],
		["moveLeft", B("moveLeft", F("STEPS", 25)), "action", (r, b, a) => (b.x - a.x > 10 ? null : "didn't move left")],
		["moveRight", B("moveRight", F("STEPS", 25)), "action", (r, b, a) => (a.x - b.x > 10 ? null : "didn't move right")],
		["moveToEntity(nearest)", B("moveToEntity", V("TARGET", nearest)), "action"],
		["followPlayer(nobody)", B("followPlayer", F("PLAYER_NAME", "nobody_here")), "action", says("Player not found")],
		["dodgeAttack(left)", B("dodgeAttack", V("DIRECTION", txt("left"))), "action", (r, b, a) => (b.x - a.x > 10 ? null : "didn't dodge")],
		["stopAction", B("stopAction"), "action"],
		["setTarget(nearest)", B("setTarget", V("TARGET", nearest)), "action", (r, b, a) => (a.target ? null : "no target set")],
		["attack(nearest)", B("attack", V("TARGET", nearest)), "action"],
		["attack(nothing)", B("attack", V("TARGET", B("logic_null"))), "action", says("Nothing to attack")],
		["useSkill(attack)", B("useSkill", F("SKILL_NAME", "attack") + V("TARGET", nearest)), "action"],
		["useSkill(charge: another class)", B("useSkill", F("SKILL_NAME", "charge") + V("TARGET", nearest)), "action", says("is not a")],
		["castSpell(attack)", B("castSpell", F("SPELL_NAME", "attack") + V("TARGET", nearest)), "action"],
		["useSkillByName(attack)", B("useSkillByName", F("SKILL_NAME", "attack") + V("TARGET", nearest)), "action"],
		["heal(me)", B("heal", V("TARGET", me())), "action"],
		["respawn (alive)", B("respawn"), "action"],
		["useHpOrMp", B("useHpOrMp"), "action"],
		["useItem(missing)", B("useItem", V("ITEM_NAME", txt("elixirluck"))), "action", says("No elixirluck")],
		["loot", B("loot"), "action"],
		["buyItem(far from shop)", B("buyItem", F("QUANTITY", 1) + V("ITEM_NAME", txt("hpot0"))), "action", says("Can't buy")],
		["partyInvite(nobody)", B("partyInvite", F("PLAYER_NAME", "nobody_here")), "action"],
		["partyAccept(nobody)", B("partyAccept", F("PLAYER_NAME", "nobody_here")), "action"],
		["setMessage", B("setMessage", V("MESSAGE", txt("msg test"))), "action", says("msg test")],
		["setChatLog", B("setChatLog", V("MESSAGE", txt("log test"))), "action", logs("log test")],
		["say", B("say", V("MESSAGE", txt("hello class"))), "action"],
		["logMessage", B("logMessage", V("MESSAGE", txt("console test"))), "action"],
		["wait(300)", B("wait", V("DURATION", num(300))), "action", (r) => (r.ms >= 280 ? null : "didn't wait")],
		["waitUntil(true)", B("waitUntil", V("CONDITION", B("logic_boolean", F("BOOL", "TRUE")))), "action"],
		["commentBlock", B("commentBlock"), "action"],
		["declareVariable", B("declareVariable", F("VAR", "x") + F("VALUE", "5")), "action"],
		["getCharacterHP", B("getCharacterHP"), "value", isNum],
		["getCharacterMP", B("getCharacterMP"), "value", isNum],
		["getCharacterX", B("getCharacterX"), "value", isNum],
		["getCharacterY", B("getCharacterY"), "value", isNum],
		["getCharacterLevel", B("getCharacterLevel"), "value", isNum],
		["isCharacterMoving", B("isCharacterMoving"), "value", isBool],
		["isCharacterDead", B("isCharacterDead"), "value", isBool],
		["checkBuffStatus", B("checkBuffStatus", V("BUFF_NAME", txt("mluck"))), "value", isBool],
		["getNearestPlayer", B("getNearestPlayer"), "value"],
		["getPlayerByName(me)", me(), "value", isEntity],
		["playerName", B("playerName", F("PLAYER_NAME", "bob")), "value", isText],
		["isMoving(my name)", B("isMoving", V("CHARACTER", B("playerName", F("PLAYER_NAME", NAME)))), "value", isBool],
		["getNearestMonster", nearest, "value", isEntity],
		["getNearestMonsterOfType(__TYPE__)", B("getNearestMonsterOfType", F("MONSTER_TYPE", "__TYPE__")), "value", isEntity],
		["getNearestMonsterWithOptions(1,1000)", B("getNearestMonsterWithOptions", V("MIN_XP", num(1)) + V("MAX_ATT", num(1000))), "value", isEntity],
		["getTargetedMonster", B("getTargetedMonster"), "value"],
		["currentTarget", B("currentTarget"), "value"],
		["entityExists(nearest)", B("entityExists", V("ENTITY", nearest)), "value", (r) => (r.value === true ? null : "expected true")],
		["entityExists(nothing)", B("entityExists", V("ENTITY", B("logic_null"))), "value", (r) => (r.value === false ? null : "expected false")],
		["canAttack(nearest)", B("canAttack", V("TARGET", nearest)), "value", isBool],
		["canUseSkill(attack)", B("canUseSkill", F("SKILL_NAME", "attack")), "value", isBool],
		["isInRange(nearest)", B("isInRange", V("TARGET", nearest)), "value", isBool],
		["distanceTo(nearest)", B("distanceTo", V("TARGET", nearest)), "value", isNum],
		["isMonsterNear(300)", B("isMonsterNear", F("RANGE", 300)), "value", isBool],
		["isMonsterXpGoldBelow(xp)", B("isMonsterXpGoldBelow", V("MONSTER", nearest) + F("ATTRIBUTE", "xp") + V("THRESHOLD", num(1000))), "value", isBool],
		["isMonsterXpGoldBelow(gold)", B("isMonsterXpGoldBelow", V("MONSTER", nearest) + F("ATTRIBUTE", "gold") + V("THRESHOLD", num(1000))), "value", isBool],
		["itemCount(hpot0)", B("itemCount", V("ITEM_NAME", txt("hpot0"))), "value", isNum],
		["getMonsterHP", B("getMonsterHP", V("MONSTER", nearest)), "value", isNum],
		["getMonsterXP", B("getMonsterXP", V("MONSTER", nearest)), "value", isNum],
		["getMonsterGold", B("getMonsterGold", V("MONSTER", nearest)), "value", isNum],
		["getMonsterX", B("getMonsterX", V("MONSTER", nearest)), "value", isNum],
		["getMonsterY", B("getMonsterY", V("MONSTER", nearest)), "value", isNum],
		["getPlayerHPFromEntity", B("getPlayerHPFromEntity", V("PLAYER_ENTITY", me())), "value", isNum],
		["getPlayerMPFromEntity", B("getPlayerMPFromEntity", V("PLAYER_ENTITY", me())), "value", isNum],
	];
	for (const stat of ["hp", "hp_percent", "max_hp", "mp", "mp_percent", "max_mp", "level", "xp", "max_xp", "gold", "real_x", "real_y", "attack", "range", "speed"])
		list.push(["myStat(" + stat + ")", B("myStat", F("STAT", stat)), "value", isNum]);
	const defined = (r) => (r.repr === "undefined" ? "undefined" : null);
	for (const a of ["hp", "max_hp", "level", "xp", "gold", "attack", "speed", "range", "mtype", "real_x", "real_y", "moving", "dead"])
		list.push(["getMonsterAttribute(" + a + ")", B("getMonsterAttribute", F("ATTRIBUTE", a) + V("MONSTER", nearest)), "value", defined]);
	for (const a of ["hp", "max_hp", "mp", "max_mp", "level", "name", "ctype", "real_x", "real_y", "moving", "party", "rip"])
		list.push(["getPlayerAttribute(" + a + ")", B("getPlayerAttribute", F("ATTRIBUTE", a) + V("PLAYER", me())), "value", defined]);
	list.push(["goToTown", B("goToTown"), "action"]);
	return list;
}

async function main() {
	const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
	const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, ignoreHTTPSErrors: true });
	const pageErrors = [];
	page.on("pageerror", (error) => pageErrors.push(error.message));

	// Sign up, create a character and enter the game
	await page.goto(BASE + "/");
	await page.evaluate((email) => api_call("signup_or_login", { email, password: "test", only_signup: true }), NAME.toLowerCase() + "@test.lan");
	await page.waitForTimeout(1500);
	await page.goto(BASE + "/");
	await page.evaluate(([name, cls]) => api_call("create_character", { name, char: cls, look: 0 }), [NAME, CLASS]);
	await page.waitForTimeout(1500);
	await page.goto(BASE + "/character/" + NAME + "/in/US/I/");
	await page.waitForFunction(() => window.character && window.character.real_x !== undefined && window.blockly_workspace, null, { timeout: 60000 });
	await page.evaluate(() => {
		try {
			hide_modal();
		} catch (e) {}
		start_runner(0, "");
	});
	await page.waitForFunction(() => document.getElementById("maincode") && document.getElementById("maincode").contentWindow.smart_move, null, { timeout: 20000 });
	const runner = (code) => page.evaluate((code) => document.getElementById("maincode").contentWindow.eval(code), code);
	await runner("smart_move('goo')").catch(() => {});
	const monsterType = await runner("(get_nearest_monster() || {}).mtype || 'goo'");
	console.log("Character " + NAME + " (" + CLASS + ") next to " + monsterType + "s\n");

	let failed = 0;
	for (const [label0, xml0, kind, check] of cases()) {
		const label = label0.replace("__TYPE__", monsterType);
		const before = await page.evaluate(() => ({ x: character.real_x, y: character.real_y }));
		const xml = xml0
			.replace("__X__", Math.round(before.x + 40))
			.replace("__Y__", Math.round(before.y))
			.replace("__TYPE__", monsterType);
		const r = await page.evaluate(
			async ([xml, kind]) => {
				const workspace = new Blockly.Workspace();
				const wrapped = kind === "value" ? `<block type="variables_set"><field name="VAR">result</field><value name="VALUE">${xml}</value></block>` : xml;
				Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(`<xml xmlns="https://developers.google.com/blockly/xml">${wrapped}</xml>`), workspace);
				const code = javascript.javascriptGenerator.workspaceToCode(workspace);
				workspace.dispose();
				const frame = document.getElementById("maincode");
				frame.contentWindow.current_message = ""; // set_message stores the text here and draws it later
				const logBefore = $("#gamelog").children().length;
				const started = Date.now();
				let result, error;
				try {
					const body = "(async () => {\n" + code + (kind === "value" ? "\nreturn result;" : "") + "\n})()";
					result = await Promise.race([frame.contentWindow.eval(body), new Promise((_, reject) => setTimeout(() => reject(new Error("still running after 15s")), 15000))]);
				} catch (e) {
					error = (e && (e.message || e.reason || JSON.stringify(e))) || String(e);
				}
				const describe = (v) =>
					v === undefined
						? "undefined"
						: v === null
							? "null"
							: typeof v === "object" && (v.type === "monster" || v.type === "character")
								? "entity:" + (v.mtype || v.name)
								: typeof v === "object"
									? "object"
									: JSON.stringify(v);
				return {
					value: typeof result === "object" ? null : result,
					repr: describe(result),
					error,
					ms: Date.now() - started,
					log: $("#gamelog")
						.children()
						.slice(logBefore)
						.map((i, e) => $(e).text())
						.get()
						.join(" | "),
					message: String(frame.contentWindow.current_message || ""),
				};
			},
			[xml, kind],
		);
		await page.waitForTimeout(kind === "action" ? 1000 : 50);
		const after = await page.evaluate(() => ({ x: character.real_x, y: character.real_y, target: character.target || null }));
		const problem = r.error ? "ERROR: " + r.error : check ? check(r, before, after) : null;
		if (problem) failed++;
		console.log(
			(problem ? "FAIL " : "ok   ") + label.padEnd(36) + (kind === "value" ? "-> " + r.repr : r.ms + "ms") + (r.message ? "  [" + r.message + "]" : "") + (problem ? "  <== " + problem : ""),
		);
	}

	// The example programs, running for real (back next to the monsters first)
	console.log("");
	await runner("smart_move('" + monsterType + "')").catch(() => {});
	for (const index of [1, 0]) {
		const result = await page.evaluate(async (index) => {
			blockly_load_xml(BLOCKLY_EXAMPLES[index].xml);
			await new Promise((resolve) => setTimeout(resolve, 500)); // the code box updates just after the blocks change
			const start = { x: character.real_x, xp: character.xp, log: $("#gamelog").children().length };
			runBlocklyCode();
			await new Promise((resolve) => setTimeout(resolve, 20000));
			const log = $("#gamelog")
				.children()
				.slice(start.log)
				.map((i, e) => $(e).text())
				.get();
			stopBlocklyCode();
			return { name: BLOCKLY_EXAMPLES[index].name, xp: character.xp - start.xp, errors: log.filter((line) => /Blockly:|error/i.test(line)), lines: log.length };
		}, index);
		const problem = result.errors.length ? "errors: " + result.errors.join(" | ") : index === 0 && result.xp <= 0 ? "gained no XP in 20s" : null;
		if (problem) failed++;
		console.log((problem ? "FAIL " : "ok   ") + ("example: " + result.name).padEnd(36) + "XP +" + result.xp + ", " + result.lines + " log lines" + (problem ? "  <== " + problem : ""));
	}

	console.log("\npage errors: " + (pageErrors.length ? pageErrors.join(" | ") : "none"));
	console.log(failed ? failed + " FAILED" : "ALL PASSED");
	await browser.close();
	process.exit(failed ? 1 : 0);
}

main().catch((error) => {
	console.error(error);
	process.exit(2);
});
