// Adventure Land - Blockly Edition: the Adventure Land blocks.
//
// Each block is defined once, with its look (build) and the JavaScript it becomes (code), grouped by
// the toolbox category it appears in (htmls/contents/blockly.html). The generated JavaScript runs in
// the game's CODE runner, so it can use every function from the runner API
// (js/runner_functions.js, js/runner_compat.js): move, smart_move, attack, use_skill, ...
//
// Saved workspaces (.xml files and the browser's autosave) store block TYPE names, FIELD names and
// INPUT names. Never rename those, or students' saved programs stop loading. Retired blocks stay
// defined (see "Retired blocks" at the end) and are just left out of the toolbox.
//
// Tests: node --test test/blockly/   (see BLOCKLY.md)

const gen = javascript.javascriptGenerator;
const Order = javascript.Order;

// One colour (hue) per toolbox category; the toolbox uses the same numbers
const COLOURS = {
	loop: 120,
	movement: 30,
	combat: 0,
	me: 260,
	monsters: 345,
	players: 300,
	items: 180,
	output: 60,
	party: 200,
};

function defineBlock(type, colour, build, code) {
	Blockly.Blocks[type] = {
		init: function () {
			this.setColour(colour);
			this.setHelpUrl("");
			build.call(this);
		},
	};
	gen.forBlock[type] = code;
}

// A block that does something (snaps into a stack)
function action(block, tooltip) {
	block.setPreviousStatement(true, null);
	block.setNextStatement(true, null);
	block.setTooltip(tooltip);
}

// A block that gives back a value (plugs into another block)
function value(block, type, tooltip) {
	block.setOutput(true, type);
	block.setTooltip(tooltip);
}

function valueOr(block, name, fallback, order) {
	return gen.valueToCode(block, name, order === undefined ? Order.NONE : order) || fallback;
}

function quote(text) {
	return gen.quote_(text || "");
}

// ---------------------------------------------------------------------------
// Dropdowns filled from the game data (G)
// ---------------------------------------------------------------------------

// A dropdown whose list comes from the game data. If a saved program uses a value that isn't in
// the list (another class's skill, a map removed from the list), the value is kept instead of
// being silently replaced by the first option.
class GameDropdown extends Blockly.FieldDropdown {
	doClassValidation_(newValue) {
		if (typeof newValue === "string" && newValue) this.savedValue_ = newValue;
		return super.doClassValidation_(newValue);
	}
	getOptions() {
		const options = super.getOptions(false).slice();
		const saved = this.savedValue_;
		if (saved && !options.some((option) => option[1] === saved)) options.push([saved, saved]);
		return options.length ? options : [["(none)", ""]];
	}
}

function gameData() {
	return window.G || { skills: {}, monsters: {}, maps: {} };
}

function myClass() {
	return window.character && character.ctype;
}

// Skills the player's class can use, plus the abilities everyone has (attack, use_hp, ...)
function skillOptions(onlyTargeted) {
	const skills = gameData().skills;
	const cls = myClass();
	return Object.keys(skills)
		.filter((name) => {
			const skill = skills[name];
			if (skill.class && cls && !skill.class.includes(cls)) return false;
			if (skill.type === "ability") return !onlyTargeted && !["stop", "travel"].includes(name);
			if (skill.type !== "skill" || !skill.class) return false;
			return !onlyTargeted || skill.target;
		})
		.sort((a, b) => (skills[a].name || a).localeCompare(skills[b].name || b))
		.map((name) => [skills[name].name || name, name]);
}

function getSkillOptions() {
	return skillOptions(false);
}

function getSpellOptions() {
	return skillOptions(true);
}

// Monsters that live on normal maps, weakest first
function getMonsterOptions() {
	const data = gameData();
	const found = {};
	for (const name in data.maps) {
		const map = data.maps[name];
		if (map.ignore || map.instance || map.event || map.irregular) continue;
		(map.monsters || []).forEach((pack) => {
			if (data.monsters[pack.type]) found[pack.type] = true;
		});
	}
	return Object.keys(found)
		.sort((a, b) => data.monsters[a].hp - data.monsters[b].hp)
		.map((type) => [data.monsters[type].name + " (" + data.monsters[type].hp + " HP)", type]);
}

// Places smart_move understands: shops first, then the maps players can walk to
function getLocationOptions() {
	const maps = gameData().maps;
	const places = [
		["Town", "town"],
		["Potion shop", "potions"],
		["Upgrade / compound", "upgrade"],
		["Exchange", "exchange"],
		["Scroll shop", "scrolls"],
	];
	const walkable = Object.keys(maps)
		.filter((name) => {
			const map = maps[name];
			return !map.ignore && !map.instance && !map.event && !map.irregular && !map.unlist && (map.spawns || []).length;
		})
		.sort((a, b) => (maps[a].name || a).localeCompare(maps[b].name || b))
		.map((name) => [maps[name].name || name, name]);
	return places.concat(walkable);
}

// ---------------------------------------------------------------------------
// Helpers added to the generated code, only when a block needs them
// ---------------------------------------------------------------------------

function helper(name, code) {
	return gen.provideFunction_(name, code.replace("function NAME", "function " + gen.FUNCTION_NAME_PLACEHOLDER_));
}

function provideBlockError() {
	return helper(
		"block_error",
		`function NAME(error) {
  game_log("Blockly: " + ((error && (error.reason || error.message)) || error), "#E13758");
}`,
	);
}

// Uses a skill, or says in the message box why it can't
function provideTrySkill() {
	return helper(
		"try_skill",
		`async function NAME(name, target) {
  var skill = G.skills[name];
  if (!skill) return set_message("No skill called " + name);
  if (skill.class && skill.class.indexOf(character.ctype) == -1) return set_message(skill.name + " is not a " + character.ctype + " skill");
  if (skill.level && character.level < skill.level) return set_message(skill.name + " needs level " + skill.level);
  if (skill.mp && character.mp < skill.mp) return set_message("Not enough MP for " + skill.name);
  if (!can_use(name)) return; // still cooling down
  if (skill.target && !target) return set_message(skill.name + " needs a target");
  try {
    await use_skill(name, target);
  } catch (error) {
    set_message(skill.name + ": " + ((error && error.reason) || "failed"));
  }
}`,
	);
}

function provideNearestPlayer() {
	return helper(
		"get_nearest_player",
		`function NAME() {
  var best = null, best_distance = Infinity;
  for (var id in parent.entities) {
    var entity = parent.entities[id];
    if (entity.type != "character" || entity.npc || entity.rip) continue;
    var d = distance(character, entity);
    if (d < best_distance) best_distance = d, best = entity;
  }
  return best;
}`,
	);
}

// Accepts an entity, or a player/entity name
function provideAsEntity() {
	return helper(
		"as_entity",
		`function NAME(value) {
  if (typeof value == "string") return get_player(value) || get_entity(value);
  return value;
}`,
	);
}

function provideUseItem() {
	return helper(
		"use_item",
		`function NAME(name) {
  var slot = locate_item(name);
  if (slot == -1) return set_message("No " + name + " in the inventory");
  return equip(slot);
}`,
	);
}

function provideDistanceTo() {
	return helper(
		"distance_to",
		`function NAME(target) {
  if (!target) return 999999;
  return Math.round(distance(character, target));
}`,
	);
}

// ---------------------------------------------------------------------------
// Loops and waiting
// ---------------------------------------------------------------------------

// Runs the body, waits, and repeats. A new round never starts before the previous one has
// finished, so blocks that take a while (smart_move, attack) don't pile up on each other.
defineBlock(
	"setIntervalBlock",
	COLOURS.loop,
	function () {
		this.appendDummyInput().appendField("Every").appendField(new Blockly.FieldNumber(1000, 50), "INTERVAL").appendField("ms do");
		this.appendStatementInput("DO").setCheck(null);
		this.setTooltip("Runs the blocks inside over and over, waiting this many milliseconds between runs (1000 ms = 1 second)");
	},
	function (block) {
		const interval = Math.max(50, Number(block.getFieldValue("INTERVAL")) || 1000);
		const body = gen.statementToCode(block, "DO");
		return `(async function () {
  while (true) {
    try {
${gen.prefixLines(body, gen.INDENT + gen.INDENT)}    } catch (error) {
      ${provideBlockError()}(error);
    }
    await sleep(${interval});
  }
})();
`;
	},
);

defineBlock(
	"wait",
	COLOURS.loop,
	function () {
		this.appendValueInput("DURATION").setCheck("Number").appendField("Wait (ms)");
		action(this, "Pause for this many milliseconds (1000 ms = 1 second)");
	},
	(block) => `await sleep(${valueOr(block, "DURATION", "1000")});\n`,
);

defineBlock(
	"waitUntil",
	COLOURS.loop,
	function () {
		this.appendValueInput("CONDITION").setCheck("Boolean").appendField("Wait until");
		action(this, "Pause until the condition becomes true, for example: wait until not Is Character Moving");
	},
	(block) => `while (!(${valueOr(block, "CONDITION", "true")})) {\n  await sleep(100);\n}\n`,
);

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

defineBlock(
	"moveto",
	COLOURS.movement,
	function () {
		this.appendDummyInput("INPUT_NAME").appendField("Move to X").appendField(new Blockly.FieldNumber(0), "X_COORD").appendField("Y").appendField(new Blockly.FieldNumber(0), "Y_COORD");
		this.setInputsInline(true);
		action(this, "Walk in a straight line to the X, Y position on this map (walls stop you)");
	},
	(block) => `await move(${Number(block.getFieldValue("X_COORD"))}, ${Number(block.getFieldValue("Y_COORD"))});\n`,
);

function moveBy(dx, dy) {
	return function (block) {
		const steps = Number(block.getFieldValue("STEPS")) || 10;
		const x = dx ? `character.real_x ${dx > 0 ? "+" : "-"} ${steps}` : "character.real_x";
		const y = dy ? `character.real_y ${dy > 0 ? "+" : "-"} ${steps}` : "character.real_y";
		return `await move(${x}, ${y});\n`;
	};
}

[
	["moveUp", "Move Up", 0, -1],
	["moveDown", "Move Down", 0, 1],
	["moveLeft", "Move Left", -1, 0],
	["moveRight", "Move Right", 1, 0],
].forEach(([type, label, dx, dy]) =>
	defineBlock(
		type,
		COLOURS.movement,
		function () {
			this.appendDummyInput().appendField(label).appendField(new Blockly.FieldNumber(10), "STEPS").appendField("pixels");
			action(this, label + " by this many pixels");
		},
		moveBy(dx, dy),
	),
);

defineBlock(
	"moveToLocation",
	COLOURS.movement,
	function () {
		this.appendDummyInput().appendField("Travel to").appendField(new GameDropdown(getLocationOptions), "LOCATION");
		action(this, "Find the way to a shop or map and walk there (through doors and teleports). This can take a while.");
	},
	(block) => `await smart_move(${quote(block.getFieldValue("LOCATION"))});\n`,
);

defineBlock(
	"huntMonster",
	COLOURS.movement,
	function () {
		this.appendDummyInput().appendField("Travel to where").appendField(new GameDropdown(getMonsterOptions), "MONSTER_TYPE").appendField("live");
		action(this, "Find the way to the place these monsters live and walk there. Put it inside an 'if' (for example: if no monster is near), or you will keep walking back and forth.");
	},
	(block) => `await smart_move(${quote(block.getFieldValue("MONSTER_TYPE"))});\n`,
);

defineBlock(
	"moveToEntity",
	COLOURS.movement,
	function () {
		this.appendValueInput("TARGET").setCheck("Entity").appendField("Move Toward");
		action(this, "If the target is out of range, walk halfway toward it");
	},
	function (block) {
		const target = valueOr(block, "TARGET", "get_targeted_monster()");
		return `{
  let target = ${target};
  if (!target) {
    set_message("Nothing to move toward");
  } else if (!is_in_range(target)) {
    await move(character.real_x + (target.real_x - character.real_x) / 2, character.real_y + (target.real_y - character.real_y) / 2);
  }
}
`;
	},
);

defineBlock(
	"followPlayer",
	COLOURS.movement,
	function () {
		this.appendDummyInput().appendField("Follow Player").appendField(new Blockly.FieldTextInput("player_name"), "PLAYER_NAME");
		action(this, "Walk to where this player is");
	},
	(block) => `{
  let player = get_player(${quote(block.getFieldValue("PLAYER_NAME"))});
  if (player) {
    await smart_move(player);
  } else {
    set_message("Player not found");
  }
}
`,
);

defineBlock(
	"goToTown",
	COLOURS.movement,
	function () {
		this.appendDummyInput().appendField("Teleport to Town");
		action(this, "Teleport to the town of this map (takes a few seconds, moving cancels it)");
	},
	() => "try { await town(); } catch (error) {}\n",
);

defineBlock(
	"dodgeAttack",
	COLOURS.movement,
	function () {
		this.appendValueInput("DIRECTION").setCheck("String").appendField("Dodge");
		action(this, "Step 50 pixels to the 'left' or the 'right'");
	},
	function (block) {
		const direction = valueOr(block, "DIRECTION", "'left'");
		return `if (${direction} == "left") move(character.real_x - 50, character.real_y);
else if (${direction} == "right") move(character.real_x + 50, character.real_y);
`;
	},
);

defineBlock(
	"stopAction",
	COLOURS.movement,
	function () {
		this.appendDummyInput().appendField("Stop Moving");
		action(this, "Stop walking (also stops Travel to)");
	},
	() => "stop();\n",
);

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

defineBlock(
	"setTarget",
	COLOURS.combat,
	function () {
		this.appendValueInput("TARGET").setCheck("Entity").appendField("Set Target to");
		action(this, "Choose what to attack: a monster or a player");
	},
	(block) => `change_target(${valueOr(block, "TARGET", "null")});\n`,
);

defineBlock(
	"attack",
	COLOURS.combat,
	function () {
		this.appendValueInput("TARGET").setCheck("Entity").appendField("Attack");
		action(this, "Attack the target if it is in range and your attack is ready. The message box says why when it can't.");
	},
	function (block) {
		const target = valueOr(block, "TARGET", "get_targeted_monster()");
		return `{
  let target = ${target};
  if (!target) {
    set_message("Nothing to attack");
  } else if (!is_in_range(target)) {
    set_message("Too far to attack");
  } else if (can_attack(target)) {
    set_message("Attacking");
    try { await attack(target); } catch (error) {}
  }
}
`;
	},
);

defineBlock(
	"useSkill",
	COLOURS.combat,
	function () {
		this.appendDummyInput().appendField("Use Skill").appendField(new GameDropdown(getSkillOptions), "SKILL_NAME");
		this.appendValueInput("TARGET").setCheck("Entity").appendField("on");
		action(this, "Use one of your class's skills if it is ready. The message box says why when it can't.");
	},
	(block) => `await ${provideTrySkill()}(${quote(block.getFieldValue("SKILL_NAME"))}, ${valueOr(block, "TARGET", "get_target()")});\n`,
);

defineBlock(
	"castSpell",
	COLOURS.combat,
	function () {
		this.appendDummyInput().appendField("Cast Spell").appendField(new GameDropdown(getSpellOptions), "SPELL_NAME");
		this.appendValueInput("TARGET").setCheck("Entity").appendField("at");
		action(this, "Cast one of your class's targeted skills at a monster or player. The message box says why when it can't.");
	},
	(block) => `await ${provideTrySkill()}(${quote(block.getFieldValue("SPELL_NAME"))}, ${valueOr(block, "TARGET", "get_target()")});\n`,
);

defineBlock(
	"heal",
	COLOURS.combat,
	function () {
		this.appendValueInput("TARGET").setCheck("Entity").appendField("Heal");
		action(this, "Priests only: heal yourself or another player");
	},
	(block) => `await ${provideTrySkill()}("heal", ${valueOr(block, "TARGET", "character")});\n`,
);

defineBlock(
	"respawn",
	COLOURS.combat,
	function () {
		this.appendDummyInput().appendField("Respawn (if dead)");
		action(this, "Come back to life in town after dying (you have to wait a few seconds after dying)");
	},
	() => "if (character.rip) {\n  try { await respawn(); } catch (error) {}\n}\n",
);

defineBlock(
	"canAttack",
	COLOURS.combat,
	function () {
		this.appendValueInput("TARGET").setCheck("Entity").appendField("Can Attack");
		value(this, "Boolean", "True if the target is in range and your attack is ready");
	},
	(block) => [`can_attack(${valueOr(block, "TARGET", "get_targeted_monster()")})`, Order.FUNCTION_CALL],
);

defineBlock(
	"canUseSkill",
	COLOURS.combat,
	function () {
		this.appendDummyInput().appendField("Skill").appendField(new GameDropdown(getSkillOptions), "SKILL_NAME").appendField("is ready");
		value(this, "Boolean", "True if your class has this skill and it isn't cooling down");
	},
	(block) => [`can_use(${quote(block.getFieldValue("SKILL_NAME"))})`, Order.FUNCTION_CALL],
);

defineBlock(
	"isInRange",
	COLOURS.combat,
	function () {
		this.appendValueInput("TARGET").setCheck(["Entity", "String"]).appendField("Is In Range");
		value(this, "Boolean", "True if the target is close enough to attack");
	},
	(block) => [`is_in_range(${provideAsEntity()}(${valueOr(block, "TARGET", "get_targeted_monster()")}))`, Order.FUNCTION_CALL],
);

defineBlock(
	"currentTarget",
	COLOURS.combat,
	function () {
		this.appendDummyInput().appendField("Current Target");
		value(this, "Entity", "Whatever you are targeting right now, a monster or a player (or nothing)");
	},
	() => ["get_target()", Order.FUNCTION_CALL],
);

defineBlock(
	"getTargetedMonster",
	COLOURS.combat,
	function () {
		this.appendDummyInput().appendField("Targeted Monster");
		value(this, "Entity", "The monster you are targeting (nothing if you target a player)");
	},
	() => ["get_targeted_monster()", Order.FUNCTION_CALL],
);

defineBlock(
	"entityExists",
	COLOURS.combat,
	function () {
		this.appendValueInput("ENTITY").setCheck(null);
		this.appendDummyInput().appendField("exists");
		this.setInputsInline(true);
		value(this, "Boolean", "True if the block found something, for example: Current Target exists");
	},
	(block) => [`(${valueOr(block, "ENTITY", "null", Order.EQUALITY)} != null)`, Order.ATOMIC],
);

// ---------------------------------------------------------------------------
// My character
// ---------------------------------------------------------------------------

defineBlock(
	"myStat",
	COLOURS.me,
	function () {
		this.appendDummyInput()
			.appendField("My")
			.appendField(
				new Blockly.FieldDropdown([
					["HP", "hp"],
					["HP %", "hp_percent"],
					["Max HP", "max_hp"],
					["MP", "mp"],
					["MP %", "mp_percent"],
					["Max MP", "max_mp"],
					["Level", "level"],
					["XP", "xp"],
					["XP needed to level up", "max_xp"],
					["Gold", "gold"],
					["X position", "real_x"],
					["Y position", "real_y"],
					["Attack", "attack"],
					["Range", "range"],
					["Speed", "speed"],
				]),
				"STAT",
			);
		value(this, "Number", "A number about your character");
	},
	function (block) {
		const stat = block.getFieldValue("STAT");
		if (stat === "hp_percent") return ["Math.round(100 * character.hp / character.max_hp)", Order.FUNCTION_CALL];
		if (stat === "mp_percent") return ["Math.round(100 * character.mp / character.max_mp)", Order.FUNCTION_CALL];
		return ["character." + stat, Order.MEMBER];
	},
);

[
	["getCharacterHP", "Get Character HP", "hp", "Your character's health points"],
	["getCharacterMP", "Get Character MP", "mp", "Your character's mana points"],
	["getCharacterLevel", "Get Character Level", "level", "Your character's level"],
	["getCharacterX", "Get Character X", "real_x", "Your character's X position"],
	["getCharacterY", "Get Character Y", "real_y", "Your character's Y position"],
].forEach(([type, label, property, tooltip]) =>
	defineBlock(
		type,
		COLOURS.me,
		function () {
			this.appendDummyInput().appendField(label);
			value(this, "Number", tooltip);
		},
		() => ["character." + property, Order.MEMBER],
	),
);

defineBlock(
	"isCharacterMoving",
	COLOURS.me,
	function () {
		this.appendDummyInput().appendField("Is Character Moving");
		value(this, "Boolean", "True while your character is walking");
	},
	() => ["is_moving(character)", Order.FUNCTION_CALL],
);

defineBlock(
	"isCharacterDead",
	COLOURS.me,
	function () {
		this.appendDummyInput().appendField("Is Character Dead");
		value(this, "Boolean", "True if your character is dead (use Respawn)");
	},
	() => ["!!character.rip", Order.LOGICAL_NOT],
);

defineBlock(
	"checkBuffStatus",
	COLOURS.me,
	function () {
		this.appendValueInput("BUFF_NAME").setCheck("String").appendField("Has Buff");
		value(this, "Boolean", "True if your character has this buff or condition right now, for example mluck or poisoned");
	},
	(block) => [`!!(character.s && character.s[${valueOr(block, "BUFF_NAME", "'mluck'")}])`, Order.LOGICAL_NOT],
);

// ---------------------------------------------------------------------------
// Monsters
// ---------------------------------------------------------------------------

defineBlock(
	"getNearestMonster",
	COLOURS.monsters,
	function () {
		this.appendDummyInput().appendField("Nearest Monster");
		value(this, "Entity", "The closest monster (or nothing)");
	},
	() => ["get_nearest_monster()", Order.FUNCTION_CALL],
);

defineBlock(
	"getNearestMonsterOfType",
	COLOURS.monsters,
	function () {
		this.appendDummyInput().appendField("Nearest").appendField(new GameDropdown(getMonsterOptions), "MONSTER_TYPE");
		value(this, "Entity", "The closest monster of this kind (or nothing if none are near)");
	},
	(block) => [`get_nearest_monster({ type: ${quote(block.getFieldValue("MONSTER_TYPE"))} })`, Order.FUNCTION_CALL],
);

defineBlock(
	"getNearestMonsterWithOptions",
	COLOURS.monsters,
	function () {
		this.appendDummyInput().appendField("Nearest Monster");
		this.appendValueInput("MIN_XP").setCheck("Number").appendField("giving at least XP").setAlign(Blockly.inputs.Align.RIGHT);
		this.appendValueInput("MAX_ATT").setCheck("Number").appendField("with attack at most").setAlign(Blockly.inputs.Align.RIGHT);
		value(this, "Entity", "The closest monster worth at least this much XP that isn't too strong. Goos give 100 XP and have 5 attack.");
	},
	(block) => [`get_nearest_monster({ min_xp: ${valueOr(block, "MIN_XP", "100")}, max_att: ${valueOr(block, "MAX_ATT", "120")} })`, Order.FUNCTION_CALL],
);

// Reads a property of a monster or player, without crashing when there is none
function entityAttribute(inputName, attributes) {
	return function (block) {
		const entity = valueOr(block, inputName, "null", Order.LOGICAL_OR);
		const attribute = block.getFieldValue("ATTRIBUTE");
		const special = attributes[attribute];
		if (special) return [special(`(${entity} || {})`), Order.ATOMIC];
		return [`(${entity} || {}).${attribute}`, Order.MEMBER];
	};
}

defineBlock(
	"getMonsterAttribute",
	COLOURS.monsters,
	function () {
		this.appendValueInput("MONSTER")
			.setCheck("Entity")
			.appendField("Monster")
			.appendField(
				new Blockly.FieldDropdown([
					["HP", "hp"],
					["Max HP", "max_hp"],
					["Level", "level"],
					["XP", "xp"],
					["Gold", "gold"],
					["Attack", "attack"],
					["Speed", "speed"],
					["Range", "range"],
					["Type", "mtype"],
					["Target (player name)", "target"],
					["X Position", "real_x"],
					["Y Position", "real_y"],
					["Moving", "moving"],
					["Dead", "dead"],
				]),
				"ATTRIBUTE",
			)
			.appendField("of");
		value(this, null, "A value about a monster (nothing if there is no monster)");
	},
	entityAttribute("MONSTER", {
		gold: (m) => `((G.monsters[${m}.mtype] || {}).gold || 0)`,
		moving: (m) => `!!${m}.moving`,
		dead: (m) => `!!${m}.dead`,
	}),
);

defineBlock(
	"isMonsterNear",
	COLOURS.monsters,
	function () {
		this.appendDummyInput().appendField("Is a Monster within").appendField(new Blockly.FieldNumber(100, 0), "RANGE").appendField("pixels");
		value(this, "Boolean", "True if any monster is at least this close");
	},
	(block) => [
		`Object.values(parent.entities).some((entity) => entity.type == "monster" && !entity.dead && distance(character, entity) <= ${Number(block.getFieldValue("RANGE")) || 100})`,
		Order.FUNCTION_CALL,
	],
);

defineBlock(
	"isMonsterXpGoldBelow",
	COLOURS.monsters,
	function () {
		this.appendValueInput("MONSTER").setCheck("Entity").appendField("Monster");
		this.appendDummyInput()
			.appendField(
				new Blockly.FieldDropdown([
					["XP", "xp"],
					["Gold", "gold"],
				]),
				"ATTRIBUTE",
			)
			.appendField("is below");
		this.appendValueInput("THRESHOLD").setCheck("Number");
		this.setInputsInline(true);
		value(this, "Boolean", "True if the monster's XP or gold is below the number");
	},
	function (block) {
		const monster = valueOr(block, "MONSTER", "null", Order.LOGICAL_OR);
		const threshold = valueOr(block, "THRESHOLD", "0", Order.RELATIONAL);
		const amount = block.getFieldValue("ATTRIBUTE") === "xp" ? `(${monster} || {}).xp` : `(G.monsters[(${monster} || {}).mtype] || {}).gold`;
		return [`(${amount} < ${threshold})`, Order.ATOMIC];
	},
);

defineBlock(
	"distanceTo",
	COLOURS.monsters,
	function () {
		this.appendValueInput("TARGET").setCheck("Entity").appendField("Distance to");
		value(this, "Number", "How many pixels away a monster or player is (a huge number if there is none)");
	},
	(block) => [`${provideDistanceTo()}(${valueOr(block, "TARGET", "null")})`, Order.FUNCTION_CALL],
);

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

defineBlock(
	"getNearestPlayer",
	COLOURS.players,
	function () {
		this.appendDummyInput().appendField("Nearest Player");
		value(this, "Entity", "The closest other player (or nothing)");
	},
	() => [`${provideNearestPlayer()}()`, Order.FUNCTION_CALL],
);

defineBlock(
	"getPlayerByName",
	COLOURS.players,
	function () {
		this.appendDummyInput().appendField("Player named").appendField(new Blockly.FieldTextInput("player_name"), "PLAYER_NAME");
		value(this, "Entity", "A player on your screen with this name (or nothing)");
	},
	(block) => [`get_player(${quote(block.getFieldValue("PLAYER_NAME"))})`, Order.FUNCTION_CALL],
);

defineBlock(
	"playerName",
	COLOURS.players,
	function () {
		this.appendDummyInput().appendField("Name").appendField(new Blockly.FieldTextInput("player_name"), "PLAYER_NAME");
		value(this, "String", "A player's name, as text");
	},
	(block) => [quote(block.getFieldValue("PLAYER_NAME")), Order.ATOMIC],
);

defineBlock(
	"getPlayerAttribute",
	COLOURS.players,
	function () {
		this.appendValueInput("PLAYER")
			.setCheck("Entity")
			.appendField("Player")
			.appendField(
				new Blockly.FieldDropdown([
					["HP", "hp"],
					["Max HP", "max_hp"],
					["MP", "mp"],
					["Max MP", "max_mp"],
					["Level", "level"],
					["Name", "name"],
					["Class", "ctype"],
					["X Position", "real_x"],
					["Y Position", "real_y"],
					["Moving", "moving"],
					["Target (monster or player)", "target"],
					["Party leader", "party"],
					["Dead", "rip"],
				]),
				"ATTRIBUTE",
			)
			.appendField("of");
		value(this, null, "A value about a player (nothing if there is no player)");
	},
	entityAttribute("PLAYER", {
		target: (p) => `get_entity(${p}.target)`,
		party: (p) => `(${p}.party || "")`,
		moving: (p) => `!!${p}.moving`,
		rip: (p) => `!!${p}.rip`,
	}),
);

defineBlock(
	"isMoving",
	COLOURS.players,
	function () {
		this.appendValueInput("CHARACTER").setCheck(["Entity", "String"]).appendField("Is Moving");
		value(this, "Boolean", "True if that player or monster is walking");
	},
	(block) => [`is_moving(${provideAsEntity()}(${valueOr(block, "CHARACTER", "character")}))`, Order.FUNCTION_CALL],
);

// ---------------------------------------------------------------------------
// Party
// ---------------------------------------------------------------------------

defineBlock(
	"partyInvite",
	COLOURS.party,
	function () {
		this.appendDummyInput().appendField("Invite").appendField(new Blockly.FieldTextInput("player_name"), "PLAYER_NAME").appendField("to my party");
		action(this, "Ask another player to join your party. Party members share XP.");
	},
	(block) => `try { await send_party_invite(${quote(block.getFieldValue("PLAYER_NAME"))}); } catch (error) {}\n`,
);

defineBlock(
	"partyAccept",
	COLOURS.party,
	function () {
		this.appendDummyInput().appendField("Accept party invite from").appendField(new Blockly.FieldTextInput("player_name"), "PLAYER_NAME");
		action(this, "Join this player's party if they invited you");
	},
	(block) => `try { await accept_party_invite(${quote(block.getFieldValue("PLAYER_NAME"))}); } catch (error) {}\n`,
);

// ---------------------------------------------------------------------------
// Items and shopping
// ---------------------------------------------------------------------------

defineBlock(
	"useHpOrMp",
	COLOURS.items,
	function () {
		this.appendDummyInput().appendField("Use HP or MP Potion (when needed)");
		action(this, "Drink a health or mana potion if you are low (or regenerate a little if you have none)");
	},
	() => "use_hp_or_mp();\n",
);

defineBlock(
	"useItem",
	COLOURS.items,
	function () {
		this.appendValueInput("ITEM_NAME").setCheck("String").appendField("Use Item");
		action(this, "Use or equip an item from your inventory by its name, for example hpot0 (health potion)");
	},
	(block) => `${provideUseItem()}(${valueOr(block, "ITEM_NAME", "'hpot0'")});\n`,
);

defineBlock(
	"loot",
	COLOURS.items,
	function () {
		this.appendDummyInput().appendField("Loot Chests");
		action(this, "Open the treasure chests monsters drop near you");
	},
	() => "loot();\n",
);

defineBlock(
	"itemCount",
	COLOURS.items,
	function () {
		this.appendValueInput("ITEM_NAME").setCheck("String").appendField("How many");
		this.appendDummyInput().appendField("I have");
		this.setInputsInline(true);
		value(this, "Number", "How many of this item are in your inventory, for example hpot0 (health potion) or mpot0 (mana potion)");
	},
	(block) => [`quantity(${valueOr(block, "ITEM_NAME", "'hpot0'")})`, Order.FUNCTION_CALL],
);

defineBlock(
	"buyItem",
	COLOURS.items,
	function () {
		this.appendDummyInput().appendField("Buy").appendField(new Blockly.FieldNumber(10, 1), "QUANTITY");
		this.appendValueInput("ITEM_NAME").setCheck("String");
		this.setInputsInline(true);
		action(this, "Buy items from a shop. You must be standing next to the shop: use 'Travel to Potion shop' first.");
	},
	(block) => `try {
  await buy(${valueOr(block, "ITEM_NAME", "'hpot0'")}, ${Number(block.getFieldValue("QUANTITY")) || 1});
} catch (error) {
  set_message("Can't buy: " + ((error && error.reason) || "failed"));
}
`,
);

// ---------------------------------------------------------------------------
// Messages and output
// ---------------------------------------------------------------------------

defineBlock(
	"setMessage",
	COLOURS.output,
	function () {
		this.appendValueInput("MESSAGE").setCheck(null).appendField("Show Message");
		action(this, "Show a short message in the small CODE box at the bottom of the screen");
	},
	(block) => `set_message(${valueOr(block, "MESSAGE", "''")});\n`,
);

defineBlock(
	"setChatLog",
	COLOURS.output,
	function () {
		this.appendValueInput("MESSAGE").setCheck(null).appendField("Write to Game Log");
		action(this, "Add a line to the game's log (only you can see it)");
	},
	(block) => `game_log(${valueOr(block, "MESSAGE", "''")});\n`,
);

defineBlock(
	"say",
	COLOURS.output,
	function () {
		this.appendValueInput("MESSAGE").setCheck(null).appendField("Say in Chat");
		action(this, "Say something in the chat that everyone nearby can see. Please don't spam: don't put this in a fast loop!");
	},
	(block) => `say(${valueOr(block, "MESSAGE", "''")});\n`,
);

defineBlock(
	"logMessage",
	COLOURS.output,
	function () {
		this.appendValueInput("MESSAGE").setCheck(null).appendField("Log to Browser Console");
		action(this, "Write to the browser's developer console (press F12 to see it)");
	},
	(block) => `console.log(${valueOr(block, "MESSAGE", "'Hello World'")});\n`,
);

defineBlock(
	"commentBlock",
	COLOURS.output,
	function () {
		this.appendDummyInput().appendField("Note:").appendField(new Blockly.FieldTextInput("Your comment here"), "COMMENT_TEXT");
		this.setTooltip("A note for people reading your program. It doesn't do anything.");
	},
	(block) => "// " + String(block.getFieldValue("COMMENT_TEXT")).replace(/[\r\n]+/g, " ") + "\n",
);

// ---------------------------------------------------------------------------
// Retired blocks: not in the toolbox any more, kept so saved programs still load and run
// ---------------------------------------------------------------------------

defineBlock(
	"useSkillByName",
	COLOURS.combat,
	function () {
		this.appendDummyInput().appendField("Use Skill by Name").appendField(new Blockly.FieldTextInput("skill_name"), "SKILL_NAME");
		this.appendValueInput("TARGET").setCheck(["Entity", "Null"]).appendField("on");
		action(this, "Use a skill (typed by name) on the target");
	},
	(block) => `await ${provideTrySkill()}(${quote(block.getFieldValue("SKILL_NAME"))}, ${valueOr(block, "TARGET", "get_target()")});\n`,
);

[
	["getMonsterHP", "Monster HP of", "MONSTER", "hp"],
	["getMonsterXP", "Monster XP of", "MONSTER", "xp"],
	["getMonsterX", "Monster X of", "MONSTER", "real_x"],
	["getMonsterY", "Monster Y of", "MONSTER", "real_y"],
	["getPlayerHPFromEntity", "Player HP of", "PLAYER_ENTITY", "hp"],
	["getPlayerMPFromEntity", "Player MP of", "PLAYER_ENTITY", "mp"],
].forEach(([type, label, input, property]) =>
	defineBlock(
		type,
		COLOURS.monsters,
		function () {
			this.appendValueInput(input).setCheck("Entity").appendField(label);
			value(this, "Number", label.replace(" of", ""));
		},
		(block) => [`(${valueOr(block, input, "null", Order.LOGICAL_OR)} || {}).${property}`, Order.MEMBER],
	),
);

defineBlock(
	"getMonsterGold",
	COLOURS.monsters,
	function () {
		this.appendValueInput("MONSTER").setCheck("Entity").appendField("Monster Gold of");
		value(this, "Number", "How much gold this kind of monster drops");
	},
	(block) => [`((G.monsters[(${valueOr(block, "MONSTER", "null", Order.LOGICAL_OR)} || {}).mtype] || {}).gold || 0)`, Order.ATOMIC],
);

defineBlock(
	"declareVariable",
	COLOURS.loop,
	function () {
		this.appendDummyInput().appendField("set").appendField(new Blockly.FieldVariable("var"), "VAR").appendField("to").appendField(new Blockly.FieldTextInput("false"), "VALUE");
		action(this, "Set a variable (use the Variables category instead)");
	},
	function (block) {
		const raw = String(block.getFieldValue("VALUE"));
		// Numbers, true/false/null stay as they are, anything else becomes text
		const literal = /^(-?\d+(\.\d+)?|true|false|null)$/.test(raw.trim()) ? raw.trim() : quote(raw);
		return `${gen.getVariableName(block.getFieldValue("VAR"))} = ${literal};\n`;
	},
);

// ---------------------------------------------------------------------------
// Generated code layout
// ---------------------------------------------------------------------------

// Put the helper functions (block_error, try_skill, ...) at the bottom of the generated code, so
// students see their own program first. Function declarations work from anywhere in the code.
(function () {
	const finish = gen.finish;
	gen.finish = function (code) {
		const helpers = [];
		for (const name in this.functionNames_) {
			if (this.definitions_[name]) helpers.push(this.definitions_[name]), delete this.definitions_[name];
		}
		const result = finish.call(this, code);
		return helpers.length ? result + "\n\n// Helpers used by the blocks above\n" + helpers.join("\n\n") + "\n" : result;
	};
})();

// ---------------------------------------------------------------------------
// Blockly's built-in blocks, adjusted to fit the game
// ---------------------------------------------------------------------------

// Loops must pause, or a loop that never ends would freeze the whole game
gen.forBlock["controls_whileUntil"] = function (block) {
	const until = block.getFieldValue("MODE") === "UNTIL";
	const condition = gen.valueToCode(block, "BOOL", until ? Order.LOGICAL_NOT : Order.NONE) || "false";
	const body = gen.statementToCode(block, "DO");
	return `while (${until ? "!" : ""}(${condition})) {
${body}  await sleep(250);
}
`;
};

// "print" writes into the game log instead of opening a blocking alert() popup
gen.forBlock["text_print"] = function (block) {
	return `game_log(${valueOr(block, "TEXT", "''")});\n`;
};

// Functions made with the Functions category must be async, so movement/attack blocks
// (which use await) can go inside them, and calls must wait for them to finish.
["procedures_defreturn", "procedures_defnoreturn"].forEach(function (type) {
	const original = gen.forBlock[type];
	gen.forBlock[type] = function (block, generator) {
		const result = original.call(this, block, generator);
		const key = "%" + gen.getProcedureName(block.getFieldValue("NAME"));
		if (gen.definitions_[key]) gen.definitions_[key] = gen.definitions_[key].replace(/^((?:\s*\/\/.*\n)*\s*)function /, "$1async function ");
		return result;
	};
});

(function () {
	const callReturn = gen.forBlock["procedures_callreturn"];
	const callNoReturn = gen.forBlock["procedures_callnoreturn"];
	gen.forBlock["procedures_callreturn"] = function (block, generator) {
		const [code] = callReturn.call(this, block, generator);
		return [`(await ${code})`, Order.ATOMIC];
	};
	gen.forBlock["procedures_callnoreturn"] = function (block, generator) {
		const code = callNoReturn.call(this, block, generator);
		// Blockly builds this one from procedures_callreturn, which already awaits
		const match = /^\(await (.*)\);\n$/.exec(code);
		return match ? `await ${match[1]};\n` : "await " + code;
	};
})();
