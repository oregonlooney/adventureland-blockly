// Adventure Land - Blockly Edition
// Visual (block-based) programming for the in-game CODE runner.
//
// Loaded by htmls/index.html after the vendored Blockly build in js/blockly/<version>/.
// The panel markup and toolbox live in htmls/contents/blockly.html, styles in css/blockly.css.
//
// How it works:
//  - Students snap blocks together in the BLOCKLY panel.
//  - Every change regenerates JavaScript into the "generated code" textarea.
//  - RUN hands that JavaScript to the game's normal code runner (start_runner), exactly like
//    pressing ENGAGE in the CODE panel, so everything in the runner API is available.
//
// Compatibility: block type names, field names and input names are part of the saved .xml format.
// Don't rename them, or students' saved workspaces will stop loading.

var BLOCKLY_VERSION = "13.3.0";
var BLOCKLY_STORAGE_KEY = "blockly_workspace";
var blockly_workspace = null;

const defaultBlocksXML = `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="commentBlock" id="welcome_1" x="20" y="20">
    <field name="COMMENT_TEXT">Welcome to Adventure Land Blockly Edition</field>
  </block>
  <block type="commentBlock" id="welcome_2" x="20" y="50">
    <field name="COMMENT_TEXT">Use the blocks to automate your character</field>
  </block>
  <block type="commentBlock" id="welcome_3" x="20" y="80">
    <field name="COMMENT_TEXT">Put blocks inside the loop to run them over and over</field>
  </block>
  <block type="setIntervalBlock" id="main_loop" x="20" y="130">
    <field name="INTERVAL">1000</field>
  </block>
</xml>
`;

const gen = javascript.javascriptGenerator;
const Order = javascript.Order;

// ---------------------------------------------------------------------------
// Panel UI
// ---------------------------------------------------------------------------

function toggle_block() {
	var blockui = document.getElementById("blockui");
	if (!blockui) return;
	blockui.classList.toggle("open");
	// Blockly measures its container, so resize once the panel is visible
	if (blockui.classList.contains("open") && blockly_workspace) Blockly.svgResize(blockly_workspace);
	$(":focus").blur();
}

function initBlockly() {
	var blockui = document.getElementById("blockui");
	if (!blockui || !window.Blockly) return;

	blockly_workspace = Blockly.inject("blocklyDiv", {
		toolbox: document.getElementById("toolbox"),
		media: "/js/blockly/" + BLOCKLY_VERSION + "/media/", // served locally so classrooms work offline
		collapse: true,
		comments: false,
		disable: false,
		maxBlocks: Infinity,
		trashcan: true,
		scrollbars: true,
		oneBasedIndex: true,
		zoom: {
			controls: true,
			wheel: true,
			startScale: 1.0,
			maxScale: 3,
			minScale: 0.3,
			scaleSpeed: 1.2,
		},
		grid: {
			spacing: 20,
			length: 3,
			colour: "#ccc",
			snap: true,
		},
	});

	blockly_workspace.addChangeListener(function (event) {
		if (event.isUiEvent) return;
		document.getElementById("generatedBlockCode").value = gen.workspaceToCode(blockly_workspace);
		blockly_autosave();
	});

	var codeOutput = document.getElementById("generatedBlockCode");

	function resizeBlockly() {
		if (!blockui.classList.contains("open")) return;
		Blockly.svgResize(blockly_workspace);
	}

	// Drag the right edge to change the panel width
	document.getElementById("blocklyResizeHandle").addEventListener("mousedown", function (e) {
		e.preventDefault();
		function drag(e) {
			blockui.style.width = Math.max(300, e.clientX - blockui.offsetLeft) + "px";
			resizeBlockly();
		}
		function stop() {
			document.removeEventListener("mousemove", drag);
			document.removeEventListener("mouseup", stop);
		}
		document.addEventListener("mousemove", drag);
		document.addEventListener("mouseup", stop);
	});

	// Drag the bar between the workspace and the code box to split the height
	document.getElementById("blocklyCodeResizeHandle").addEventListener("mousedown", function (e) {
		e.preventDefault();
		var startY = e.clientY,
			startHeight = codeOutput.offsetHeight;
		function drag(e) {
			codeOutput.style.height = Math.max(40, startHeight - (e.clientY - startY)) + "px";
			resizeBlockly();
		}
		function stop() {
			document.removeEventListener("mousemove", drag);
			document.removeEventListener("mouseup", stop);
		}
		document.addEventListener("mousemove", drag);
		document.addEventListener("mouseup", stop);
	});

	window.addEventListener("resize", resizeBlockly);
	blockly_restore();
}

document.addEventListener("DOMContentLoaded", initBlockly);

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------

// Runs the generated code in the game's main code runner (the same iframe the CODE panel's
// ENGAGE button uses), so the game's events, on_destroy, handle_command etc. reach it.
function runBlocklyCode() {
	var code = document.getElementById("generatedBlockCode").value;
	if (code_run) stop_runner();
	start_runner(0, "// Blockly generated code\n(async () => {\n" + code + "\n})();\n");
}

function stopBlocklyCode() {
	if (code_run) stop_runner();
}

// ---------------------------------------------------------------------------
// Saving and loading
// ---------------------------------------------------------------------------

function blockly_workspace_xml() {
	return Blockly.Xml.domToPrettyText(Blockly.Xml.workspaceToDom(blockly_workspace));
}

function blockly_load_xml(xmlText) {
	Blockly.Xml.clearWorkspaceAndLoadFromXml(Blockly.utils.xml.textToDom(xmlText), blockly_workspace);
}

// Keep the workspace in the browser so a page refresh doesn't lose the student's work
function blockly_autosave() {
	try {
		localStorage.setItem(BLOCKLY_STORAGE_KEY, blockly_workspace_xml());
	} catch (e) {}
}

function blockly_restore() {
	var saved = null;
	try {
		saved = localStorage.getItem(BLOCKLY_STORAGE_KEY);
	} catch (e) {}
	try {
		blockly_load_xml(saved || defaultBlocksXML);
	} catch (e) {
		console.error("Blockly: couldn't restore the saved workspace, loading the default one", e);
		blockly_load_xml(defaultBlocksXML);
	}
}

function resetBlocks() {
	if (!blockly_workspace) return;
	if (!confirm("Clear the workspace and start over? (Use SAVE first if you want to keep it)")) return;
	blockly_load_xml(defaultBlocksXML);
}

function saveBlocks() {
	if (!blockly_workspace) return;
	var blob = new Blob([blockly_workspace_xml()], { type: "text/xml" });
	var link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = "blockly_workspace.xml";
	link.click();
}

function loadBlocks(event) {
	if (!blockly_workspace) return;
	var file = event.target.files[0];
	if (!file) return;
	var reader = new FileReader();
	reader.onload = function (e) {
		try {
			blockly_load_xml(e.target.result);
		} catch (err) {
			console.error("Error parsing XML:", err);
			alert("Failed to load blocks. Please make sure the file is a valid Blockly XML file.");
		}
	};
	reader.readAsText(file);
	event.target.value = ""; // allow loading the same file again
}

// ---------------------------------------------------------------------------
// Dropdown options (read from the game data, G)
// ---------------------------------------------------------------------------

function blockly_sorted_keys(obj) {
	var keys = Object.keys(obj || {}).sort();
	if (!keys.length) return [["(none)", ""]];
	return keys.map(function (key) {
		return [key, key];
	});
}

function getSkillOptions() {
	return blockly_sorted_keys(window.G && G.skills);
}

function getSpellOptions() {
	return getSkillOptions();
}

function getMonsterOptions() {
	return blockly_sorted_keys(window.G && G.monsters);
}

function getLocationOptions() {
	return blockly_sorted_keys(window.G && G.maps);
}

function getMonsterAttributeOptions() {
	return [
		["HP", "hp"],
		["Max HP", "max_hp"],
		["Level", "level"],
		["XP", "xp"],
		["Attack", "attack"],
		["Speed", "speed"],
		["Range", "range"],
		["Type", "mtype"],
		["Target", "target"],
		["X Position", "real_x"],
		["Y Position", "real_y"],
		["Moving", "moving"],
		["Dead", "dead"],
	];
}

function getPlayerAttributeOptions() {
	return [
		["HP", "hp"],
		["Max HP", "max_hp"],
		["MP", "mp"],
		["Max MP", "max_mp"],
		["Level", "level"],
		["X Position", "real_x"],
		["Y Position", "real_y"],
		["Moving", "moving"],
		["Target", "target"],
		["Party", "party"],
		["Dead", "rip"],
	];
}

// ---------------------------------------------------------------------------
// Block definitions
// ---------------------------------------------------------------------------

function statementBlock(block, colour, tooltip) {
	block.setPreviousStatement(true, null);
	block.setNextStatement(true, null);
	block.setColour(colour);
	block.setTooltip(tooltip);
	block.setHelpUrl("");
}

function outputBlock(block, type, colour, tooltip) {
	block.setOutput(true, type);
	block.setColour(colour);
	block.setTooltip(tooltip);
	block.setHelpUrl("");
}

Blockly.common.defineBlocks({
	// --- Loops and utilities ---
	setIntervalBlock: {
		init: function () {
			this.appendDummyInput().appendField("Every").appendField(new Blockly.FieldNumber(1000, 50), "INTERVAL").appendField("ms do");
			this.appendStatementInput("DO").setCheck(null);
			this.setColour(120);
			this.setTooltip("Runs the blocks inside over and over, waiting this many milliseconds between runs (1000 ms = 1 second)");
			this.setHelpUrl("");
		},
	},
	commentBlock: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Comment"), "LABEL").appendField(new Blockly.FieldTextInput("// Your comment here"), "COMMENT_TEXT");
			this.setColour(60);
			this.setTooltip("A note for humans. It doesn't do anything.");
			this.setHelpUrl("");
		},
	},
	logMessage: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Log Message"), "LABEL");
			this.appendValueInput("MESSAGE").setCheck(null).appendField("Message");
			statementBlock(this, 60, "Log a message to the browser's developer console (F12)");
		},
	},
	setMessage: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Set Message"), "LABEL");
			this.appendValueInput("MESSAGE").setCheck(null).appendField("Message");
			statementBlock(this, 60, "Show a short message in the small CODE box at the bottom of the screen");
		},
	},
	setChatLog: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Set Chat Log"), "LABEL");
			this.appendValueInput("MESSAGE").setCheck(null).appendField("Message");
			statementBlock(this, 60, "Write a message into the game's log");
		},
	},
	wait: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Wait"), "LABEL");
			this.appendValueInput("DURATION").setCheck("Number").appendField("Duration (ms)");
			statementBlock(this, 180, "Pause for this many milliseconds (1000 ms = 1 second)");
		},
	},
	declareVariable: {
		init: function () {
			this.appendDummyInput().appendField("set").appendField(new Blockly.FieldVariable("var"), "VAR").appendField("to").appendField(new Blockly.FieldTextInput("false"), "VALUE");
			statementBlock(this, 210, "Declare and initialize a variable.");
		},
	},

	// --- Movement ---
	moveto: {
		init: function () {
			this.appendDummyInput("INPUT_NAME")
				.appendField(new Blockly.FieldLabelSerializable("Move to Coordinates"), "LABEL")
				.appendField(new Blockly.FieldNumber(0), "X_COORD")
				.appendField(new Blockly.FieldNumber(0), "Y_COORD");
			this.setInputsInline(true);
			statementBlock(this, 225, "Move the character to the X, Y coordinates on the current map");
		},
	},
	moveUp: {
		init: function () {
			this.appendDummyInput().appendField("Move Up").appendField(new Blockly.FieldNumber(10), "STEPS");
			statementBlock(this, 180, "Move the character up by this many pixels");
		},
	},
	moveDown: {
		init: function () {
			this.appendDummyInput().appendField("Move Down").appendField(new Blockly.FieldNumber(10), "STEPS");
			statementBlock(this, 180, "Move the character down by this many pixels");
		},
	},
	moveLeft: {
		init: function () {
			this.appendDummyInput().appendField("Move Left").appendField(new Blockly.FieldNumber(10), "STEPS");
			statementBlock(this, 180, "Move the character left by this many pixels");
		},
	},
	moveRight: {
		init: function () {
			this.appendDummyInput().appendField("Move Right").appendField(new Blockly.FieldNumber(10), "STEPS");
			statementBlock(this, 180, "Move the character right by this many pixels");
		},
	},
	moveToLocation: {
		init: function () {
			this.appendDummyInput().appendField("Move to Location").appendField(new Blockly.FieldDropdown(getLocationOptions), "LOCATION");
			statementBlock(this, 225, "Walk (and travel) to the chosen map using smart_move");
		},
	},
	moveToEntity: {
		init: function () {
			this.appendValueInput("TARGET").setCheck("Entity").appendField("Move to Target");
			statementBlock(this, 225, "Move halfway towards the target if it is out of range");
		},
	},
	followPlayer: {
		init: function () {
			this.appendDummyInput().appendField("Follow Player").appendField(new Blockly.FieldTextInput("player_name"), "PLAYER_NAME");
			statementBlock(this, 225, "Walk to another player by name");
		},
	},
	dodgeAttack: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Dodge Attack"), "LABEL");
			this.appendValueInput("DIRECTION").setCheck("String").appendField("Direction");
			statementBlock(this, 120, "Step 50 pixels 'left' or 'right' to dodge");
		},
	},
	stopAction: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Stop"), "LABEL");
			statementBlock(this, 120, "Stop moving (and stop smart_move)");
		},
	},

	// --- Actions ---
	attack: {
		init: function () {
			this.appendValueInput("TARGET").setCheck("Entity").appendField("Attack Target");
			statementBlock(this, 160, "Attack the target if it is in range and the attack is ready");
		},
	},
	setTarget: {
		init: function () {
			this.appendValueInput("TARGET").setCheck("Entity").appendField("Set Target to");
			statementBlock(this, 180, "Set your current target to this monster or player");
		},
	},
	useSkill: {
		init: function () {
			this.appendDummyInput().appendField("Use Skill").appendField(new Blockly.FieldDropdown(getSkillOptions), "SKILL_NAME");
			this.appendValueInput("TARGET").setCheck("Entity").appendField("on Target");
			statementBlock(this, 230, "Use a skill on the target if it is ready");
		},
	},
	useSkillByName: {
		init: function () {
			this.appendDummyInput().appendField("Use Skill by Name").appendField(new Blockly.FieldTextInput("skill_name"), "SKILL_NAME");
			this.appendValueInput("TARGET").setCheck(["Entity", "Null"]).appendField("on Target");
			statementBlock(this, 230, "Use a skill (typed by name) on the target");
		},
	},
	castSpell: {
		init: function () {
			this.appendDummyInput().appendField("Cast Spell").appendField(new Blockly.FieldDropdown(getSpellOptions), "SPELL_NAME");
			this.appendValueInput("TARGET").setCheck("Entity").appendField("on Target");
			statementBlock(this, 260, "Cast a spell (skill) at the target");
		},
	},
	useHpOrMp: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Use HP or MP"), "LABEL");
			statementBlock(this, 200, "Drink a health or mana potion when you need one");
		},
	},
	useItem: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Use Item"), "LABEL");
			this.appendValueInput("ITEM_NAME").setCheck("String").appendField("Item Name");
			statementBlock(this, 200, "Use (or equip) an item from your inventory by its name, for example hpot0");
		},
	},
	loot: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Loot"), "LABEL");
			statementBlock(this, 120, "Open nearby treasure chests");
		},
	},

	// --- Character inputs ---
	getCharacterHP: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Get Character HP"), "LABEL");
			outputBlock(this, "Number", 240, "Your character's current health points");
		},
	},
	getCharacterMP: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Get Character MP"), "LABEL");
			outputBlock(this, "Number", 240, "Your character's current mana points");
		},
	},
	getCharacterX: {
		init: function () {
			this.appendDummyInput().appendField("Get Player X");
			outputBlock(this, "Number", 230, "Your character's X coordinate");
		},
	},
	getCharacterY: {
		init: function () {
			this.appendDummyInput().appendField("Get Player Y");
			outputBlock(this, "Number", 230, "Your character's Y coordinate");
		},
	},
	getCharacterLevel: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Get Character Level"), "LABEL");
			outputBlock(this, "Number", 210, "Your character's level");
		},
	},
	isCharacterMoving: {
		init: function () {
			this.appendDummyInput().appendField("Is Character Moving");
			outputBlock(this, "Boolean", 210, "True while your character is walking");
		},
	},
	isCharacterDead: {
		init: function () {
			this.appendDummyInput().appendField("Is Character Dead");
			outputBlock(this, "Boolean", 210, "True if your character is dead");
		},
	},

	// --- Other player inputs ---
	getNearestPlayer: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Get Nearest Player"), "LABEL");
			outputBlock(this, "Entity", 300, "The nearest other player (or nothing)");
		},
	},
	getPlayerByName: {
		init: function () {
			this.appendDummyInput().appendField("Get Player By Name").appendField(new Blockly.FieldTextInput("player_name"), "PLAYER_NAME");
			outputBlock(this, "Entity", 300, "A nearby player with this name (or nothing)");
		},
	},
	playerName: {
		init: function () {
			this.appendDummyInput().appendField("Player Name").appendField(new Blockly.FieldTextInput("player_name"), "PLAYER_NAME");
			outputBlock(this, "String", 300, "A player's name");
		},
	},
	getPlayerAttribute: {
		init: function () {
			this.appendValueInput("PLAYER").setCheck("Entity").appendField("Get Player").appendField(new Blockly.FieldDropdown(getPlayerAttributeOptions), "ATTRIBUTE").appendField("of");
			outputBlock(this, null, 300, "Read a value (HP, level, ...) from a player");
		},
	},
	getPlayerHPFromEntity: {
		init: function () {
			this.appendValueInput("PLAYER_ENTITY").setCheck("Entity").appendField("Get Player HP from");
			outputBlock(this, "Number", 250, "The HP of the player");
		},
	},
	getPlayerMPFromEntity: {
		init: function () {
			this.appendValueInput("PLAYER_ENTITY").setCheck("Entity").appendField("Get Player MP from");
			outputBlock(this, "Number", 250, "The MP of the player");
		},
	},

	// --- Monster inputs ---
	getNearestMonster: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField("Get Nearest Monster");
			outputBlock(this, "Entity", 330, "The nearest monster (or nothing)");
		},
	},
	getNearestMonsterOfType: {
		init: function () {
			this.appendDummyInput().appendField("Get Nearest Monster of Type").appendField(new Blockly.FieldDropdown(getMonsterOptions), "MONSTER_TYPE");
			outputBlock(this, "Entity", 330, "The nearest monster of the chosen type (or nothing)");
		},
	},
	getNearestMonsterWithOptions: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Get Nearest Monster"), "LABEL");
			this.appendValueInput("MIN_XP").setCheck("Number").appendField("Min XP").setAlign(Blockly.inputs.Align.RIGHT);
			this.appendValueInput("MAX_ATT").setCheck("Number").appendField("Max ATT").setAlign(Blockly.inputs.Align.RIGHT);
			outputBlock(this, "Entity", 330, "The nearest monster that gives at least Min XP and has at most Max ATT attack");
		},
	},
	getTargetedMonster: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Get Targeted Monster"), "LABEL");
			outputBlock(this, "Entity", 290, "The monster you are targeting (or nothing)");
		},
	},
	getMonsterAttribute: {
		init: function () {
			this.appendValueInput("MONSTER").setCheck("Entity").appendField("Get Monster").appendField(new Blockly.FieldDropdown(getMonsterAttributeOptions), "ATTRIBUTE").appendField("of");
			outputBlock(this, null, 330, "Read a value (HP, XP, ...) from a monster");
		},
	},
	getMonsterHP: {
		init: function () {
			this.appendValueInput("MONSTER").setCheck("Entity").appendField("Get Monster HP of");
			outputBlock(this, "Number", 330, "The monster's current HP");
		},
	},
	getMonsterXP: {
		init: function () {
			this.appendValueInput("MONSTER").setCheck("Entity").appendField("Get Monster XP");
			outputBlock(this, "Number", 330, "How much XP the monster gives");
		},
	},
	getMonsterGold: {
		init: function () {
			this.appendValueInput("MONSTER").setCheck("Entity").appendField("Get Monster Gold");
			outputBlock(this, "Number", 330, "How much gold this kind of monster drops");
		},
	},
	getMonsterX: {
		init: function () {
			this.appendValueInput("MONSTER").setCheck("Entity").appendField("Get X of Monster");
			outputBlock(this, "Number", 330, "The monster's X coordinate");
		},
	},
	getMonsterY: {
		init: function () {
			this.appendValueInput("MONSTER").setCheck("Entity").appendField("Get Y of Monster");
			outputBlock(this, "Number", 330, "The monster's Y coordinate");
		},
	},
	isMonsterNear: {
		init: function () {
			this.appendDummyInput().appendField("Is Monster Near (within").appendField(new Blockly.FieldNumber(100), "RANGE").appendField("pixels)");
			outputBlock(this, "Boolean", 210, "True if any monster is within this many pixels");
		},
	},
	isMonsterXpGoldBelow: {
		init: function () {
			this.appendValueInput("MONSTER").setCheck("Entity").appendField("Is Monster");
			this.appendDummyInput()
				.appendField(
					new Blockly.FieldDropdown([
						["XP", "xp"],
						["Gold", "gold"],
					]),
					"ATTRIBUTE",
				)
				.appendField("below");
			this.appendValueInput("THRESHOLD").setCheck("Number");
			outputBlock(this, "Boolean", 210, "True if the monster's XP or gold is below the number");
		},
	},

	// --- Other inputs ---
	currentTarget: {
		init: function () {
			this.appendDummyInput().appendField("Current Target");
			outputBlock(this, "Entity", 290, "Whatever you are targeting right now (monster or player)");
		},
	},
	canAttack: {
		init: function () {
			this.appendValueInput("TARGET").setCheck("Entity").appendField("Can Attack");
			outputBlock(this, "Boolean", 210, "True if the target is in range and your attack is ready");
		},
	},
	isInRange: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Is In Range"), "LABEL");
			this.appendValueInput("TARGET").setCheck(["Entity", "String"]).appendField("Target");
			outputBlock(this, "Boolean", 210, "True if the target is within your attack range");
		},
	},
	isMoving: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Is Moving"), "LABEL");
			this.appendValueInput("CHARACTER").setCheck(["Entity", "String"]).appendField("Character");
			outputBlock(this, "Boolean", 210, "True if that player or monster is moving");
		},
	},
	checkBuffStatus: {
		init: function () {
			this.appendDummyInput("INPUT_NAME").appendField(new Blockly.FieldLabelSerializable("Check Buff Status"), "LABEL");
			this.appendValueInput("BUFF_NAME").setCheck("String").appendField("Buff Name");
			outputBlock(this, "Boolean", 240, "True if your character has this buff/condition (see G.conditions)");
		},
	},
});

// ---------------------------------------------------------------------------
// Helpers emitted into the generated code (only when a block needs them)
// ---------------------------------------------------------------------------

function provideNearestPlayer() {
	return gen.provideFunction_(
		"get_nearest_player",
		`function ${gen.FUNCTION_NAME_PLACEHOLDER_}() {
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
	return gen.provideFunction_(
		"as_entity",
		`function ${gen.FUNCTION_NAME_PLACEHOLDER_}(value) {
  if (typeof value == "string") return get_player(value) || get_entity(value);
  return value;
}`,
	);
}

function provideUseItem() {
	return gen.provideFunction_(
		"use_item",
		`function ${gen.FUNCTION_NAME_PLACEHOLDER_}(name) {
  var slot = locate_item(name);
  if (slot == -1) return game_log("No " + name + " in the inventory");
  return equip(slot);
}`,
	);
}

function provideBlockError() {
	return gen.provideFunction_(
		"block_error",
		`function ${gen.FUNCTION_NAME_PLACEHOLDER_}(error) {
  game_log("Blockly: " + ((error && (error.reason || error.message)) || error), "#E13758");
}`,
	);
}

// ---------------------------------------------------------------------------
// JavaScript generators
// ---------------------------------------------------------------------------

function valueOr(block, name, fallback, order) {
	return gen.valueToCode(block, name, order === undefined ? Order.NONE : order) || fallback;
}

function quote(text) {
	return gen.quote_(text || "");
}

// Loops and utilities

// Runs the body, waits, and repeats. A new round never starts before the previous one has
// finished, so blocks that take a while (smart_move, attack) don't pile up on each other.
gen.forBlock["setIntervalBlock"] = function (block) {
	const interval = Math.max(50, Number(block.getFieldValue("INTERVAL")) || 1000);
	const body = gen.statementToCode(block, "DO");
	const onError = provideBlockError();
	return `(async function () {
  while (true) {
    try {
${gen.prefixLines(body, gen.INDENT + gen.INDENT)}    } catch (error) {
      ${onError}(error);
    }
    await sleep(${interval});
  }
})();
`;
};

gen.forBlock["commentBlock"] = function (block) {
	return "// " + String(block.getFieldValue("COMMENT_TEXT")).replace(/[\r\n]+/g, " ") + "\n";
};

gen.forBlock["logMessage"] = function (block) {
	return `console.log(${valueOr(block, "MESSAGE", "'Hello World'")});\n`;
};

gen.forBlock["setMessage"] = function (block) {
	return `set_message(${valueOr(block, "MESSAGE", "''")});\n`;
};

gen.forBlock["setChatLog"] = function (block) {
	return `game_log(${valueOr(block, "MESSAGE", "''")});\n`;
};

gen.forBlock["wait"] = function (block) {
	return `await sleep(${valueOr(block, "DURATION", "1000")});\n`;
};

gen.forBlock["declareVariable"] = function (block) {
	const name = gen.getVariableName(block.getFieldValue("VAR"));
	return `${name} = ${block.getFieldValue("VALUE") || "false"};\n`;
};

// Movement

gen.forBlock["moveto"] = function (block) {
	return `await move(${Number(block.getFieldValue("X_COORD"))}, ${Number(block.getFieldValue("Y_COORD"))});\n`;
};

function moveBy(dx, dy) {
	return function (block) {
		const steps = Number(block.getFieldValue("STEPS")) || 10;
		const x = dx ? `character.real_x ${dx > 0 ? "+" : "-"} ${steps}` : "character.real_x";
		const y = dy ? `character.real_y ${dy > 0 ? "+" : "-"} ${steps}` : "character.real_y";
		return `await move(${x}, ${y});\n`;
	};
}
gen.forBlock["moveUp"] = moveBy(0, -1);
gen.forBlock["moveDown"] = moveBy(0, 1);
gen.forBlock["moveLeft"] = moveBy(-1, 0);
gen.forBlock["moveRight"] = moveBy(1, 0);

gen.forBlock["moveToLocation"] = function (block) {
	return `await smart_move(${quote(block.getFieldValue("LOCATION"))});\n`;
};

gen.forBlock["moveToEntity"] = function (block) {
	const target = valueOr(block, "TARGET", "get_targeted_monster()");
	return `{
  let target = ${target};
  if (!target) {
    set_message("No target to move to");
  } else if (!is_in_range(target)) {
    await move(character.real_x + (target.real_x - character.real_x) / 2, character.real_y + (target.real_y - character.real_y) / 2);
  }
}
`;
};

gen.forBlock["followPlayer"] = function (block) {
	return `{
  let player = get_player(${quote(block.getFieldValue("PLAYER_NAME"))});
  if (player) {
    await smart_move(player);
  } else {
    set_message("Player not found");
  }
}
`;
};

gen.forBlock["dodgeAttack"] = function (block) {
	const direction = valueOr(block, "DIRECTION", "'left'");
	return `if (${direction} == "left") move(character.real_x - 50, character.real_y);
else if (${direction} == "right") move(character.real_x + 50, character.real_y);
`;
};

gen.forBlock["stopAction"] = function () {
	return "stop();\n";
};

// Actions

gen.forBlock["attack"] = function (block) {
	const target = valueOr(block, "TARGET", "get_targeted_monster()");
	return `{
  let target = ${target};
  if (target && can_attack(target)) {
    set_message("Attacking");
    try { await attack(target); } catch (error) {}
  }
}
`;
};

gen.forBlock["setTarget"] = function (block) {
	return `change_target(${valueOr(block, "TARGET", "null")});\n`;
};

function useSkillCode(skill, target) {
	return `if (can_use(${skill})) {
  try { await use_skill(${skill}, ${target}); } catch (error) {}
}
`;
}

gen.forBlock["useSkill"] = function (block) {
	return useSkillCode(quote(block.getFieldValue("SKILL_NAME")), valueOr(block, "TARGET", "get_target()"));
};

gen.forBlock["useSkillByName"] = function (block) {
	return useSkillCode(quote(block.getFieldValue("SKILL_NAME")), valueOr(block, "TARGET", "get_target()"));
};

gen.forBlock["castSpell"] = function (block) {
	return useSkillCode(quote(block.getFieldValue("SPELL_NAME")), valueOr(block, "TARGET", "get_target()"));
};

gen.forBlock["useHpOrMp"] = function () {
	return "use_hp_or_mp();\n";
};

gen.forBlock["useItem"] = function (block) {
	return `${provideUseItem()}(${valueOr(block, "ITEM_NAME", "'hpot0'")});\n`;
};

gen.forBlock["loot"] = function () {
	return "loot();\n";
};

// Character inputs

gen.forBlock["getCharacterHP"] = () => ["character.hp", Order.MEMBER];
gen.forBlock["getCharacterMP"] = () => ["character.mp", Order.MEMBER];
gen.forBlock["getCharacterX"] = () => ["character.real_x", Order.MEMBER];
gen.forBlock["getCharacterY"] = () => ["character.real_y", Order.MEMBER];
gen.forBlock["getCharacterLevel"] = () => ["character.level", Order.MEMBER];
gen.forBlock["isCharacterMoving"] = () => ["is_moving(character)", Order.FUNCTION_CALL];
gen.forBlock["isCharacterDead"] = () => ["!!character.rip", Order.LOGICAL_NOT];

// Other player inputs

gen.forBlock["getNearestPlayer"] = function () {
	return [`${provideNearestPlayer()}()`, Order.FUNCTION_CALL];
};

gen.forBlock["getPlayerByName"] = function (block) {
	return [`get_player(${quote(block.getFieldValue("PLAYER_NAME"))})`, Order.FUNCTION_CALL];
};

gen.forBlock["playerName"] = function (block) {
	return [quote(block.getFieldValue("PLAYER_NAME")), Order.ATOMIC];
};

// Reads entity[property] without crashing when there is no entity
function entityProperty(inputName, property) {
	return function (block) {
		const entity = valueOr(block, inputName, "null", Order.MEMBER);
		return [`(${entity} || {}).${property || block.getFieldValue("ATTRIBUTE")}`, Order.MEMBER];
	};
}

gen.forBlock["getPlayerAttribute"] = entityProperty("PLAYER");
gen.forBlock["getPlayerHPFromEntity"] = entityProperty("PLAYER_ENTITY", "hp");
gen.forBlock["getPlayerMPFromEntity"] = entityProperty("PLAYER_ENTITY", "mp");

// Monster inputs

gen.forBlock["getNearestMonster"] = () => ["get_nearest_monster()", Order.FUNCTION_CALL];

gen.forBlock["getNearestMonsterOfType"] = function (block) {
	return [`get_nearest_monster({ type: ${quote(block.getFieldValue("MONSTER_TYPE"))} })`, Order.FUNCTION_CALL];
};

gen.forBlock["getNearestMonsterWithOptions"] = function (block) {
	const minXp = valueOr(block, "MIN_XP", "100");
	const maxAtt = valueOr(block, "MAX_ATT", "120");
	return [`get_nearest_monster({ min_xp: ${minXp}, max_att: ${maxAtt} })`, Order.FUNCTION_CALL];
};

gen.forBlock["getTargetedMonster"] = () => ["get_targeted_monster()", Order.FUNCTION_CALL];

gen.forBlock["getMonsterAttribute"] = entityProperty("MONSTER");
gen.forBlock["getMonsterHP"] = entityProperty("MONSTER", "hp");
gen.forBlock["getMonsterXP"] = entityProperty("MONSTER", "xp");
gen.forBlock["getMonsterX"] = entityProperty("MONSTER", "real_x");
gen.forBlock["getMonsterY"] = entityProperty("MONSTER", "real_y");

gen.forBlock["getMonsterGold"] = function (block) {
	const monster = valueOr(block, "MONSTER", "null", Order.MEMBER);
	return [`((G.monsters[(${monster} || {}).mtype] || {}).gold || 0)`, Order.ATOMIC];
};

gen.forBlock["isMonsterNear"] = function (block) {
	const range = Number(block.getFieldValue("RANGE")) || 100;
	return [`Object.values(parent.entities).some((entity) => entity.type == "monster" && !entity.dead && distance(character, entity) <= ${range})`, Order.FUNCTION_CALL];
};

gen.forBlock["isMonsterXpGoldBelow"] = function (block) {
	const monster = valueOr(block, "MONSTER", "null", Order.MEMBER);
	const threshold = valueOr(block, "THRESHOLD", "0", Order.RELATIONAL);
	const value = block.getFieldValue("ATTRIBUTE") === "xp" ? `(${monster} || {}).xp` : `(G.monsters[(${monster} || {}).mtype] || {}).gold`;
	return [`(${value} < ${threshold})`, Order.ATOMIC];
};

// Other inputs

gen.forBlock["currentTarget"] = () => ["get_target()", Order.FUNCTION_CALL];

gen.forBlock["canAttack"] = function (block) {
	return [`can_attack(${valueOr(block, "TARGET", "get_targeted_monster()")})`, Order.FUNCTION_CALL];
};

gen.forBlock["isInRange"] = function (block) {
	return [`is_in_range(${provideAsEntity()}(${valueOr(block, "TARGET", "get_targeted_monster()")}))`, Order.FUNCTION_CALL];
};

gen.forBlock["isMoving"] = function (block) {
	return [`is_moving(${provideAsEntity()}(${valueOr(block, "CHARACTER", "character")}))`, Order.FUNCTION_CALL];
};

gen.forBlock["checkBuffStatus"] = function (block) {
	return [`!!(character.s && character.s[${valueOr(block, "BUFF_NAME", "'speed'")}])`, Order.LOGICAL_NOT];
};

// ---------------------------------------------------------------------------
// Tweaks to Blockly's built-in blocks so they fit the game
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
