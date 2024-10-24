# Adventure Land Blockly Update

## Introduction

Welcome to the Adventure Land Blockly update! This update introduces a new way to automate your character's actions using Blockly, a visual programming language. With Blockly, you can create scripts by dragging and dropping blocks, making it easier to create complex behaviors without writing code manually.

## New Blocks and Their Usage

### Movement Blocks

- **Move to Coordinates**: Moves the character to specified X and Y coordinates.
- **Move Up**: Moves the character up by a specified number of steps.
- **Move Down**: Moves the character down by a specified number of steps.
- **Move Left**: Moves the character left by a specified number of steps.
- **Move Right**: Moves the character right by a specified number of steps.
- **Move to Location**: Moves the character to a predefined location.
- **Move to Target**: Moves the character to a specified target.
- **Follow Player**: Follows another player by name.

### Action Blocks

- **Attack Target**: Attacks the specified target.
- **Use Skill**: Uses a skill on the specified target.
- **Stop Action**: Stops all current actions.
- **Use HP or MP**: Uses HP or MP as needed.
- **Loot**: Loots items from defeated monsters.
- **Cast Spell**: Casts a spell at the specified target.
- **Dodge Attack**: Dodges in a specified direction to avoid an attack.
- **Use Item**: Uses a specific item from inventory.

### Utility Blocks

- **Log Message**: Logs a custom message to the console.
- **Set Message**: Sets a message in the game chat.
- **Wait**: Pauses execution for a specified duration in milliseconds.
- **Set Chat Log**: Sets a message in the game console chat.

### Input Blocks

#### Character Inputs

- **Get Character HP**: Returns the current health points of the character.
- **Get Character MP**: Returns the current mana points of the character.
- **Get Character X**: Returns the player's X coordinate.
- **Get Character Y**: Returns the player's Y coordinate.
- **Get Character Level**: Returns the current level of the character.
- **Is Character Moving**: Checks if the character is moving.
- **Is Character Dead**: Checks if the character is dead.

#### Other Player Inputs

- **Get Player Attribute**: Gets an attribute of the specified player.
- **Get Player By Name**: Gets the player entity by name.
- **Get Nearest Player**: Returns the nearest player entity.

#### Monster Inputs

- **Get Monster Attribute**: Gets an attribute of the specified monster.
- **Is Monster Near**: Returns true if any monster is within the specified range.
- **Get Nearest Monster With Options**: Returns the nearest monster with specified XP and ATT criteria.
- **Get Targeted Monster**: Returns the currently targeted monster.
- **Get Nearest Monster**: Returns the nearest monster entity.
- **Get Nearest Monster of Type**: Returns the nearest monster of the specified type.
- **Is Monster XP/Gold Below**: Checks if the monster's XP or gold is below a threshold.

#### Other Inputs

- **Current Target**: Returns the currently targeted entity.
- **Is In Range**: Checks if the target is in range.
- **Is Moving**: Checks if the specified character is moving.
- **Check Buff Status**: Checks if the specified buff is active.

### Variable Blocks

- **Declare Variable**: Declares and initializes a variable.

### Logic Blocks

- **If Statement**: Executes blocks based on a condition.
- **Logic Compare**: Compares two values.
- **Logic Operation**: Performs logical operations (AND, OR).
- **Logic Negate**: Negates a boolean value.
- **Logic Boolean**: Returns a boolean value (true, false).
- **Logic Null**: Returns a null value.

### Loop Blocks

- **Set Interval**: Runs the enclosed blocks every specified interval in milliseconds.
- **Repeat**: Repeats the enclosed blocks a specified number of times.
- **While Loop**: Repeats the enclosed blocks while a condition is true.
- **For Loop**: Repeats the enclosed blocks for a specified range.
- **For Each Loop**: Repeats the enclosed blocks for each item in a list.
- **Flow Statements**: Controls the flow of loops (break, continue).

### Math Blocks

- **Number**: Represents a number.
- **Arithmetic**: Performs arithmetic operations (add, subtract, multiply, divide).
- **Single**: Performs single-operand math functions (square root, absolute value).
- **Trigonometry**: Performs trigonometric functions (sine, cosine, tangent).
- **Constant**: Represents a mathematical constant (pi, e).
- **Number Property**: Checks properties of a number (even, odd, prime).
- **Round**: Rounds a number.
- **Math on List**: Performs math functions on a list (sum, min, max).
- **Modulo**: Calculates the remainder of a division.
- **Constrain**: Constrains a number to a range.
- **Random Integer**: Generates a random integer within a range.
- **Random Float**: Generates a random float between 0 and 1.

### Text Blocks

- **Text**: Represents a string of text.
- **Text Join**: Joins multiple strings of text.
- **Text Append**: Appends text to a variable.
- **Text Length**: Returns the length of a string.
- **Text Is Empty**: Checks if a string is empty.
- **Text Index Of**: Finds the index of a substring.
- **Text Char At**: Gets a character at a specified position.
- **Text Get Substring**: Gets a substring from a string.
- **Text Change Case**: Changes the case of a string.
- **Text Trim**: Trims whitespace from a string.
- **Text Print**: Prints text to the console.
- **Text Prompt**: Prompts the user for input.

### Function Blocks

- **Define Function**: Defines a custom function.
- **Call Function**: Calls a custom function.

## Examples

### Example 1: Basic Movement

```xml
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="moveUp" x="10" y="10">
    <field name="STEPS">10</field>
  </block>
  <block type="moveDown" x="10" y="40">
    <field name="STEPS">10</field>
  </block>
  <block type="moveLeft" x="10" y="70">
    <field name="STEPS">10</field>
  </block>
  <block type="moveRight" x="10" y="100">
    <field name="STEPS">10</field>
  </block>
</xml>
```

### Example 2: Attacking a Target

```xml
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="setIntervalBlock" x="10" y="10">
    <field name="INTERVAL">1000</field>
    <statement name="DO">
      <block type="attack">
        <value name="TARGET">
          <block type="getTargetedMonster"></block>
        </value>
      </block>
    </statement>
  </block>
</xml>
```

### Example 3: Using a Skill

```xml
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="setIntervalBlock" x="10" y="10">
    <field name="INTERVAL">1000</field>
    <statement name="DO">
      <block type="useSkill">
        <field name="SKILL_NAME">attack</field>
        <value name="TARGET">
          <block type="getTargetedMonster"></block>
        </value>
      </block>
    </statement>
  </block>
</xml>
```

## Saving and Loading Blocks

### Saving Blocks

To save your blocks, click the "SAVE" button. This will download an XML file containing your workspace.

### Loading Blocks

To load your blocks, click the "LOAD" button and select the XML file containing your workspace. The blocks will be loaded into the workspace.

## Conclusion

We hope you enjoy using Blockly to automate your character's actions in Adventure Land. If you have any questions or feedback, please feel free to reach out to us. Happy coding!
