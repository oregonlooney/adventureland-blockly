// Tests for the Blockly Edition blocks, using the same vendored Blockly the game loads.
//   cd test/blockly && npm install && npm test
// These check the generated JavaScript and saved-file compatibility. verify_in_game.js runs the
// blocks inside a real game server.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "../..");
const dom = new JSDOM("<!doctype html><html><body></body></html>");
global.window = global;
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;
global.XMLSerializer = dom.window.XMLSerializer;

const blocklyDir = path.join(root, "js/blockly/13.3.0");
global.Blockly = require(path.join(blocklyDir, "blockly_compressed.js"));
require(path.join(blocklyDir, "blocks_compressed.js"));
global.javascript = require(path.join(blocklyDir, "javascript_compressed.js"));
Blockly.setLocale(require(path.join(blocklyDir, "msg/en.js")));
Blockly.utils.xml.injectDependencies({ document: dom.window.document, DOMParser: dom.window.DOMParser, XMLSerializer: dom.window.XMLSerializer });

// A small slice of the game data (G) for the dropdowns
global.G = {
	skills: {
		attack: { type: "ability", name: "Attack", target: true },
		use_hp: { type: "ability", name: "Use HP" },
		heal: { type: "ability", class: ["priest"], name: "Heal", target: true },
		stop: { type: "ability", name: "Stop" },
		burst: { type: "skill", class: ["mage"], name: "Mana Burst", target: true },
		blink: { type: "skill", class: ["mage"], name: "Blink" },
		charge: { type: "skill", class: ["warrior"], name: "Charge" },
		supershot: { type: "skill", class: ["ranger"], name: "Supershot", target: true },
		fart: { type: "skill", name: "Fart" },
		stack: { type: "passive" },
	},
	monsters: { goo: { name: "Goo", hp: 100 }, bee: { name: "Bee", hp: 300 }, grinch: { name: "Grinch", hp: 24000000 } },
	maps: {
		main: { name: "Mainland", monsters: [{ type: "goo" }, { type: "bee" }], spawns: [[0, 0]] },
		jail: { name: "Jail", irregular: true, spawns: [[0, 0]] },
		woffice: { name: "Wizard's office", instance: true, monsters: [{ type: "grinch" }], spawns: [[0, 0]] },
	},
};
global.character = null;

const run = (file) => vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file });
run("js/blockly/custom_blocks.js");
run("js/blockly/examples.js");
const gen = javascript.javascriptGenerator;
const AsyncFunction = (async () => {}).constructor;

function loadXml(xml) {
	const warnings = [];
	const warn = console.warn;
	console.warn = (...args) => warnings.push(args.join(" "));
	const workspace = new Blockly.Workspace();
	try {
		Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), workspace);
	} finally {
		console.warn = warn;
	}
	return { workspace, warnings };
}

function assertCompiles(code, label) {
	assert.doesNotThrow(() => new AsyncFunction(code), (label || "") + " generated invalid JavaScript:\n" + code);
}

// Block types and the field/input names the original 2024 version saved (from its js/custom_blocks.js).
// Changing any of these would break students' saved programs.
const LEGACY = {"attack":["TARGET"],"canAttack":["TARGET"],"castSpell":["SPELL_NAME","TARGET"],"checkBuffStatus":["BUFF_NAME"],"commentBlock":["COMMENT_TEXT"],"currentTarget":[],"declareVariable":["VAR","VALUE"],"dodgeAttack":["DIRECTION"],"followPlayer":["PLAYER_NAME"],"getCharacterHP":[],"getCharacterLevel":[],"getCharacterMP":[],"getCharacterX":[],"getCharacterY":[],"getMonsterAttribute":["ATTRIBUTE","MONSTER"],"getMonsterGold":["MONSTER"],"getMonsterHP":["MONSTER"],"getMonsterX":["MONSTER"],"getMonsterXP":["MONSTER"],"getMonsterY":["MONSTER"],"getNearestMonster":[],"getNearestMonsterOfType":["MONSTER_TYPE"],"getNearestMonsterWithOptions":["MIN_XP","MAX_ATT"],"getNearestPlayer":[],"getPlayerAttribute":["ATTRIBUTE","PLAYER"],"getPlayerByName":["PLAYER_NAME"],"getPlayerHPFromEntity":["PLAYER_ENTITY"],"getPlayerMPFromEntity":["PLAYER_ENTITY"],"getTargetedMonster":[],"isCharacterDead":[],"isCharacterMoving":[],"isInRange":["TARGET"],"isMonsterNear":["RANGE"],"isMonsterXpGoldBelow":["ATTRIBUTE","MONSTER","THRESHOLD"],"isMoving":["CHARACTER"],"logMessage":["MESSAGE"],"loot":[],"moveDown":["STEPS"],"moveLeft":["STEPS"],"moveRight":["STEPS"],"moveToEntity":["TARGET"],"moveToLocation":["LOCATION"],"moveUp":["STEPS"],"moveto":["X_COORD","Y_COORD"],"playerName":["PLAYER_NAME"],"setChatLog":["MESSAGE"],"setIntervalBlock":["INTERVAL","DO"],"setMessage":["MESSAGE"],"setTarget":["TARGET"],"stopAction":[],"useHpOrMp":[],"useItem":["ITEM_NAME"],"useSkill":["SKILL_NAME","TARGET"],"useSkillByName":["SKILL_NAME","TARGET"],"wait":["DURATION"]}; // prettier-ignore

const toolboxHtml = fs.readFileSync(path.join(root, "htmls/contents/blockly.html"), "utf8");
const toolboxTypes = [...new Set([...toolboxHtml.matchAll(/<block type="(\w+)"/g)].map((m) => m[1]))];
const customTypes = Object.keys(gen.forBlock).filter((type) => Blockly.Blocks[type] && fs.readFileSync(path.join(root, "js/blockly/custom_blocks.js"), "utf8").includes(`"${type}"`));

test("every original block still exists with the same field and input names", () => {
	const workspace = new Blockly.Workspace();
	for (const [type, names] of Object.entries(LEGACY)) {
		assert.ok(Blockly.Blocks[type], type + " is missing");
		const block = workspace.newBlock(type);
		for (const name of names) assert.ok(block.getField(name) || block.getInput(name), type + " lost " + name);
	}
});

test("a workspace saved by the original version loads without losing anything", () => {
	const xml = fs.readFileSync(path.join(__dirname, "fixtures/legacy_all_blocks.xml"), "utf8");
	const { workspace, warnings } = loadXml(xml);
	assert.strictEqual(workspace.getAllBlocks().length, Object.keys(LEGACY).length);
	// Old blocks had a LABEL text field that is now plain text; ignoring it is expected
	assert.deepStrictEqual(
		warnings.filter((w) => !/non-existent field LABEL/.test(w)),
		[],
	);
	const values = {};
	for (const block of workspace.getAllBlocks()) for (const input of block.inputList) for (const field of input.fieldRow) if (field.name) values[block.type + "." + field.name] = field.getValue();
	// Dropdown values that aren't in the new, shorter lists must be kept
	assert.strictEqual(values["useSkill.SKILL_NAME"], "burst");
	assert.strictEqual(values["castSpell.SPELL_NAME"], "supershot");
	assert.strictEqual(values["moveToLocation.LOCATION"], "jail");
	assert.strictEqual(values["getNearestMonsterOfType.MONSTER_TYPE"], "bee");
	assert.strictEqual(values["getMonsterAttribute.ATTRIBUTE"], "dead");
	assert.strictEqual(values["getPlayerAttribute.ATTRIBUTE"], "target");
	assert.strictEqual(values["moveUp.STEPS"], 42);
	assert.strictEqual(values["setIntervalBlock.INTERVAL"], 750);
	assert.strictEqual(values["followPlayer.PLAYER_NAME"], "Friend1");
	assertCompiles(gen.workspaceToCode(workspace), "legacy workspace");
});

test("every block in the toolbox exists", () => {
	for (const type of toolboxTypes) assert.ok(Blockly.Blocks[type], "toolbox lists unknown block " + type);
});

test("every custom block generates valid JavaScript on its own", () => {
	assert.ok(customTypes.length >= 60, "expected all custom blocks, found " + customTypes.length);
	for (const type of customTypes) {
		const workspace = new Blockly.Workspace();
		const block = workspace.newBlock(type);
		let code = gen.workspaceToCode(workspace);
		if (block.outputConnection) code = "var result = " + gen.blockToCode(block)[0] + ";";
		assertCompiles(code, type);
	}
});

test("the examples load cleanly and generate valid JavaScript", () => {
	assert.ok(BLOCKLY_EXAMPLES.length >= 1);
	for (const example of BLOCKLY_EXAMPLES) {
		const { workspace, warnings } = loadXml(example.xml);
		assert.deepStrictEqual(warnings, [], example.name);
		assert.ok(workspace.getAllBlocks().length > 3, example.name + " is empty");
		const code = gen.workspaceToCode(workspace);
		assertCompiles(code, example.name);
		for (const block of workspace.getAllBlocks()) assert.ok(block.isEnabled() && !block.getInheritedDisabled(), example.name + ": " + block.type + " is disabled");
	}
});

test("the starter bot does the classic fight loop", () => {
	const code = gen.workspaceToCode(loadXml(BLOCKLY_EXAMPLES[0].xml).workspace);
	for (const piece of ["respawn()", "use_hp_or_mp()", "loot()", "change_target(get_nearest_monster({ min_xp: 100, max_att: 120 }))", "await attack(target)", "await sleep(250)"])
		assert.ok(code.includes(piece), "starter bot is missing " + piece + "\n" + code);
});

test("dropdowns list the player's class skills and normal places only", () => {
	const workspace = new Blockly.Workspace();
	const options = (type, field) =>
		workspace
			.newBlock(type)
			.getField(field)
			.getOptions()
			.map((option) => option[1]);
	global.character = { ctype: "mage" };
	try {
		const skills = options("useSkill", "SKILL_NAME");
		assert.ok(skills.includes("burst") && skills.includes("attack") && skills.includes("use_hp"));
		assert.ok(!skills.includes("charge") && !skills.includes("heal") && !skills.includes("fart") && !skills.includes("stack") && !skills.includes("stop"));
		assert.deepStrictEqual(options("castSpell", "SPELL_NAME"), ["burst"]);
	} finally {
		global.character = null;
	}
	assert.deepStrictEqual(options("getNearestMonsterOfType", "MONSTER_TYPE"), ["goo", "bee"]);
	const places = options("moveToLocation", "LOCATION");
	assert.ok(places.includes("potions") && places.includes("main"));
	assert.ok(!places.includes("jail") && !places.includes("woffice"));
});

test("blocks that check things give true/false, not undefined", () => {
	const code = (xml) => {
		const { workspace } = loadXml(`<xml xmlns="https://developers.google.com/blockly/xml">${xml}</xml>`);
		gen.init(workspace);
		return gen.blockToCode(workspace.getTopBlocks()[0])[0];
	};
	const monster = { type: "monster", mtype: "goo", hp: 50 };
	const evaluate = (expression, scope) => new Function(...Object.keys(scope), "return " + expression)(...Object.values(scope));
	const scope = { G, get_entity: () => null };
	scope.m = monster;
	const attr = (type, input, name) =>
		`<block type="${type}"><field name="ATTRIBUTE">${name}</field><value name="${input}"><block type="variables_get"><field name="VAR">m</field></block></value></block>`;
	assert.strictEqual(evaluate(code(attr("getMonsterAttribute", "MONSTER", "dead")), scope), false);
	assert.strictEqual(evaluate(code(attr("getMonsterAttribute", "MONSTER", "moving")), scope), false);
	assert.strictEqual(evaluate(code(attr("getPlayerAttribute", "PLAYER", "rip")), scope), false);
	assert.strictEqual(evaluate(code(attr("getPlayerAttribute", "PLAYER", "party")), scope), "");
	scope.m = null;
	assert.strictEqual(evaluate(code(attr("getMonsterAttribute", "MONSTER", "hp")), scope), undefined);
});

test("functions made with blocks can use movement blocks", () => {
	const { workspace } = loadXml(`<xml xmlns="https://developers.google.com/blockly/xml">
    <block type="procedures_defnoreturn"><field name="NAME">walk</field><statement name="STACK"><block type="moveUp"></block></statement></block>
    <block type="setIntervalBlock" y="100"><statement name="DO"><block type="procedures_callnoreturn"><mutation name="walk"></mutation></block></statement></block>
  </xml>`);
	const code = gen.workspaceToCode(workspace);
	assert.match(code, /async function walk\(\)/);
	assert.match(code, /await walk\(\);/);
	assertCompiles(code, "procedures");
});
