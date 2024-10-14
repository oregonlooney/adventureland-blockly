let workspace; // Declare a global variable to hold the workspace
const defaultBlocksXML = `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="setIntervalBlock" id="|AwK}|akRxenTLjKI6Vh" x="290" y="310">
    <field name="INTERVAL">1000</field>
  </block>
    <block type="commentBlock" id="comment1" x="100" y="100">
    <field name="COMMENT_TEXT">Welcome to Adventure Land Blockly Edition</field>
  </block>

  <block type="commentBlock" id="comment1" x="100" y="130">
    <field name="COMMENT_TEXT">Use the blocks to automate your character</field>
  </block>
   <block type="commentBlock" id="comment1" x="100" y="160">
    <field name="COMMENT_TEXT">Put code in the loop block to run it every 1 sec</field>
  </block>
</xml>
`;

// Function to toggle the Block UI Window
function toggle_block() {
    var blockui = document.getElementById('blockui');
    var isVisible = blockui.style.display === 'block';
    
    if (isVisible) {
        blockui.style.display = 'none';
        // Remove any Blockly-specific effects if needed
        remove_block_fx();
    } else {
        blockui.style.display = 'block';
        // Resize Blockly workspace after a short delay
        setTimeout(function() {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    }
    
    // Optionally, blur any focused elements to prevent unintended interactions
    $(":focus").blur();
}
// Initialize Blockly and add resize handling
function initBlockly() {
    workspace = Blockly.inject('blocklyDiv', {
        toolbox: document.getElementById('toolbox'),
        collapse: true,
        comments: false,
        disable: false,
        maxBlocks: Infinity,
        trashcan: true,
        scrollbars: true,
        oneBasedIndex: true,

        // Add zoom controls
        zoom: {
            controls: true,  // Display zoom controls
            wheel: true,     // Enable zooming with mouse wheel
            startScale: 1.0, // Initial zoom level
            maxScale: 3,     // Maximum zoom level
            minScale: 0.3,   // Minimum zoom level
            scaleSpeed: 1.2  // Zooming speed
        },

        // Add grid
        grid: {
            spacing: 20,      // Grid spacing in pixels
            length: 3,        // Length of the grid lines
            colour: '#ccc',   // Color of the grid lines
            snap: true        // Whether blocks snap to the grid
        },

        // Optional: Auto-resize the workspace when window resizes
        autoResize: true,

        // Optional: Enable context menus for more block operations
        contextMenu: true

    });
    

    // Update generated code
    workspace.addChangeListener(function(event) {
        var code = Blockly.JavaScript.workspaceToCode(workspace);
        document.getElementById('generatedBlockCode').value = code;
        console.log("Generated Code:", code);
    });

    // Resize function
    function resizeBlockly() {
        var blockui = document.getElementById('blockui');
        var blocklyDiv = document.getElementById('blocklyDiv');
        var codeOutput = document.getElementById('generatedBlockCode');
        
        if (blockui.style.display === 'block') {
            var totalHeight = blockui.offsetHeight - 200; // Adjust for other elements
            var blocklyHeight = totalHeight - codeOutput.offsetHeight;
            
            blocklyDiv.style.width = (blockui.offsetWidth - 20) + 'px';
            blocklyDiv.style.height = blocklyHeight + 'px';
            codeOutput.style.width = (blockui.offsetWidth - 20) + 'px';
            
            Blockly.svgResize(workspace);
        }
    }

    // Resize handlers
    var blocklyResizeHandle = document.getElementById('blocklyResizeHandle');
    var blocklyCodeResizeHandle = document.getElementById('blocklyCodeResizeHandle');
    var blockui = document.getElementById('blockui');
    var blocklyDiv = document.getElementById('blocklyDiv');
    var codeOutput = document.getElementById('generatedBlockCode');

    blocklyResizeHandle.addEventListener('mousedown', initHorizontalDrag);
    blocklyCodeResizeHandle.addEventListener('mousedown', initVerticalDrag);

    function initHorizontalDrag(e) {
        e.preventDefault();
        document.addEventListener('mousemove', doDragHorizontal);
        document.addEventListener('mouseup', stopDragHorizontal);
    }

    function doDragHorizontal(e) {
        blockui.style.width = (e.clientX - blockui.offsetLeft) + 'px';
        resizeBlockly();
    }

    function stopDragHorizontal() {
        document.removeEventListener('mousemove', doDragHorizontal);
        document.removeEventListener('mouseup', stopDragHorizontal);
    }

    function initVerticalDrag(e) {
        e.preventDefault();
        document.addEventListener('mousemove', doDragVertical);
        document.addEventListener('mouseup', stopDragVertical);
    }

    function doDragVertical(e) {
        var newBlocklyHeight = e.clientY - blockui.offsetTop - blocklyDiv.offsetTop;
        blocklyDiv.style.height = newBlocklyHeight + 'px';
        codeOutput.style.height = (blockui.offsetHeight - newBlocklyHeight - 200) + 'px'; // Adjust for other elements
        resizeBlockly();
    }

    function stopDragVertical() {
        document.removeEventListener('mousemove', doDragVertical);
        document.removeEventListener('mouseup', stopDragVertical);
    }

    // Initial resize
    setTimeout(resizeBlockly, 100);

    // Add a resize handler for when the Block window is toggled or resized
    window.addEventListener('resize', resizeBlockly);
    blockui.addEventListener('mouseup', resizeBlockly); // For the horizontal resize
    try {
        const xml = Blockly.utils.xml.textToDom(defaultBlocksXML);
        Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, workspace);
    } catch (e) {
        console.error('Error loading default blocks:', e);
    }


}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// Execute Blockly code
// Execute Blockly code
function runBlocklyCode() {
    const code = document.getElementById("generatedBlockCode").value;
    
    if (code_run) {
        // Stop the existing Blockly runner before starting a new one
        stop_runner("blockly_runner");
    }
    
    start_runner("blockly_runner", `
        // Blockly Generated Code
    
        (async () => {
            ${code}
        })();
    `);
    
    // Optionally, Set the code_run Flag if Applicable
    code_run = true; // Ensure this flag is defined and managed appropriately
}

// New Function to Stop Blockly Code
function stopBlocklyCode() {
    stop_runner("blockly_runner");
    
    // Optionally, Reset the code_run Flag if Applicable
    code_run = false; // Ensure this flag is defined and managed appropriately
}

document.addEventListener("DOMContentLoaded", function () {
    initBlockly();
});

// Custom Blocks 

function saveBlocks() {
    if (!workspace) {
        console.error('Workspace is not initialized.');
        return;
    }

    var xml = Blockly.Xml.workspaceToDom(workspace);
    var xmlText = Blockly.Xml.domToPrettyText(xml);
    
    var blob = new Blob([xmlText], {type: 'text/xml'});
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'blockly_workspace.xml';
    link.click();
}

function loadBlocks(event) {
    if (!workspace) {
        console.error('Workspace is not initialized.');
        return;
    }

    var file = event.target.files[0];
    if (!file) {
        return;
    }

    var reader = new FileReader();
    
    reader.onload = function(event) {
        var xmlText = event.target.result;
        try {
            var xml = Blockly.utils.xml.textToDom(xmlText);
            Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, workspace);
        } catch (e) {
            console.error('Error parsing XML:', e);
            alert('Failed to load blocks. Please ensure the file is a valid Blockly XML file.');
        }
    };
    
    reader.readAsText(file);
}




const moveto = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Move to Coordinates'), 'LABEL')
            .appendField(new Blockly.FieldNumber(0), 'X_COORD')
            .appendField(new Blockly.FieldNumber(0), 'Y_COORD');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Move the character to specified coordinates');
        this.setHelpUrl('');
        this.setColour(225);
    }
};


const commentBlock = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Comment'), 'LABEL')
            .appendField(new Blockly.FieldTextInput('// Your comment here'), 'COMMENT_TEXT');
        this.setPreviousStatement(false);
        this.setNextStatement(false);
        this.setTooltip('Insert a comment into the code');
        this.setHelpUrl('');
        this.setColour(60);
    }
};
// Attack Block
const attack = {
    init: function() {
        this.appendValueInput('TARGET')
            .setCheck('Entity')
            .appendField('Attack Target');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Attack the specified target');
        this.setColour(160);
    }
};

// Get Player X Block
const getCharacterX = {
    init: function() {
        this.appendDummyInput()
            .appendField('Get Player X');
        this.setOutput(true, 'Number');
        this.setTooltip('Returns the player\'s X coordinate');
        this.setColour(230);
    }
};

// Get Player Y Block
const getCharacterY = {
    init: function() {
        this.appendDummyInput()
            .appendField('Get Player Y');
        this.setOutput(true, 'Number');
        this.setTooltip('Returns the player\'s Y coordinate');
        this.setColour(230);
    }
};

const getMonsterX = {
    init: function() {
        this.appendValueInput('MONSTER')
            .setCheck('Entity')
            .appendField('Get X of Monster');
        this.setOutput(true, 'Number');
        this.setTooltip('Returns the X coordinate of the specified monster');
        this.setColour(330);
    }
};

const getMonsterY = {
    init: function() {
        this.appendValueInput('MONSTER')
            .setCheck('Entity')
            .appendField('Get Y of Monster');
        this.setOutput(true, 'Number');
        this.setTooltip('Returns the Y coordinate of the specified monster');
        this.setColour(330);
    }
};

const isMonsterNear = {
    init: function() {
        this.appendDummyInput()
            .appendField('Is Monster Near (within')
            .appendField(new Blockly.FieldNumber(100), 'RANGE')
            .appendField('pixels)');
        this.setOutput(true, 'Boolean');
        this.setTooltip('Returns true if any monster is within the specified range');
        this.setHelpUrl('');
        this.setColour(210);
    }
};

// Use Skill Block with Dynamic Dropdown
const useSkill = {
    init: function() {
        this.appendDummyInput()
            .appendField('Use Skill')
            .appendField(new Blockly.FieldDropdown(getSkillOptions), 'SKILL_NAME');
        this.appendValueInput('TARGET')
            .setCheck('Entity')
            .appendField('on Target');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Use a skill on the specified target');
        this.setColour(230);
    }
};

// Function to Populate Skill Options
function getSkillOptions() {
    var options = [];
    for (var skill in parent.G.skills) {
        options.push([skill, skill]);
    }
    return options;
}

// Get Nearest Monster of Type Block
const getNearestMonsterOfType = {
    init: function() {
        this.appendDummyInput()
            .appendField('Get Nearest Monster of Type')
            .appendField(new Blockly.FieldDropdown(getMonsterOptions), 'MONSTER_TYPE');
        this.setOutput(true, 'Entity');
        this.setTooltip('Returns the nearest monster of the specified type');
        this.setColour(330);
    }
};

// Function to Populate Monster Options
function getMonsterOptions() {
    var options = [];
    for (var monster in parent.G.monsters) {
        options.push([monster, monster]);
    }
    return options;
}

// Move to Location Block
const moveToLocation = {
    init: function() {
        this.appendDummyInput()
            .appendField('Move to Location')
            .appendField(new Blockly.FieldDropdown(getLocationOptions), 'LOCATION');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Moves character to the specified location');
        this.setColour(225);
    }
};

// Function to Populate Location Options
function getLocationOptions() {
    var options = [];
    for (var mapName in parent.G.maps) {
        options.push([mapName, mapName]);
    }
    return options;
}





const stopAction = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Stop'), 'LABEL');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Stop all current actions');
        this.setHelpUrl('');
        this.setColour(120);
    }
};


const logMessage = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Log Message'), 'LABEL');
        this.appendValueInput('MESSAGE')
            .setCheck('String')
            .appendField('Message');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Log a custom message to the console');
        this.setHelpUrl('');
        this.setColour(60);
    }
};

const wait = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Wait'), 'LABEL');
        this.appendValueInput('DURATION')
            .setCheck('Number')
            .appendField('Duration (ms)');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Pause execution for the specified duration in milliseconds');
        this.setHelpUrl('');
        this.setColour(180);
    }
};
const getNearestMonster = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField('Get Nearest Monster');
        this.setOutput(true, 'Entity');
        this.setTooltip('Returns the nearest monster entity');
        this.setColour(330);
    }
};

const getNearestPlayer = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Get Nearest Player'), 'LABEL');
        this.setOutput(true, 'Entity'); // Changed from 'String' to 'Entity'
        this.setTooltip('Returns the nearest player entity');
        this.setHelpUrl('');
        this.setColour(300);
    }
};


const getCharacterHP = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Get Character HP'), 'LABEL');
        this.setOutput(true, 'Number');
        this.setTooltip('Returns the current health points of the character');
        this.setHelpUrl('');
        this.setColour(240);
    }
};

const getCharacterMP = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Get Character MP'), 'LABEL');
        this.setOutput(true, 'Number');
        this.setTooltip('Returns the current mana points of the character');
        this.setHelpUrl('');
        this.setColour(240);
    }
};

const getCharacterLevel = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Get Character Level'), 'LABEL');
        this.setOutput(true, 'Number');
        this.setTooltip('Returns the current level of the character');
        this.setHelpUrl('');
        this.setColour(210);
    }
};

// New Blocks

const useHpOrMp = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Use HP or MP'), 'LABEL');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Uses HP or MP as needed');
        this.setHelpUrl('');
        this.setColour(200);
    }
};


const loot = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Loot'), 'LABEL');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Loot items from defeated monsters');
        this.setHelpUrl('');
        this.setColour(120);
    }
};

const getTargetedMonster = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Get Targeted Monster'), 'LABEL');
        this.setOutput(true, 'Entity'); // Changed from 'String' to 'Entity'
        this.setTooltip('Returns the currently targeted monster');
        this.setHelpUrl('');
        this.setColour(290);
    }
};

const getNearestMonsterWithOptions = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Get Nearest Monster'), 'LABEL');
        this.appendValueInput('MIN_XP')
            .setCheck('Number')
            .appendField('Min XP')
            .setAlign(Blockly.ALIGN_RIGHT);
        this.appendValueInput('MAX_ATT')
            .setCheck('Number')
            .appendField('Max ATT')
            .setAlign(Blockly.ALIGN_RIGHT);
        this.setOutput(true, 'String');
        this.setTooltip('Returns the nearest monster with specified XP and ATT criteria');
        this.setHelpUrl('');
        this.setColour(330);
    }
};


const setMessage = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Set Message'), 'LABEL');
        this.appendValueInput('MESSAGE')
            .setCheck('String')
            .appendField('Message');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Sets a message in the game chat');
        this.setHelpUrl('');
        this.setColour(60);
    }
};

const isInRange = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Is In Range'), 'LABEL');
        this.appendValueInput('TARGET')
            .setCheck('String')
            .appendField('Target');
        this.setOutput(true, 'Boolean');
        this.setTooltip('Checks if the target is in range');
        this.setHelpUrl('');
        this.setColour(210);
    }
};

const isMoving = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Is Moving'), 'LABEL');
        this.appendValueInput('CHARACTER')
            .setCheck('String')
            .appendField('Character');
        this.setOutput(true, 'Boolean');
        this.setTooltip('Checks if the specified character is moving');
        this.setHelpUrl('');
        this.setColour(210);
    }
};

const declareVariable = {
    init: function() {
        this.appendDummyInput()
            .appendField("set")
            .appendField(new Blockly.FieldVariable("var"), "VAR")
            .appendField("to")
            .appendField(new Blockly.FieldTextInput("false"), "VALUE");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(210);
        this.setTooltip("Declare and initialize a variable.");
        this.setHelpUrl("");
    }
};


// 1. Cast Spell Block
const castSpell = {
    init: function() {
        this.appendDummyInput()
            .appendField('Cast Spell')
            .appendField(new Blockly.FieldDropdown(getSpellOptions), 'SPELL_NAME');
        this.appendValueInput('TARGET')
            .setCheck('Entity')
            .appendField('on Target');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Cast a spell at the specified target');
        this.setHelpUrl('');
        this.setColour(260);
    }
};

// 2. Dodge Attack Block
const dodgeAttack = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Dodge Attack'), 'LABEL');
        this.appendValueInput('DIRECTION')
            .setCheck('String')
            .appendField('Direction');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Dodge in the specified direction to avoid an attack');
        this.setHelpUrl('');
        this.setColour(120);
    }
};

// 3. Use Item Block
const useItem = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Use Item'), 'LABEL');
        this.appendValueInput('ITEM_NAME')
            .setCheck('String')
            .appendField('Item Name');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Use a specific item from inventory');
        this.setHelpUrl('');
        this.setColour(200);
    }
};

// 4. Check Buff Status Block
const checkBuffStatus = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Check Buff Status'), 'LABEL');
        this.appendValueInput('BUFF_NAME')
            .setCheck('String')
            .appendField('Buff Name');
        this.setOutput(true, 'Boolean');
        this.setTooltip('Checks if the specified buff is active');
        this.setHelpUrl('');
        this.setColour(240);
    }
};


// 6. Move Up Block
// Modified Move Blocks with Number Input Fields
const moveUp = {
    init: function() {
        this.appendDummyInput()
            .appendField('Move Up')
            .appendField(new Blockly.FieldNumber(10), 'STEPS');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Move the character up by a specified number of steps');
        this.setHelpUrl('');
        this.setColour(180);
    }
};

const moveDown = {
    init: function() {
        this.appendDummyInput()
            .appendField('Move Down')
            .appendField(new Blockly.FieldNumber(10), 'STEPS');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Move the character down by a specified number of steps');
        this.setHelpUrl('');
        this.setColour(180);
    }
};

const moveLeft = {
    init: function() {
        this.appendDummyInput()
            .appendField('Move Left')
            .appendField(new Blockly.FieldNumber(10), 'STEPS');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Move the character left by a specified number of steps');
        this.setHelpUrl('');
        this.setColour(180);
    }
};

const moveRight = {
    init: function() {
        this.appendDummyInput()
            .appendField('Move Right')
            .appendField(new Blockly.FieldNumber(10), 'STEPS');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Move the character right by a specified number of steps');
        this.setHelpUrl('');
        this.setColour(180);
    }
};

// Define the new 'Move to Target' block
const moveToEntity = {
    init: function() {
        this.appendValueInput('TARGET')
            .setCheck('Entity')
            .appendField('Move to Target');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Move to the specified target');
        this.setColour(225);
    }
};

const canAttack = {
    init: function() {
        this.appendValueInput('TARGET')
            .setCheck('Entity')
            .appendField('Can Attack');
        this.setOutput(true, 'Boolean');
        this.setTooltip('Checks if you can attack the specified target');
        this.setColour(210);
    }
};

// Define the 'Is Character Dead' block
const isCharacterDead = {
    init: function() {
        this.appendDummyInput()
            .appendField('Is Character Dead');
        this.setOutput(true, 'Boolean');
        this.setTooltip('Checks if your character is dead');
        this.setColour(210);
    }
};


// Added Follow Player Block
const followPlayer = {
    init: function() {
        this.appendDummyInput()
            .appendField('Follow Player')
            .appendField(new Blockly.FieldTextInput('player_name'), 'PLAYER_NAME');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Follow another player by name');
        this.setHelpUrl('');
        this.setColour(225);
    }
};

// Added Player Name Input Block
const playerName = {
    init: function() {
        this.appendDummyInput()
            .appendField('Player Name')
            .appendField(new Blockly.FieldTextInput('player_name'), 'PLAYER_NAME');
        this.setOutput(true, 'String');
        this.setTooltip('Specify a player name');
        this.setColour(300);
    }
};

// New Block: Get Monster XP
const getMonsterXP = {
    init: function() {
        this.appendValueInput('MONSTER')
            .setCheck('Entity')
            .appendField('Get Monster XP');
        this.setOutput(true, 'Number');
        this.setTooltip('Returns the XP value of the specified monster');
        this.setColour(330);
    }
};

// New Block: Get Monster Gold
const getMonsterGold = {
    init: function() {
        this.appendValueInput('MONSTER')
            .setCheck('Entity')
            .appendField('Get Monster Gold');
        this.setOutput(true, 'Number');
        this.setTooltip('Returns the gold value of the specified monster');
        this.setColour(330);
    }
};
const isMonsterXpGoldBelow = {
    init: function() {
        this.appendValueInput('MONSTER')
            .setCheck('Entity')
            .appendField('Is Monster');
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([['XP', 'xp'], ['Gold', 'gold']]), 'ATTRIBUTE')
            .appendField('below');
        this.appendValueInput('THRESHOLD')
            .setCheck('Number');
        this.setOutput(true, 'Boolean');
        this.setTooltip('Checks if the monster\'s XP or gold is below a threshold');
        this.setColour(210);
    }
};
const getPlayerHPFromEntity = {
    init: function() {
        this.appendValueInput('PLAYER_ENTITY')
            .setCheck('Entity')
            .appendField('Get Player HP from');
        this.setOutput(true, 'Number');
        this.setTooltip('Returns the HP of the specified player entity');
        this.setColour(250);
    }
};

// Get Player MP from Entity Block
const getPlayerMPFromEntity = {
    init: function() {
        this.appendValueInput('PLAYER_ENTITY')
            .setCheck('Entity')
            .appendField('Get Player MP from');
        this.setOutput(true, 'Number');
        this.setTooltip('Returns the MP of the specified player entity');
        this.setColour(250);
    }
};


const isCharacterMoving = {
    init: function() {
        this.appendDummyInput()
            .appendField('Is Character Moving');
        this.setOutput(true, 'Boolean');
        this.setTooltip('Checks if the character is moving');
        this.setColour(210);
    }
};

const getPlayerByName = {
    init: function() {
        this.appendDummyInput()
            .appendField('Get Player By Name')
            .appendField(new Blockly.FieldTextInput('player_name'), 'PLAYER_NAME');
        this.setOutput(true, 'Entity');
        this.setTooltip('Gets the player entity by name');
        this.setColour(300);
    }
};

const useSkillByName = {
    init: function() {
        this.appendDummyInput()
            .appendField('Use Skill by Name')
            .appendField(new Blockly.FieldTextInput('skill_name'), 'SKILL_NAME');
        this.appendValueInput('TARGET')
            .setCheck(['Entity', 'Null'])
            .appendField('on Target');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Use a skill on the specified target by name');
        this.setColour(230);
    }
};
const getMonsterHP = {
    init: function() {
        this.appendValueInput('MONSTER')
            .setCheck('Entity')
            .appendField('Get Monster HP of');
        this.setOutput(true, 'Number');
        this.setTooltip('Returns the current HP of the specified monster');
        this.setColour(330);
    }
};

const setIntervalBlock = {
    init: function() {
        this.appendDummyInput()
            .appendField('Every')
            .appendField(new Blockly.FieldNumber(1000), 'INTERVAL')
            .appendField('ms do');
        this.appendStatementInput('DO')
            .setCheck(null);
        this.setColour(120);
        this.setTooltip('Run the enclosed blocks every specified interval in milliseconds');
        this.setHelpUrl('');
    }
};

javascript.javascriptGenerator.forBlock['setIntervalBlock'] = function(block) {
    const interval = block.getFieldValue('INTERVAL') || '1000';
    const statements_do = Blockly.JavaScript.statementToCode(block, 'DO');
    const code = `
        setInterval(async function() {
            ${statements_do}
        }, ${interval});
    `;
    return code;
};


// Function to Populate Monster Attribute Options
function getMonsterAttributeOptions() {
    return [
        ['HP', 'hp'],
        ['Max HP', 'max_hp'],
        ['Level', 'level'],
        ['XP', 'xp'],
        ['Attack', 'attack'],
        ['Speed', 'speed'],
        ['Range', 'range'],
        ['Type', 'type'],
        ['Target', 'target'],
        ['X Position', 'x'],
        ['Y Position', 'y'],
        ['Moving', 'moving'],
        ['Dead', 'dead'],
        // Add other attributes as needed
    ];
}

const getMonsterAttribute = {
    init: function() {
        this.appendValueInput('MONSTER')
            .setCheck('Entity')
            .appendField('Get Monster')
            .appendField(new Blockly.FieldDropdown(getMonsterAttributeOptions), 'ATTRIBUTE')
            .appendField('of');
        this.setOutput(true, null); // Output type depends on attribute
        this.setTooltip('Gets an attribute of the specified monster');
        this.setColour(330);
    }
};

javascript.javascriptGenerator.forBlock['getMonsterAttribute'] = function(block) {
    const monster = Blockly.JavaScript.valueToCode(block, 'MONSTER', Blockly.JavaScript.ORDER_NONE) || 'null';
    const attribute = block.getFieldValue('ATTRIBUTE');
    const code = `(${monster} && ${monster}.${attribute})`;
    return [code, Blockly.JavaScript.ORDER_MEMBER];
};



// Function to Populate Player Attribute Options
function getPlayerAttributeOptions() {
    return [
        ['HP', 'hp'],
        ['Max HP', 'max_hp'],
        ['MP', 'mp'],
        ['Max MP', 'max_mp'],
        ['Level', 'level'],
        ['X Position', 'x'],
        ['Y Position', 'y'],
        ['Moving', 'moving'],
        ['Target', 'target'],
        ['Party', 'party'],
        ['Dead', 'rip'],
        // Add other attributes as needed
    ];
}

const getPlayerAttribute = {
    init: function() {
        this.appendValueInput('PLAYER')
            .setCheck('Entity')
            .appendField('Get Player')
            .appendField(new Blockly.FieldDropdown(getPlayerAttributeOptions), 'ATTRIBUTE')
            .appendField('of');
        this.setOutput(true, null); // Output type depends on attribute
        this.setTooltip('Gets an attribute of the specified player');
        this.setColour(300);
    }
};

javascript.javascriptGenerator.forBlock['getPlayerAttribute'] = function(block) {
    const player = Blockly.JavaScript.valueToCode(block, 'PLAYER', Blockly.JavaScript.ORDER_NONE) || 'null';
    const attribute = block.getFieldValue('ATTRIBUTE');
    const code = `(${player} && ${player}.${attribute})`;
    return [code, Blockly.JavaScript.ORDER_MEMBER];
};


// SetTarget Block
const setTarget = {
    init: function() {
        this.appendValueInput('TARGET')
            .setCheck('Entity')
            .appendField('Set Target to');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Sets the current target to the specified entity');
        this.setColour(180);
    }
};
javascript.javascriptGenerator.forBlock['setTarget'] = function(block) {
    const target = Blockly.JavaScript.valueToCode(block, 'TARGET', Blockly.JavaScript.ORDER_NONE) || 'null';
    const code = `change_target(${target});\n`;
    return code;
};


// current Target Block
const currentTarget = {
    init: function() {
        this.appendDummyInput()
            .appendField('Current Target');
        this.setOutput(true, 'Entity');
        this.setTooltip('Returns the currently targeted entity');
        this.setHelpUrl('');
        this.setColour(290);
    }
};

javascript.javascriptGenerator.forBlock['currentTarget'] = function(block) {
    const code = `get_target()`;
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

const setChatLog = {
    init: function() {
        this.appendDummyInput('INPUT_NAME')
            .appendField(new Blockly.FieldLabelSerializable('Set Chat Log'), 'LABEL');
        this.appendValueInput('MESSAGE')
            .setCheck('String')
            .appendField('Message');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setTooltip('Sets a message in the game console chat');
        this.setHelpUrl('');
        this.setColour(60);
    }
};


javascript.javascriptGenerator.forBlock['setChatLog'] = function(block) {
    const label = block.getFieldValue('LABEL');
    const message = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_NONE) || `'No Monsters'`;
  
    // Assemble JavaScript code
    const code = `log(${message});\n`;
    return code;
}




Blockly.common.defineBlocks({
    moveto: moveto,
    attack: attack,
    useSkill: useSkill,
    stopAction: stopAction,
    logMessage: logMessage,
    wait: wait,
    getNearestMonster: getNearestMonster,
    getNearestPlayer: getNearestPlayer,
    getCharacterHP: getCharacterHP,
    getCharacterMP: getCharacterMP,
    getCharacterLevel: getCharacterLevel,
    useHpOrMp: useHpOrMp,
    loot: loot,
    getTargetedMonster: getTargetedMonster,
    getNearestMonsterWithOptions: getNearestMonsterWithOptions,
    setMessage: setMessage,
    isInRange: isInRange,
    isMoving: isMoving,
    declareVariable: declareVariable,
    castSpell: castSpell,
    dodgeAttack: dodgeAttack,
    useItem: useItem,
    checkBuffStatus: checkBuffStatus,
    moveUp: moveUp,
    moveDown: moveDown,
    moveLeft: moveLeft,
    moveRight: moveRight,
    getCharacterX: getCharacterX,
    getCharacterY: getCharacterY,
    getMonsterX: getMonsterX,
    getMonsterY: getMonsterY,
    isMonsterNear: isMonsterNear,
    getNearestMonsterOfType: getNearestMonsterOfType,
    moveToLocation: moveToLocation,
    moveToEntity: moveToEntity, // New Block
    canAttack: canAttack,       // New Block
    isCharacterDead: isCharacterDead, // New Block
    followPlayer: followPlayer,   // New Block
    playerName: playerName,       // New Block
    getMonsterXP: getMonsterXP,
    getMonsterGold: getMonsterGold,
    isMonsterXpGoldBelow: isMonsterXpGoldBelow,
    getPlayerHPFromEntity: getPlayerHPFromEntity,
    getPlayerMPFromEntity: getPlayerMPFromEntity,
    isCharacterMoving: isCharacterMoving,
    getPlayerByName: getPlayerByName,
    useSkillByName: useSkillByName,
    getMonsterHP: getMonsterHP,
    setIntervalBlock: setIntervalBlock,
    commentBlock: commentBlock, // Newly added Comment Block
    getMonsterAttribute: getMonsterAttribute,
    getPlayerAttribute: getPlayerAttribute,
    setTarget: setTarget,
    currentTarget: currentTarget,
    setChatLog: setChatLog,






});

// Define JavaScript generators for custom blocks
// Define the JavaScript generator for 'Move to Target' block
javascript.javascriptGenerator.forBlock['moveToEntity'] = function(block) {
    const target = Blockly.JavaScript.valueToCode(block, 'TARGET', Blockly.JavaScript.ORDER_NONE) || 'get_targeted_monster()';
    const code = `
        if (${target} && !is_in_range(${target})) {
            await move(
                character.x + (${target}.x - character.x)/2,
                character.y + (${target}.y - character.y)/2
            );
        } else {
            set_message("No Target to Move To");
            await sleep(500);
        }\n`;
    return code;
};
javascript.javascriptGenerator.forBlock['commentBlock'] = function(block) {
    const commentText = block.getFieldValue('COMMENT_TEXT');
    const code = `// ${commentText}\n`;
    return code;
};
javascript.javascriptGenerator.forBlock['isCharacterMoving'] = function(block) {
    const code = `is_moving(character)`;
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

javascript.javascriptGenerator.forBlock['getPlayerByName'] = function(block) {
    const playerName = block.getFieldValue('PLAYER_NAME');
    const code = `get_player('${playerName}')`;
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};


javascript.javascriptGenerator.forBlock['useSkillByName'] = function(block) {
    const skillName = block.getFieldValue('SKILL_NAME');
    const target = Blockly.JavaScript.valueToCode(block, 'TARGET', Blockly.JavaScript.ORDER_NONE) || 'null';
    const code = `await use_skill('${skillName}', ${target});\n`;
    return code;
};

javascript.javascriptGenerator.forBlock['getMonsterHP'] = function(block) {
    const monster = Blockly.JavaScript.valueToCode(block, 'MONSTER', Blockly.JavaScript.ORDER_NONE) || 'null';
    const code = `(${monster} && ${monster}.hp)`;
    return [code, Blockly.JavaScript.ORDER_CONDITIONAL];
};

// Generator for Player Name Input Block
javascript.javascriptGenerator.forBlock['playerName'] = function(block) {
    const playerName = block.getFieldValue('PLAYER_NAME');
    const code = `'${playerName}'`;
    return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

// Generator for Get Monster XP
javascript.javascriptGenerator.forBlock['getMonsterXP'] = function(block) {
    const monster = Blockly.JavaScript.valueToCode(block, 'MONSTER', Blockly.JavaScript.ORDER_NONE) || 'null';
    const code = `(${monster} && ${monster}.xp)`;
    return [code, Blockly.JavaScript.ORDER_CONDITIONAL];
};

// Generator for Get Monster Gold
javascript.javascriptGenerator.forBlock['getMonsterGold'] = function(block) {
    const monster = Blockly.JavaScript.valueToCode(block, 'MONSTER', Blockly.JavaScript.ORDER_NONE) || 'null';
    const code = `(${monster} && parent.G.monsters[${monster}.mtype].gold)`;
    return [code, Blockly.JavaScript.ORDER_CONDITIONAL];
};

// Generator for Is Monster XP/Gold Below Threshold
javascript.javascriptGenerator.forBlock['isMonsterXpGoldBelow'] = function(block) {
    const monster = Blockly.JavaScript.valueToCode(block, 'MONSTER', Blockly.JavaScript.ORDER_NONE) || 'null';
    const attribute = block.getFieldValue('ATTRIBUTE');
    const threshold = Blockly.JavaScript.valueToCode(block, 'THRESHOLD', Blockly.JavaScript.ORDER_NONE) || '0';
    let code;
    if (attribute === 'xp') {
        code = `(${monster} && ${monster}.xp < ${threshold})`;
    } else {
        code = `(${monster} && parent.G.monsters[${monster}.mtype].gold < ${threshold})`;
    }
    return [code, Blockly.JavaScript.ORDER_RELATIONAL];
};


javascript.javascriptGenerator.forBlock['followPlayer'] = function(block) {
    const playerName = block.getFieldValue('PLAYER_NAME');
    const code = `
        let player = get_player('${playerName}');
        if (player) {
            await smart_move(player);
        } else {
            set_message('Player not found');
        }\n`;
    return code;
};


// Define the JavaScript generator for 'Is Character Dead' block
javascript.javascriptGenerator.forBlock['isCharacterDead'] = function(block) {
    const code = `character.rip`;
    return [code, Blockly.JavaScript.ORDER_ATOMIC];
};


// Define the JavaScript generator for 'Can Attack' block
javascript.javascriptGenerator.forBlock['canAttack'] = function(block) {
    const target = Blockly.JavaScript.valueToCode(block, 'TARGET', Blockly.JavaScript.ORDER_NONE) || 'null';
    const code = `can_attack(${target})`;
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};



javascript.javascriptGenerator.forBlock['getCharacterX'] = function(block) {
    const code = 'character.real_x';
    return [code, Blockly.JavaScript.ORDER_ATOMIC];
};


javascript.javascriptGenerator.forBlock['getCharacterY'] = function(block) {
    const code = 'character.real_y';
    return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

javascript.javascriptGenerator.forBlock['getMonsterX'] = function(block) {
    const monster = Blockly.JavaScript.valueToCode(block, 'MONSTER', Blockly.JavaScript.ORDER_NONE) || 'get_targeted_monster()';
    const code = `(${monster} && ${monster}.real_x)`;
    return [code, Blockly.JavaScript.ORDER_CONDITIONAL];
};
javascript.javascriptGenerator.forBlock['getMonsterY'] = function(block) {
    const monster = Blockly.JavaScript.valueToCode(block, 'MONSTER', Blockly.JavaScript.ORDER_NONE) || 'get_targeted_monster()';
    const code = `(${monster} && ${monster}.real_y)`;
    return [code, Blockly.JavaScript.ORDER_CONDITIONAL];
};

javascript.javascriptGenerator.forBlock['isMonsterNear'] = function(block) {
    const range = block.getFieldValue('RANGE') || '100';
    const code = `(parent.entities && Object.values(parent.entities).some(entity => entity.type === 'monster' && !entity.dead && parent.distance(character, entity) <= ${range}))`;
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};


javascript.javascriptGenerator.forBlock['getNearestMonsterOfType'] = function(block) {
    const monsterType = block.getFieldValue('MONSTER_TYPE');
    const code = `get_nearest_monster({type: '${monsterType}'})`;
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

javascript.javascriptGenerator.forBlock['moveToLocation'] = function(block) {
    const location = block.getFieldValue('LOCATION');
    const code = `await smart_move('${location}');\n`;
    return code;
};


javascript.javascriptGenerator.forBlock['moveto'] = function(block) {
    const x = block.getFieldValue('X_COORD');
    const y = block.getFieldValue('Y_COORD');
    const code = `await move(${x}, ${y});\n`;
    return code;
};

javascript.javascriptGenerator.forBlock['attack'] = function(block) {
    const target = Blockly.JavaScript.valueToCode(block, 'TARGET', Blockly.JavaScript.ORDER_NONE) || 'get_targeted_monster()';
    const cooldown = 2800; // Adjust this value based on the actual cooldown in milliseconds
    const code = `
        try {
            await attack(${target});
            await sleep(${cooldown});
        } catch (error) {
            console.error("Attack failed:", error);
        }
    `;
    return code;
};

javascript.javascriptGenerator.forBlock['useSkill'] = function(block) {
    const skillName = block.getFieldValue('SKILL_NAME');
    const target = Blockly.JavaScript.valueToCode(block, 'TARGET', Blockly.JavaScript.ORDER_NONE) || 'null';
    const skillCooldown = parent.G.skills[skillName].cooldown || 1000;
    const code = `
        if (can_use('${skillName}', ${target})) {
            await use_skill('${skillName}', ${target});
            await sleep(${skillCooldown});
        } else {
            await sleep(250);
        }
    `;
    return code;
};


javascript.javascriptGenerator.forBlock['stopAction'] = function(block) {
    const code = `stop();\n`;
    return code;
};
javascript.javascriptGenerator.forBlock['logMessage'] = function(block) {
    const label = block.getFieldValue('LABEL');
    const message = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_NONE) || `'Hello World'`;
  
    // Assemble JavaScript code
    const code = `console.log(${message});\n`;
    return code;
}


// Wait Block Generator
javascript.javascriptGenerator.forBlock['wait'] = function(block) {
    const duration = Blockly.JavaScript.valueToCode(block, 'DURATION', Blockly.JavaScript.ORDER_NONE) || `1000`;
    const code = `await sleep(${duration});\n`;
    return code;
};

javascript.javascriptGenerator.forBlock['controls_whileUntil'] = function(block) {
    const until = block.getFieldValue('MODE') === 'UNTIL';
    const condition = Blockly.JavaScript.valueToCode(block, 'BOOL', until ? Blockly.JavaScript.ORDER_LOGICAL_NOT : Blockly.JavaScript.ORDER_NONE) || 'false';
    const statements = Blockly.JavaScript.statementToCode(block, 'DO');
    const code = `
        while (${until ? '!' : ''}(${condition})) {
            ${statements}
            await sleep(250); // Include a delay to prevent rapid looping
        }
    `;
    return code;
};


javascript.javascriptGenerator.forBlock['getNearestMonster'] = function(block) {
    const code = `get_nearest_monster()`;
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

javascript.javascriptGenerator.forBlock['getNearestPlayer'] = function(block) {
    const code = `get_nearest_player()`; // Assuming you have a function like this
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

javascript.javascriptGenerator.forBlock['getCharacterHP'] = function(block) {
    const label = block.getFieldValue('LABEL');
  
    // Assemble JavaScript code
    const code = `character.hp`;
    return [code, Blockly.JavaScript.ORDER_ATOMIC];
}

javascript.javascriptGenerator.forBlock['getCharacterMP'] = function(block) {
    const label = block.getFieldValue('LABEL');
  
    // Assemble JavaScript code
    const code = `character.mp`;
    return [code, Blockly.JavaScript.ORDER_ATOMIC];
}

javascript.javascriptGenerator.forBlock['getCharacterLevel'] = function(block) {
    const label = block.getFieldValue('LABEL');
  
    // Assemble JavaScript code
    const code = `character.level`;
    return [code, Blockly.JavaScript.ORDER_ATOMIC];
}

javascript.javascriptGenerator.forBlock['useHpOrMp'] = function(block) {
    const label = block.getFieldValue('LABEL');
  
    // Assemble JavaScript code
    const code = `use_hp_or_mp();\n`;
    return code;
}

// Loot Block Generator
javascript.javascriptGenerator.forBlock['loot'] = function(block) {
    const code = `await loot();\n`;
    return code;
};



javascript.javascriptGenerator.forBlock['getTargetedMonster'] = function(block) {
    const label = block.getFieldValue('LABEL');
  
    // Assemble JavaScript code
    const code = `get_targeted_monster()`;
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
}

javascript.javascriptGenerator.forBlock['getNearestMonsterWithOptions'] = function(block) {
    const label = block.getFieldValue('LABEL');
    const minXp = Blockly.JavaScript.valueToCode(block, 'MIN_XP', Blockly.JavaScript.ORDER_COMMA) || `100`;
    const maxAtt = Blockly.JavaScript.valueToCode(block, 'MAX_ATT', Blockly.JavaScript.ORDER_COMMA) || `120`;
  
    // Assemble JavaScript code
    const code = `get_nearest_monster({min_xp:${minXp},max_att:${maxAtt}})`;
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
}


javascript.javascriptGenerator.forBlock['setMessage'] = function(block) {
    const label = block.getFieldValue('LABEL');
    const message = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_NONE) || `'No Monsters'`;
  
    // Assemble JavaScript code
    const code = `set_message(${message});\n`;
    return code;
}

javascript.javascriptGenerator.forBlock['isInRange'] = function(block) {
    const label = block.getFieldValue('LABEL');
    const target = Blockly.JavaScript.valueToCode(block, 'TARGET', Blockly.JavaScript.ORDER_NONE) || `'monster'`;
  
    // Assemble JavaScript code
    const code = `is_in_range(${target})`;
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
}

javascript.javascriptGenerator.forBlock['isMoving'] = function(block) {
    const label = block.getFieldValue('LABEL');
    const character = Blockly.JavaScript.valueToCode(block, 'CHARACTER', Blockly.JavaScript.ORDER_NONE) || `'character'`;
  
    // Assemble JavaScript code
    const code = `is_moving(${character})`;
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
}

javascript.javascriptGenerator.forBlock['declareVariable'] = function(block) {
    const varName = block.getFieldValue('VAR');
    const value = block.getFieldValue('VALUE') || `false`;
  
    // Assemble JavaScript code
    const code = `var ${varName} = ${value};\n`;
    return code;
}

// JavaScript Generators for New Blocks

// Cast Spell Block Generator
javascript.javascriptGenerator.forBlock['castSpell'] = function(block) {
    const spellName = block.getFieldValue('SPELL_NAME');
    const target = Blockly.JavaScript.valueToCode(block, 'TARGET', Blockly.JavaScript.ORDER_NONE) || `null`;
    const code = `await use_skill('${spellName}', ${target});\n`;
    return code;
};

javascript.javascriptGenerator.forBlock['dodgeAttack'] = function(block) {
    const direction = Blockly.JavaScript.valueToCode(block, 'DIRECTION', Blockly.JavaScript.ORDER_NONE) || `'left'`;
    const code = `if (${direction} == 'left') { move(character.real_x - 50, character.real_y); } else if (${direction} == 'right') { move(character.real_x + 50, character.real_y); }\n`;
    return code;
};

javascript.javascriptGenerator.forBlock['useItem'] = function(block) {
    const itemName = Blockly.JavaScript.valueToCode(block, 'ITEM_NAME', Blockly.JavaScript.ORDER_NONE) || `'health_potion'`;
    const code = `use_item(${itemName});\n`;
    return code;
};

javascript.javascriptGenerator.forBlock['checkBuffStatus'] = function(block) {
    const buffName = Blockly.JavaScript.valueToCode(block, 'BUFF_NAME', Blockly.JavaScript.ORDER_NONE) || `'speed'`;
    const code = `is_buff_active(${buffName})`;
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};



javascript.javascriptGenerator.forBlock['moveUp'] = function(block) {
    const steps = block.getFieldValue('STEPS') || 10;
    const code = `await move(character.real_x, character.real_y - ${steps});\n`;
    return code;
};

javascript.javascriptGenerator.forBlock['moveDown'] = function(block) {
    const steps = block.getFieldValue('STEPS') || 10;
    const code = `await move(character.real_x, character.real_y + ${steps});\n`;
    return code;
};

javascript.javascriptGenerator.forBlock['moveLeft'] = function(block) {
    const steps = block.getFieldValue('STEPS') || 10;
    const code = `await move(character.real_x - ${steps}, character.real_y);\n`;
    return code;
};

javascript.javascriptGenerator.forBlock['moveRight'] = function(block) {
    const steps = block.getFieldValue('STEPS') || 10;
    const code = `await move(character.real_x + ${steps}, character.real_y);\n`;
    return code;
};


function getSpellOptions() {
    var options = [];
    for (var skill in parent.G.skills) {
        options.push([skill, skill]);
    }
    return options;
}

// JavaScript Generator for Get Player HP from Entity
javascript.javascriptGenerator.forBlock['getPlayerHPFromEntity'] = function(block) {
    const playerEntity = Blockly.JavaScript.valueToCode(block, 'PLAYER_ENTITY', Blockly.JavaScript.ORDER_NONE) || 'null';
    const code = `${playerEntity}.hp`;
    return [code, Blockly.JavaScript.ORDER_MEMBER];
};

// JavaScript Generator for Get Player MP from Entity
javascript.javascriptGenerator.forBlock['getPlayerMPFromEntity'] = function(block) {
    const playerEntity = Blockly.JavaScript.valueToCode(block, 'PLAYER_ENTITY', Blockly.JavaScript.ORDER_NONE) || 'null';
    const code = `${playerEntity}.mp`;
    return [code, Blockly.JavaScript.ORDER_MEMBER];
};
console.log("New custom blocks and generators have been added.");