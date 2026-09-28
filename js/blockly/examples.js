// Adventure Land - Blockly Edition: example programs for the EXAMPLES menu.
// The first one is what new students start with (and what RESET goes back to).
// To add an example: build it in the game, press SAVE, and paste the file's contents here.

var BLOCKLY_EXAMPLES = [
	{
		name: "Starter bot: fight monsters",
		xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="commentBlock" x="20" y="20">
    <field name="COMMENT_TEXT">Starter bot: finds monsters and fights them. Press RUN to try it!</field>
  </block>
  <block type="setIntervalBlock" x="20" y="60">
    <field name="INTERVAL">250</field>
    <statement name="DO">
      <block type="respawn">
        <next>
          <block type="useHpOrMp">
            <next>
              <block type="loot">
                <next>
                  <block type="controls_if">
                    <value name="IF0">
                      <block type="logic_negate">
                        <value name="BOOL">
                          <block type="entityExists">
                            <value name="ENTITY">
                              <block type="getTargetedMonster"></block>
                            </value>
                          </block>
                        </value>
                      </block>
                    </value>
                    <statement name="DO0">
                      <block type="setTarget">
                        <value name="TARGET">
                          <block type="getNearestMonsterWithOptions">
                            <value name="MIN_XP">
                              <block type="math_number"><field name="NUM">100</field></block>
                            </value>
                            <value name="MAX_ATT">
                              <block type="math_number"><field name="NUM">120</field></block>
                            </value>
                          </block>
                        </value>
                      </block>
                    </statement>
                    <next>
                      <block type="controls_if">
                        <mutation else="1"></mutation>
                        <value name="IF0">
                          <block type="isInRange">
                            <value name="TARGET">
                              <block type="getTargetedMonster"></block>
                            </value>
                          </block>
                        </value>
                        <statement name="DO0">
                          <block type="attack">
                            <value name="TARGET">
                              <block type="getTargetedMonster"></block>
                            </value>
                          </block>
                        </statement>
                        <statement name="ELSE">
                          <block type="moveToEntity">
                            <value name="TARGET">
                              <block type="getTargetedMonster"></block>
                            </value>
                          </block>
                        </statement>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>`,
	},
	{
		name: "First steps: walk and talk",
		xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="commentBlock" x="20" y="20">
    <field name="COMMENT_TEXT">Blocks run from top to bottom. The loop repeats them every second.</field>
  </block>
  <block type="setIntervalBlock" x="20" y="60">
    <field name="INTERVAL">1000</field>
    <statement name="DO">
      <block type="setChatLog">
        <value name="MESSAGE">
          <block type="text_join">
            <mutation items="2"></mutation>
            <value name="ADD0">
              <block type="text"><field name="TEXT">My HP is </field></block>
            </value>
            <value name="ADD1">
              <block type="myStat"><field name="STAT">hp</field></block>
            </value>
          </block>
        </value>
        <next>
          <block type="moveRight">
            <field name="STEPS">30</field>
            <next>
              <block type="moveLeft">
                <field name="STEPS">30</field>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>`,
	},
	{
		name: "Potion shopper",
		xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="commentBlock" x="20" y="20">
    <field name="COMMENT_TEXT">When I have fewer than 5 health potions, go shopping, then go back to the goos.</field>
  </block>
  <block type="setIntervalBlock" x="20" y="60">
    <field name="INTERVAL">1000</field>
    <statement name="DO">
      <block type="useHpOrMp">
        <next>
          <block type="controls_if">
            <value name="IF0">
              <block type="logic_compare">
                <field name="OP">LT</field>
                <value name="A">
                  <block type="itemCount">
                    <value name="ITEM_NAME">
                      <block type="text"><field name="TEXT">hpot0</field></block>
                    </value>
                  </block>
                </value>
                <value name="B">
                  <block type="math_number"><field name="NUM">5</field></block>
                </value>
              </block>
            </value>
            <statement name="DO0">
              <block type="setMessage">
                <value name="MESSAGE">
                  <block type="text"><field name="TEXT">Shopping!</field></block>
                </value>
                <next>
                  <block type="moveToLocation">
                    <field name="LOCATION">potions</field>
                    <next>
                      <block type="buyItem">
                        <field name="QUANTITY">20</field>
                        <value name="ITEM_NAME">
                          <block type="text"><field name="TEXT">hpot0</field></block>
                        </value>
                        <next>
                          <block type="huntMonster">
                            <field name="MONSTER_TYPE">goo</field>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </statement>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>`,
	},
	{
		name: "Party helper: follow a friend",
		xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <variables>
    <variable id="leader_var">leader</variable>
  </variables>
  <block type="commentBlock" x="20" y="20">
    <field name="COMMENT_TEXT">Change friend_name (3 places) to your friend's character name.</field>
  </block>
  <block type="setIntervalBlock" x="20" y="60">
    <field name="INTERVAL">500</field>
    <statement name="DO">
      <block type="respawn">
        <next>
          <block type="useHpOrMp">
            <next>
              <block type="partyAccept">
                <field name="PLAYER_NAME">friend_name</field>
                <next>
                  <block type="variables_set">
                    <field name="VAR" id="leader_var">leader</field>
                    <value name="VALUE">
                      <block type="getPlayerByName"><field name="PLAYER_NAME">friend_name</field></block>
                    </value>
                    <next>
                      <block type="controls_if">
                        <mutation else="1"></mutation>
                        <value name="IF0">
                          <block type="entityExists">
                            <value name="ENTITY">
                              <block type="variables_get"><field name="VAR" id="leader_var">leader</field></block>
                            </value>
                          </block>
                        </value>
                        <statement name="DO0">
                          <block type="setTarget">
                            <value name="TARGET">
                              <block type="getPlayerAttribute">
                                <field name="ATTRIBUTE">target</field>
                                <value name="PLAYER">
                                  <block type="variables_get"><field name="VAR" id="leader_var">leader</field></block>
                                </value>
                              </block>
                            </value>
                            <next>
                              <block type="attack">
                                <value name="TARGET">
                                  <block type="getTargetedMonster"></block>
                                </value>
                                <next>
                                  <block type="moveToEntity">
                                    <value name="TARGET">
                                      <block type="variables_get"><field name="VAR" id="leader_var">leader</field></block>
                                    </value>
                                  </block>
                                </next>
                              </block>
                            </next>
                          </block>
                        </statement>
                        <statement name="ELSE">
                          <block type="followPlayer">
                            <field name="PLAYER_NAME">friend_name</field>
                          </block>
                        </statement>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>`,
	},
];
