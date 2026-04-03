import { useState, useEffect, useRef } from "react";

const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
document.head.appendChild(fontLink);

const SUITS  = ["\u2660","\u2665","\u2666","\u2663"];
const VALUES = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const VMAP   = {A:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,J:11,Q:12,K:13};
const REDS   = ["\u2665","\u2666"];
const CCAT   = {ENGINE:"#e63946",HANDLING:"#4895ef",FUEL:"#f4d03f",TIRES:"#2dc653"};
const PX     = "'Press Start 2P',monospace";
const GOLD   = "#f4d03f";
const DARK   = "#080808";
const RED    = "#e63946";

// ── Race Formats ──────────────────────────────────────────────────────────────
const RACE_FORMATS = [
  {id:"sprint",    label:"SPRINT",    tableaus:1,  distance:18,  rivalScale:0,    creditBase:3,  description:"18 LAPS  WINNABLE  LEARN THE LINE"},
  {id:"feature",   label:"FEATURE",   tableaus:3,  distance:54,  rivalScale:0.08, creditBase:8,  description:"54 LAPS  UPGRADES HELP  RIVAL ACCELERATES"},
  {id:"endurance", label:"ENDURANCE", tableaus:6,  distance:108, rivalScale:0.12, creditBase:18, description:"108 LAPS  UPGRADES NEEDED  BRUTAL FINISH"},
  {id:"grandprix", label:"GRAND PRIX",tableaus:12, distance:216, rivalScale:0.10, creditBase:40, description:"216 LAPS  REQUIRE UPGRADES  SURGES AT 4 AND 8"},
  {id:"the500",    label:"THE 500",   tableaus:28, distance:500, rivalScale:0.06, creditBase:80, description:"500 LAPS  FULL BUILD REQUIRED  HALE AWAITS"},
];

// Hale boss abilities fire at these total lap counts
const HALE_SURGES   = [90, 252, 396];   // SURGE — rival at 2.5x for one tableau
const HALE_REMOVALS = [144, 324];        // CARD REMOVAL — 3 cards yanked from tableau
const HALE_FAKEOUTS = [198, 360, 468];   // FAKE-OUT — top card swapped mid-lap, no warning

const SUIT_PATH = {
  "\u2660":"M4,8 L8,2 L12,8 L9,8 L10,14 L6,14 L7,8 Z",
  "\u2665":"M2,5 Q2,2 5,2 Q8,2 8,5 Q8,2 11,2 Q14,2 14,5 Q14,9 8,14 Q2,9 2,5 Z",
  "\u2666":"M8,1 L15,8 L8,15 L1,8 Z",
  "\u2663":"M8,10 Q5,10 5,7 Q5,4 8,4 Q6,4 6,2 Q6,0 8,0 Q10,0 10,2 Q10,4 8,4 Q11,4 11,7 Q11,10 8,10 L7,14 L9,14 L9,15 L7,15 Z",
};
const FCLR = {
  J:{bg:"#1a1a2e",ac:"#e63946",label:"MECH"},
  Q:{bg:"#1a1a2e",ac:"#4895ef",label:"SERA"},
  K:{bg:"#1a1a2e",ac:"#c9a84c",label:"HALE"},
  A:{bg:"#0d0d0d",ac:"#f4d03f",label:"ENZO"},
};
const RCLR = {UNCOMMON:"#4895ef",RARE:"#9b5de5",EPIC:"#f4a261",LEGENDARY:"#f4d03f"};
const WILDS = [
  {id:"draft",  rarity:"UNCOMMON",  name:"SLIPSTREAM",    flavor:"You found his tow.",              effect:"Next 4 plays free"},
  {id:"fuel",   rarity:"UNCOMMON",  name:"FUEL LOAD",     flavor:"Emilio found a reserve.",         effect:"Combo safe for 3 draws"},
  {id:"line",   rarity:"UNCOMMON",  name:"PERFECT LINE",  flavor:"You found the apex.",             effect:"Next play adds +2 combo"},
  {id:"quali",  rarity:"RARE",      name:"QUALI LAP",     flavor:"Drive it like a hot lap.",        effect:"Next 6 clears cascade"},
  {id:"sc",     rarity:"RARE",      name:"SAFETY CAR",    flavor:"Rival bunched up.",               effect:"Rival frozen 8 seconds"},
  {id:"sector", rarity:"RARE",      name:"PURPLE SECTOR", flavor:"Fastest sector of the day.",      effect:"Combo doubled (max +8)"},
  {id:"vsc",    rarity:"EPIC",      name:"VIRTUAL SC",    flavor:"Everyone pits. You stay out.",    effect:"Rival laps reset by 18"},
  {id:"fastest",rarity:"EPIC",      name:"FASTEST LAP",   flavor:"You set the lap record.",         effect:"Combo x1.5, 5 free plays"},
  {id:"voss",   rarity:"LEGENDARY", name:"ENZO'S LINE",   flavor:"The line nobody else could hold.",effect:"Draws add combo. Face cards free."},
  {id:"ghost",  rarity:"LEGENDARY", name:"GHOST LAP",     flavor:"Driving his time. From 1969.",    effect:"Rival frozen. Combo unbreakable."},
];
const WWEIGHTS = {UNCOMMON:50,RARE:30,EPIC:15,LEGENDARY:5};

const PARTS = [
  {id:"turbo",       cat:"ENGINE",  name:"Turbo Boost",   effect:"+/-2 range, 4 plays",      emilio:"She'll scream. Don't hold back."},
  {id:"injector",    cat:"ENGINE",  name:"Fuel Injector", effect:"Next 3 draws free",         emilio:"Smooth delivery. Like butter."},
  {id:"coldstart",   cat:"ENGINE",  name:"Cold Start",    effect:"Clears bottom-left card",   emilio:"Old trick. Works every time."},
  {id:"displacement",cat:"ENGINE",  name:"Displacement",  effect:"+2 cards to stock",         emilio:"Found some extra in the back."},
  {id:"downforce",   cat:"HANDLING",name:"Downforce",     effect:"Rival slowed this lap",     emilio:"Let them fight the wind."},
  {id:"diflock",     cat:"HANDLING",name:"Diff Lock",     effect:"Force one card open",       emilio:"Force it. Carefully."},
  {id:"brakebias",   cat:"HANDLING",name:"Brake Bias",    effect:"Reveal 3 face-down",        emilio:"See the corner first."},
  {id:"richmix",     cat:"FUEL",    name:"Rich Mixture",  effect:"+1 combo, 5 plays",         emilio:"Running hot. But it's working."},
  {id:"reserve",     cat:"FUEL",    name:"Reserve Tank",  effect:"Extra turn if rival wins",  emilio:"One more lap. Make it count."},
  {id:"octane",      cat:"FUEL",    name:"Octane Bump",   effect:"Double credits",            emilio:"Premium only. Worth it."},
  {id:"soft",        cat:"TIRES",   name:"Soft Compound", effect:"Suit match +1 combo x6",    emilio:"Grip while it lasts."},
  {id:"hard",        cat:"TIRES",   name:"Hard Compound", effect:"Rival -20%, combos halved", emilio:"Slow and steady. You hate it."},
  {id:"blankets",    cat:"TIRES",   name:"Tire Blankets", effect:"First 3 plays free",        emilio:"Warm up. Then attack."},
  {id:"wetweather",  cat:"TIRES",   name:"Wet Weather",   effect:"Draw 2 free if 5+ stock",   emilio:"Prepared for the worst."},
];
const MODS = [
  {id:"rollcage",name:"Roll Cage",      cost:5,effect:"Rival needs extra laps to win"},
  {id:"tank",    name:"Extended Tank",  cost:3,effect:"+2 stock every tableau"},
  {id:"gears",   name:"Gear Ratios",    cost:4,effect:"Combo floor at x2"},
  {id:"light",   name:"Lightened Body", cost:6,effect:"Draws never reset combo"},
  {id:"slicks",  name:"Slick Tires",    cost:6,effect:"+/-2 rank always valid"},
  {id:"spotter", name:"Spotter Radio",  cost:3,effect:"Face-down show suit"},
  {id:"stance",  name:"Wider Stance",   cost:4,effect:"Suit match always +1"},
];
const PERKS = [
  {id:"latebraker",name:"Late Braker",   effect:"First draw keeps combo"},
  {id:"coldblood", name:"Cold Blood",    effect:"Rival -10% speed always"},
  {id:"crowd",     name:"Crowd Pleaser", effect:"x5+ combos +1 credit"},
  {id:"grease",    name:"Grease Monkey", effect:"4 choices on part offers"},
];
// ── Vehicle Classes ───────────────────────────────────────────────────────────
const VEHICLES = [
  {id:"sedan",    name:"THE CORTINA",    icon:"SEDAN",  color:"#888",
   emilio:"It's what we could afford. Don't be embarrassed by it.",
   confirm:"Right then. Let's see what we can do.",
   unlock:"always",      unlockDesc:"Starting vehicle",
   mechanic:"Standard rules. Learn the game here.",
   rules:{adjRange:1,suitChain:false,groupPlay:false,comboNoReset:false,stockSize:0,startCombo:0,drawAddCombo:false,faceAlways:false,aceAlways:false,faceCascade:false,rallyMode:false}},
  {id:"sports",   name:"THE BERLINETTA", icon:"SPORT",  color:"#e63946",
   emilio:"A contact of mine. Don't ask where it came from.",
   confirm:"Keep the revs up. She doesn't like below 4000.",
   unlock:"season2",     unlockDesc:"Win Season 1",
   mechanic:"Suit matches +1 combo. 3 in a row = free card.",
   rules:{adjRange:1,suitChain:true,groupPlay:false,comboNoReset:false,stockSize:0,startCombo:0,drawAddCombo:false,faceAlways:false,aceAlways:false,faceCascade:false,rallyMode:false}},
  {id:"rally",    name:"THE STRATOS",    icon:"RALLY",  color:"#f4a261",
   emilio:"Built for roads that aren't roads. Should handle Monaco fine.",
   confirm:"You'll have more room. You'll need it.",
   unlock:"win3",        unlockDesc:"Win 3 races in one season",
   mechanic:"+/-2 adjacency always. Rival +25% faster.",
   rules:{adjRange:2,suitChain:false,groupPlay:false,comboNoReset:false,stockSize:0,startCombo:0,drawAddCombo:false,faceAlways:false,aceAlways:false,faceCascade:false,rallyMode:true}},
  {id:"truck",    name:"THE HAULER",     icon:"TRUCK",  color:"#2dc653",
   emilio:"I know. I know. Just drive it.",
   confirm:"The crowd will cheer. Don't let it go to your head.",
   unlock:"nodraws",     unlockDesc:"Full season without stock draws",
   mechanic:"Select 3 cards at once. All must be adjacent in sequence.",
   rules:{adjRange:1,suitChain:false,groupPlay:true,comboNoReset:false,stockSize:0,startCombo:0,drawAddCombo:false,faceAlways:false,aceAlways:false,faceCascade:false,rallyMode:false}},
  {id:"moto",     name:"THE CAFE RACER", icon:"MOTO",   color:"#9b5de5",
   emilio:"Technically qualifies under the rulebook. I checked twice.",
   confirm:"Ten cards. Make every one count.",
   unlock:"collect5",    unlockDesc:"Find 5+ collectibles",
   mechanic:"10-card stock. Combo never resets. Face cards always valid.",
   rules:{adjRange:1,suitChain:false,groupPlay:false,comboNoReset:true,stockSize:10,startCombo:0,drawAddCombo:false,faceAlways:true,aceAlways:false,faceCascade:false,rallyMode:false}},
  {id:"indy",     name:"VOSS SPECIAL",   icon:"INDY",   color:"#f4d03f",
   emilio:"I kept it. After Monaco. I kept the engine he was running that day.",
   confirm:"...Drive well, Marco.",
   unlock:"trueending",  unlockDesc:"All story + any component L4",
   mechanic:"Aces free. Face cards cascade. Draws add combo. Starts x3.",
   rules:{adjRange:1,suitChain:false,groupPlay:false,comboNoReset:false,stockSize:0,startCombo:3,drawAddCombo:true,faceAlways:false,aceAlways:true,faceCascade:true,rallyMode:false}},
];

// ── Car Upgrades ──────────────────────────────────────────────────────────────
const CAR_PARTS = {
  engine: {
    label:"ENGINE", icon:"E",
    levels:[
      {name:"SALVAGE BLOCK",   color:"#555",   effect:"Base rival speed"},
      {name:"REBUILT UNIT",    color:"#888",   effect:"Rival +5% slower",            credits:8,  trophies:0},
      {name:"TUNED ENGINE",    color:"#4895ef",effect:"Rival +10% slower. Combo at x2",credits:15, trophies:0},
      {name:"RACE SPEC",       color:"#f4a261",effect:"Rival +15% slower. Combo ceiling x15",credits:20, trophies:2},
      {name:"VOSS ENGINE",     color:"#f4d03f",effect:"Rival +20% slower. Draws +1 combo/tableau",credits:30, trophies:5},
    ],
    emilio:["","Better. She sounds healthier now.","Now we're talking.","That's a race engine. Proper.","...He'd have loved to hear that."],
  },
  tires: {
    label:"TIRES", icon:"T",
    levels:[
      {name:"WORN CROSSPLIES", color:"#555",   effect:"Standard +/-1 adjacency"},
      {name:"FRESH CROSSPLIES",color:"#888",   effect:"Suit match always +1 combo",  credits:6,  trophies:0},
      {name:"RADIAL SLICKS",   color:"#4895ef",effect:"+/-1 adj + suit match +1",    credits:12, trophies:0},
      {name:"WET/DRY COMPOUND",color:"#f4a261",effect:"+/-2 adjacency in final tableau",credits:18, trophies:2},
      {name:"VOSS COMPOUND",   color:"#f4d03f",effect:"+/-2 always. 3 same-suit = free card",credits:28, trophies:4},
    ],
    emilio:["","At least you won't slide off.","Good rubber. Finally.","Track conditions won't matter.","I don't want to know where Cord got that."],
  },
  aero: {
    label:"AERO", icon:"A",
    levels:[
      {name:"FLAT DECK",       color:"#555",   effect:"No aero bonus"},
      {name:"LIP SPOILER",     color:"#888",   effect:"Rival -5% passively",          credits:7,  trophies:0},
      {name:"ADJUSTABLE WING", color:"#4895ef",effect:"Rival -8%. One card auto-revealed/tab",credits:14, trophies:0},
      {name:"FULL AERO PKG",   color:"#f4a261",effect:"Rival -12%. Face cards cascade",credits:20, trophies:2},
      {name:"PROTOTYPE AERO",  color:"#f4d03f",effect:"Rival -15%. SC wilds last 12s",credits:30, trophies:5},
    ],
    emilio:["","Small wing. Small gains.","You'll feel it through the wheel.","The car's planted. Properly.","He drew that on a napkin in '68."],
  },
  chassis: {
    label:"CHASSIS", icon:"C",
    levels:[
      {name:"SPACE FRAME",     color:"#555",   effect:"Standard stock size"},
      {name:"REINFORCED FRAME",color:"#888",   effect:"+2 stock cards per race",      credits:6,  trophies:0},
      {name:"ALU MONOCOQUE",   color:"#4895ef",effect:"+4 stock. 1 face-down revealed/tab",credits:14, trophies:0},
      {name:"CARBON TUB",      color:"#f4a261",effect:"+6 stock. 1 free draw per tableau",credits:22, trophies:3},
      {name:"VOSS MONOCOQUE",  color:"#f4d03f",effect:"+8 stock. 3 unused carry to next tab",credits:32, trophies:5},
    ],
    emilio:["","Stops rattling at least.","Stiff. How it should be.","Carbon. We're not a backmarker.","I measured the original three times."],
  },
  driver: {
    label:"DRIVER", icon:"D",
    levels:[
      {name:"ROOKIE",          color:"#555",   effect:"Standard play"},
      {name:"PROMISING",       color:"#888",   effect:"Hint flashes on first wrong play",credits:8,  trophies:0},
      {name:"COMPETITIVE",     color:"#4895ef",effect:"x5+ combos auto +1 credit",     credits:15, trophies:0},
      {name:"FRONTRUNNER",     color:"#f4a261",effect:"Once per race: undo last play",  credits:22, trophies:3},
      {name:"VOSS",            color:"#f4d03f",effect:"Aces always valid. Every 10th card = free",credits:35, trophies:6},
    ],
    emilio:["","You're learning. I can see it.","Ferri asked about you today.","Making decisions without being told.","Your father would have said something. I'll just say: good."],
  },
};

const SYNERGIES = [
  {id:"planted",    name:"PLANTED",      condition:(c)=>c.tires>=2&&c.chassis>=2,    effect:"Draws never reset combo"},
  {id:"attack",     name:"ATTACK MODE",  condition:(c)=>c.engine>=2&&c.aero>=2,      effect:"Rival penalty doubles when ahead"},
  {id:"zone",       name:"IN THE ZONE",  condition:(c)=>c.driver>=2&&c.engine>=2,    effect:"Combo floor x2 once you hit x4"},
  {id:"fullpkg",    name:"FULL PACKAGE", condition:(c)=>Object.values(c).every(v=>v>=2), effect:"Wild pool weighted Rare+"},
  {id:"vossspec",   name:"VOSS SPECIAL", condition:(c)=>Object.values(c).filter(v=>v>=4).length>=2, effect:"4 held part slots"},
  {id:"realcar",    name:"THE REAL CAR", condition:(c)=>Object.values(c).every(v=>v>=4), effect:"Prototype car class unlocked"},
];
// ── Collectibles ──────────────────────────────────────────────────────────────
const COLLECTIBLES = [
  // MEMORABILIA
  {id:"c01",cat:"MEMORABILIA",name:"1969 MONACO PROGRAMME",  flavor:"Enzo's name circled in the driver listings."},
  {id:"c02",cat:"MEMORABILIA",name:"CHEQUERED FLAG FRAGMENT",flavor:"A torn corner of a finish-line flag."},
  {id:"c03",cat:"MEMORABILIA",name:"PIT BOARD",              flavor:"P3 +4 LAPS. Someone crossed out the 3 and wrote 1."},
  {id:"c04",cat:"MEMORABILIA",name:"TIMING SHEET",           flavor:"One column circled in red. Enzo's column."},
  {id:"c05",cat:"MEMORABILIA",name:"RACE NUMBER PLATE",      flavor:"The number 7. Bent at one corner. Paint scorched."},
  {id:"c06",cat:"MEMORABILIA",name:"PADDOCK PASS — 1969",    flavor:"The photo has been torn off."},
  {id:"c07",cat:"MEMORABILIA",name:"STARTER'S FLAG",         flavor:"A green flag, folded. Still has track dust in it."},
  {id:"c08",cat:"MEMORABILIA",name:"FUEL RECEIPT",           flavor:"Handwritten. 40 litres. Date: May 1969."},
  {id:"c09",cat:"MEMORABILIA",name:"TYRE PRESSURE GAUGE",    flavor:"Initials scratched on the back: E.V."},
  {id:"c10",cat:"MEMORABILIA",name:"WINNER'S CHAMPAGNE CORK",flavor:"Not Enzo's podium. You keep it anyway."},
  {id:"c11",cat:"MEMORABILIA",name:"PRESS PASS",             flavor:"The photo is of a young Emilio."},
  {id:"c12",cat:"MEMORABILIA",name:"STEWARD'S NOTEBOOK",     flavor:"One entry: Incident — car 7 — inconclusive."},
  // ENZO'S THINGS
  {id:"c13",cat:"ENZO",       name:"ENZO'S DRIVING GLOVES",  flavor:"Still smell faintly of petrol."},
  {id:"c14",cat:"ENZO",       name:"A POSTCARD",              flavor:"'Weather good. Car good. Coming home soon.'"},
  {id:"c15",cat:"ENZO",       name:"ENGINEERING SKETCH",      flavor:"Pencil drawing. Margin note: 'try 2mm forward.'"},
  {id:"c16",cat:"ENZO",       name:"A PHOTOGRAPH — 1967",     flavor:"Enzo laughing at something off-camera."},
  {id:"c17",cat:"ENZO",       name:"BROKEN STOPWATCH",        flavor:"Stopped at 1:23.4. Nobody knows which lap."},
  {id:"c18",cat:"ENZO",       name:"HIS HELMET",              flavor:"VOSS written in marker on the back."},
  {id:"c19",cat:"ENZO",       name:"A BRASS KEY",             flavor:"No label. You don't know what it opens."},
  {id:"c20",cat:"ENZO",       name:"RACE ENTRY FORM — 1970",  flavor:"Filled out in Enzo's handwriting. Never submitted."},
  {id:"c21",cat:"ENZO",       name:"A NAPKIN SKETCH",         flavor:"A rough aero shape. Dated Nov 1968."},
  {id:"c22",cat:"ENZO",       name:"LAST LOGBOOK ENTRY",      flavor:"'Monaco tomorrow. The car is right. I am ready.'"},
  // CONSPIRACY
  {id:"c23",cat:"CONSPIRACY", name:"REDACTED DOCUMENT",       flavor:"Three lines blacked out. 'Fuel system irregularity.'"},
  {id:"c24",cat:"CONSPIRACY", name:"HALE'S BUSINESS CARD",    flavor:"Someone wrote 'DON'T' on the back."},
  {id:"c25",cat:"CONSPIRACY", name:"A HOTEL KEY",             flavor:"From Monaco, 1969. Not Enzo's hotel."},
  {id:"c26",cat:"CONSPIRACY", name:"CORD'S WORK BADGE",       flavor:"The photo shows a young man who looks frightened."},
  {id:"c27",cat:"CONSPIRACY", name:"TELEPHONE MESSAGE",       flavor:"'Mr Voss — urgent call — would not leave name.'"},
  {id:"c28",cat:"CONSPIRACY", name:"TIMING ANOMALY REPORT",   flavor:"Pressure dropped in 0.3 seconds. Filed and ignored."},
  {id:"c29",cat:"CONSPIRACY", name:"OVEREXPOSED PHOTOGRAPH",  flavor:"Almost white. Two figures near a car in darkness."},
  {id:"c30",cat:"CONSPIRACY", name:"CHAMPIONSHIP TABLE",      flavor:"Cord's handwriting. An arrow from Enzo to Hale."},
  {id:"c31",cat:"CONSPIRACY", name:"WIRE TRANSFER RECORD",    flavor:"A payment. Several zeros. Recipient torn away."},
  {id:"c32",cat:"CONSPIRACY", name:"THE SPARE KEY",           flavor:"Identical to the brass key. Found somewhere else."},
  // WEIRD STUFF
  {id:"c33",cat:"WEIRD",      name:"A RUBBER DUCK",           flavor:"Small. Yellow. Racing helmet painted on."},
  {id:"c34",cat:"WEIRD",      name:"FORTUNE COOKIE SLIP",     flavor:"'YOU WILL FIND WHAT YOU ARE LOOKING FOR.'"},
  {id:"c35",cat:"WEIRD",      name:"A MARBLE",                flavor:"Blue. Perfectly round. How did it get here?"},
  {id:"c36",cat:"WEIRD",      name:"A PRESSED FLOWER",        flavor:"Placed deliberately. Species: unknown."},
  {id:"c37",cat:"WEIRD",      name:"SOMEONE'S SHOPPING LIST", flavor:"Milk, bread, eggs, spark plugs, justice."},
  {id:"c38",cat:"WEIRD",      name:"A 1969 FRANC",            flavor:"A small V scratched into the tail side."},
  {id:"c39",cat:"WEIRD",      name:"A CASSETTE TAPE",         flavor:"'BEST OF 74 — DO NOT ERASE.' No player in the garage."},
  {id:"c40",cat:"WEIRD",      name:"A NOTE TO NOBODY",        flavor:"'If you're reading this, you found it. Keep going.'"},
];
const CAT_COLORS_COLL = {MEMORABILIA:"#4895ef",ENZO:"#f4d03f",CONSPIRACY:"#9b5de5",WEIRD:"#2dc653"};
// ── Boons ─────────────────────────────────────────────────────────────────────
const BOONS = {
  emilio: {
    name:"EMILIO",
    title:"Chief Engineer",
    color:"#c9a84c",
    unlockCondition:"always",
    boons:[
      {id:"e1",name:"Valve Timing",    quote:"I adjusted the valve timing. She'll breathe better.",   effect:"First stock draw each race never resets combo",         apply:"emilio_valve"},
      {id:"e2",name:"Weight Dist.",    quote:"Moved forty kilos rearward. Feel it in the corners.",    effect:"Clearing face-down cards adds +1 extra combo",           apply:"emilio_weight"},
      {id:"e3",name:"Fuel Map B",      quote:"There's a second fuel map. More conservative.",          effect:"+3 stock cards at the start of every race",              apply:"emilio_fuel"},
      {id:"e4",name:"Tyre Warmers",    quote:"I know you said the blankets were fine. I added more.",  effect:"First 4 plays each race always valid regardless of rank", apply:"emilio_warmers"},
      {id:"e5",name:"Setup Sheet",     quote:"I wrote everything down. Every change. Every note.",     effect:"At race start, see and reorder top 5 stock cards",        apply:"emilio_setup"},
    ]
  },
  ferri: {
    name:"FERRI",
    title:"Scuderia Rossa",
    color:"#e63946",
    unlockCondition:"beatFerri",
    boons:[
      {id:"f1",name:"Ferri's Line",    quote:"There's a line through the Mirabeau nobody else takes.", effect:"Once per race: play any card regardless of rank",         apply:"ferri_line"},
      {id:"f2",name:"Attack Mode",     quote:"Forget strategy. Just go.",                               effect:"At x5+, each play adds +2 combo instead of +1",          apply:"ferri_attack"},
      {id:"f3",name:"Late Apex",       quote:"Wait longer than you think. Then attack.",                effect:"Last 3 cards of a race each count double for credits",    apply:"ferri_apex"},
      {id:"f4",name:"Undercut",        quote:"You pit early. Everyone thinks it's a mistake.",          effect:"When rival leads, your combo multiplier +1",              apply:"ferri_undercut"},
      {id:"f5",name:"Slipstream Pass", quote:"Get right on his gearbox. Then go.",                     effect:"4 cards in a row without drawing sets rival back 3",      apply:"ferri_slip"},
    ]
  },
  sera: {
    name:"SERA",
    title:"Marco's Sister",
    color:"#4895ef",
    unlockCondition:"season1done",
    boons:[
      {id:"s1",name:"Call Home",       quote:"I just wanted to hear your voice.",                       effect:"Once per race: survive one rival finish with a free turn", apply:"sera_call"},
      {id:"s2",name:"Old Jacket",      quote:"Wear it. He'd want you to.",                              effect:"Face cards always valid plays regardless of rank",         apply:"sera_jacket"},
      {id:"s3",name:"Don't Look",      quote:"Stop watching the rival. Race your own race.",            effect:"Combo starts at x2. Rival bar hidden.",                   apply:"sera_dontlook"},
      {id:"s4",name:"Steady Hands",    quote:"You always say you're fine.",                             effect:"Draws never reset combo for first 9 cards of each race",  apply:"sera_steady"},
      {id:"s5",name:"She Believes You",quote:"Then I believe you.",                                     effect:"Once per season: replay a lost race with all boons intact",apply:"sera_believe"},
    ]
  },
  hale: {
    name:"HALE",
    title:"Five-Time Champion",
    color:"#f4d03f",
    unlockCondition:"season3",
    boons:[
      {id:"h1",name:"Champion's Advice",quote:"The fastest line is always the simplest.",              effect:"Cards +/-2 rank are always valid plays",                  apply:"hale_advice"},
      {id:"h2",name:"Hale Access",      quote:"My engineers have some time. No obligation.",           effect:"One random card auto-cleared at start of each race",      apply:"hale_access"},
      {id:"h3",name:"Five Championships",quote:"Champions never panic. Even when they should.",        effect:"Combo can never drop below x2 once you reach x2",         apply:"hale_five"},
      {id:"h4",name:"Hale Method",      quote:"The secret is knowing when not to use speed.",          effect:"Once per race: draw from stock without changing top card", apply:"hale_method"},
      {id:"h5",name:"Quiet Word",       quote:"I had a conversation with the officials. Coincidence.", effect:"Rival starts each race 20% slower permanently this season",apply:"hale_word"},
    ]
  },
  cord: {
    name:"CORD",
    title:"Former Hale Mechanic",
    color:"#9b5de5",
    unlockCondition:"fragments2",
    boons:[
      {id:"c1",name:"Camera Blind Spot",quote:"There's a section the cameras don't cover.",            effect:"Once per race: play any card from anywhere in tableau",    apply:"cord_blind"},
      {id:"c2",name:"The Logbook",      quote:"I kept notes. On everything.",                          effect:"All face-down card ranks revealed at race start",          apply:"cord_logbook"},
      {id:"c3",name:"Five Years",       quote:"I should have spoken sooner.",                          effect:"First combo of each race starts at x3",                   apply:"cord_years"},
      {id:"c4",name:"What I Saw",       quote:"The pressure dropped in 0.3 seconds.",                  effect:"Clearing a King card gives +3 combo instantly",           apply:"cord_saw"},
      {id:"c5",name:"Enzo's Setup",     quote:"He worked it out over three seasons. I wrote it down.", effect:"Once per race: entire bottom row valid for 3 turns",      apply:"cord_setup"},
    ]
  },
};

// ── Story Fragments ───────────────────────────────────────────────────────────
const STORY_MOMENTS = [
  // EMILIO TIER 1 (trust 0-1) — surface level
  {id:"e01",type:"dialogue",trust:0,char:"EMILIO",color:"#c9a84c",
   lines:[
     {speaker:"EMILIO",text:"She's not pretty. But she's honest. Most cars'll lie to you. Not this one. She tells you everything."},
     {speaker:"MARCO",text:"You talk about it like it's a person."},
     {speaker:"EMILIO",text:"Everything with an engine is a person. You'll learn that."},
   ]},
  {id:"e02",type:"dialogue",trust:0,char:"EMILIO",color:"#c9a84c",
   lines:[
     {speaker:"EMILIO",text:"Monaco. Every driver thinks they know it. Most of them are wrong."},
     {speaker:"MARCO",text:"Were you ever afraid of it?"},
     {speaker:"EMILIO",text:"Every single time. That's the point."},
   ]},
  {id:"e03",type:"dialogue",trust:0,char:"EMILIO",color:"#c9a84c",
   lines:[
     {speaker:"EMILIO",text:"Ferri will try to rattle you before the start. Ignore him."},
     {speaker:"MARCO",text:"Does it work?"},
     {speaker:"EMILIO",text:"On rookies? Almost always. So don't be a rookie."},
   ]},
  {id:"e04",type:"dialogue",trust:0,char:"EMILIO",color:"#c9a84c",
   lines:[
     {speaker:"EMILIO",text:"You want to know why I took this job? Lowest offer on the grid. Worst car. Everyone said I was finished."},
     {speaker:"MARCO",text:"Why did you take it then?"},
     {speaker:"EMILIO",text:"Because your name is Voss. ...Get some sleep."},
   ]},
  // EMILIO TIER 2 (trust 2-3) — cracks forming
  {id:"e05",type:"dialogue",trust:2,char:"EMILIO",color:"#c9a84c",
   lines:[
     {speaker:"EMILIO",text:"Your father was fastest in qualifying at Monaco in '69. By almost two seconds. Nobody does that."},
     {speaker:"MARCO",text:"What happened in the race?"},
     {speaker:"EMILIO",text:"Fuel irregularity. That's what the officials said."},
     {speaker:"MARCO",text:"You don't believe that."},
     {speaker:"EMILIO",text:"I believe the fuel was irregular. I don't believe it got that way on its own."},
   ]},
  {id:"e06",type:"dialogue",trust:2,char:"EMILIO",color:"#c9a84c",
   lines:[
     {speaker:"MARCO",text:"Hale came by the garage today. Said he remembered my father fondly."},
     {speaker:"EMILIO",text:"...What did you say?"},
     {speaker:"MARCO",text:"I said thank you."},
     {speaker:"EMILIO",text:"Mm."},
     {speaker:"EMILIO",text:"Hand me the torque wrench."},
   ]},
  {id:"e07",type:"dialogue",trust:2,char:"EMILIO",color:"#c9a84c",
   lines:[
     {speaker:"EMILIO",text:"Enzo was going to win it. Three races left, fifteen point lead."},
     {speaker:"MARCO",text:"And he retired."},
     {speaker:"EMILIO",text:"Monaco was the last race he started. Called it himself. Mid-race. Never got back in the car."},
     {speaker:"MARCO",text:"He never told me why."},
     {speaker:"EMILIO",text:"No. I don't imagine he would."},
   ]},
  // EMILIO TIER 3 (trust 4+) — full honesty
  {id:"e08",type:"dialogue",trust:4,char:"EMILIO",color:"#c9a84c",
   lines:[
     {speaker:"EMILIO",text:"I was there. In '69. I was a junior mechanic on Hale's team."},
     {speaker:"MARCO",text:"..."},
     {speaker:"EMILIO",text:"I didn't know what they were planning. I saw someone working on your father's car the night before Monaco. Someone from our team."},
     {speaker:"MARCO",text:"What did you do?"},
     {speaker:"EMILIO",text:"I told myself it was routine. Go get some sleep. We have a race tomorrow."},
   ]},
  {id:"e09",type:"dialogue",trust:5,char:"EMILIO",color:"#c9a84c",
   lines:[
     {speaker:"EMILIO",text:"The mechanic who worked on Enzo's car that night. His name was Cord. Peter Cord."},
     {speaker:"MARCO",text:"Is he the one leaving the notes?"},
     {speaker:"EMILIO",text:"I think so. I recognised the handwriting. He always wrote his sevens with a crossbar."},
     {speaker:"MARCO",text:"Why is he telling me now?"},
     {speaker:"EMILIO",text:"Because you're good enough to actually win. And that scares the right people."},
   ]},
  // GARAGE FINDS
  {id:"g01",type:"find",char:"GARAGE",color:"#888",
   title:"1969 MONACO PROGRAMME",
   desc:"Yellowed, coffee-stained. Enzo's name is circled in the driver listings. In the margin, in faded pencil, someone has written: 'He knows. Don't let him reach the finish.' The handwriting is not Enzo's."},
  {id:"g02",type:"find",char:"GARAGE",color:"#888",
   title:"OFFICIAL INCIDENT REPORT",
   desc:"Filed by Race Director P. Armand. Re: Car #7 (E. Voss) — Retirement, Lap 34. 'Driver reported sudden loss of fuel pressure. Post-race inspection inconclusive. No mechanical fault identified.' Stamped: CLOSED. Someone has written in the margin in red: 'They didn't look hard enough.'"},
  {id:"g03",type:"find",char:"GARAGE",color:"#888",
   title:"UNSIGNED NOTE",
   desc:"Slipped under the garage door. Typewritten. 'KEEP RACING. THE ANSWERS ARE IN THE CIRCUIT. HALE FEARS WHAT YOU REPRESENT. DON'T STOP.' No signature. The paper smells like motor oil and old cigarettes."},
  {id:"g04",type:"find",char:"GARAGE",color:"#888",
   title:"A PHOTOGRAPH",
   desc:"Black and white. Two men at a pit wall, 1969. One is clearly Victor Hale, younger, grinning at the camera. The other has his back turned. His jacket reads: CORD — HALE MTRSPRT. On the back, in Enzo's handwriting: 'I know what you did. E.V.'"},
  {id:"g05",type:"find",char:"GARAGE",color:"#888",
   title:"SECOND UNSIGNED NOTE",
   desc:"Same paper stock as before. '1969 MONACO. NIGHT BEFORE THE RACE. PIT LANE CAMERA 3 WAS DISABLED. MAINTENANCE, THEY SAID. IT WAS NEVER MAINTENANCE.' You show it to Emilio. He reads it twice and says nothing for a very long time."},
  // HALE ENCOUNTERS
  {id:"h01",type:"dialogue",trust:0,char:"HALE",color:"#f4d03f",
   lines:[
     {speaker:"HALE",text:"Marco Voss. Your father's eyes. I'd know them anywhere."},
     {speaker:"MARCO",text:"Mr Hale."},
     {speaker:"HALE",text:"Victor, please. I've been following your results. You have real talent. Natural."},
     {speaker:"HALE",text:"I hope we get to race together properly one day. I think you'd find I'm a fair competitor."},
   ]},
  {id:"h02",type:"dialogue",trust:0,char:"HALE",color:"#f4d03f",
   lines:[
     {speaker:"HALE",text:"Still here. Good. A lot of young drivers don't make it past the first season."},
     {speaker:"MARCO",text:"I had a good mechanic."},
     {speaker:"HALE",text:"Ricci. Of course. Small world, isn't it."},
     {speaker:"HALE",text:"Good luck tomorrow, Marco. You'll need it."},
   ]},
  // ENZO'S LETTER (fixed — appears after e08)
  {id:"g06",type:"find",char:"ENZO",color:"#f4d03f",fixed:"e08",
   title:"ENZO'S LETTER",
   desc:"Found in an envelope taped inside the garage workbench. Addressed: 'For Marco, when he's ready.' In Enzo's handwriting: 'I stopped because they threatened your mother. Not me — her. I could race again and something might happen to her, or I could retire quietly and we would all be fine. I chose you both. I don't regret it. But if you want the truth, find Peter Cord. He saw everything. Win one for me, kid. Your father.'"},
  // CORD'S FINAL NOTE (fixed — appears after g06)
  {id:"g07",type:"find",char:"CORD",color:"#9b5de5",fixed:"g06",
   title:"CORD'S CONFESSION",
   desc:"Handwritten. Shaking script. European sevens with crossbars. 'Mr Voss, I adjusted the fuel mixture regulator on car #7 the night before Monaco 1969. I was told it was a standard check. It was not a standard check. I have been silent for five years. I am finished being silent. I will speak to whoever needs to hear it. Tell Emilio I'm sorry it took this long. P. Cord'"},
];







const RIVALS = [
  {name:"L. FERRI",   color:"#e63946",quote:"You don't belong here, rookie."},
  {name:"H. MUELLER", color:"#adb5bd",quote:"Precision wins. You have none."},
  {name:"LEBLANC",    color:"#4895ef",quote:"Zis is not a nursery school."},
  {name:"V. HALE",    color:"#c9a84c",quote:"Your father was a good man, Marco."},
];
const EMILIO_Q = [
  "Faster than you look.\nDon't let it go to your head.",
  "Ferri's team is watching. Good.",
  "One more after this.\nEverything on the line.",
  "This is it, Marco. Make it count.",
];

const TRACK_PATH = "M 15,50 L 15,20 Q 15,8 28,8 L 55,8 Q 62,8 65,14 L 68,20 Q 70,24 75,24 L 82,24 Q 88,24 88,30 L 88,42 Q 88,52 78,52 L 28,52 Q 15,52 15,50 Z";
const TPTS = [[15,50],[15,42],[15,34],[15,26],[15,20],[20,12],[28,8],[38,8],[48,8],[55,8],[62,10],[65,16],[67,22],[72,24],[79,24],[85,28],[88,35],[88,42]];

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle(a){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=b[i];b[i]=b[j];b[j]=t;}return b;}
function makeDeck(){const d=[];for(let s=0;s<SUITS.length;s++)for(let v=0;v<VALUES.length;v++)d.push({suit:SUITS[s],val:VALUES[v],isWild:false});return shuffle(d);}
function isAdj(a,b,range){const va=VMAP[a.val],vb=VMAP[b.val],diff=Math.abs(va-vb);return diff<=range||(va===1&&vb===13)||(va===13&&vb===1);}
function dealTab(deck){return[deck.slice(0,3),deck.slice(3,9),deck.slice(9,18)].map((row,ri)=>row.map(c=>({...c,faceUp:ri===2,removed:false})));}
function recompute(tab){const gone=(r,c)=>!tab[r]||!tab[r][c]||tab[r][c].removed;return tab.map((row,ri)=>row.map((card,ci)=>{if(!card||card.removed)return{...card,available:false};const av=ri===2?true:ri===1?gone(2,ci*2)&&gone(2,ci*2+1):gone(1,ci*2)&&gone(1,ci*2+1);return{...card,available:av,faceUp:av||card.faceUp};}));}
function catScale(inst,cat){const n=inst.filter(p=>p.cat===cat).length;return n===0?1:n===1?0.6:0.3;}
function pickWild(){const pool=[];WILDS.forEach(w=>{for(let i=0;i<WWEIGHTS[w.rarity];i++)pool.push(w);});return pool[Math.floor(Math.random()*pool.length)];}
function injectWilds(arr){const roll=Math.random()*10;const count=roll<4?0:roll<7?1:2;if(count===0)return arr;const result=arr.slice();for(let i=0;i<count;i++){const w=pickWild();const min=3,max=Math.max(min+1,result.length-3);const pos=min+Math.floor(Math.random()*(max-min));result.splice(pos,0,{suit:"W",val:"W",isWild:true,wildData:w});}return result;}

// ── Card Components ───────────────────────────────────────────────────────────
function CardFace({card,onClick,hi,dim}){
  const isRed=REDS.indexOf(card.suit)>=0;
  const isFace=["J","Q","K","A"].indexOf(card.val)>=0;
  const fc=isFace?FCLR[card.val]:null;
  const sc=isRed?"#c0392b":"#1a1a2e";
  return(
    <div onClick={onClick} style={{width:46,height:64,borderRadius:3,flexShrink:0,cursor:onClick?"pointer":"default",border:hi?"3px solid "+GOLD:"2px solid "+(isRed?"#8B3030":"#444"),boxShadow:hi?"0 0 0 2px "+GOLD+"88,4px 4px 0 #000":"3px 3px 0 #000",background:isFace?fc.bg:"#f5eed8",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",opacity:dim?0.3:1,padding:"3px 2px",userSelect:"none",imageRendering:"pixelated",overflow:"hidden"}}>
      {isFace?(
        <>
          <div style={{fontSize:6,color:fc.ac,fontFamily:PX,lineHeight:1,alignSelf:"flex-start",paddingLeft:2}}>{card.val}</div>
          <div style={{fontSize:7,color:fc.ac,fontFamily:PX,letterSpacing:1,textAlign:"center"}}>{fc.label}</div>
          <svg width="28" height="28" viewBox="0 0 16 16" style={{imageRendering:"pixelated"}}>
            {card.val==="A"&&<><rect x="6" y="1" width="4" height="4" fill={fc.ac}/><rect x="4" y="5" width="8" height="6" fill={fc.ac}/><rect x="5" y="11" width="2" height="3" fill={fc.ac}/><rect x="9" y="11" width="2" height="3" fill={fc.ac}/><rect x="3" y="8" width="2" height="3" fill={fc.ac}/><rect x="11" y="8" width="2" height="3" fill={fc.ac}/></>}
            {card.val==="K"&&<><rect x="6" y="1" width="4" height="4" fill={fc.ac}/><rect x="5" y="5" width="6" height="5" fill={fc.ac}/><rect x="4" y="10" width="8" height="4" fill={fc.ac}/><rect x="3" y="7" width="2" height="3" fill={fc.ac}/><rect x="11" y="7" width="2" height="3" fill={fc.ac}/><rect x="6" y="0" width="1" height="2" fill={GOLD}/><rect x="8" y="0" width="1" height="2" fill={GOLD}/><rect x="7" y="0" width="2" height="1" fill={GOLD}/></>}
            {card.val==="Q"&&<><rect x="6" y="2" width="4" height="4" fill={fc.ac}/><rect x="5" y="6" width="6" height="5" fill={fc.ac}/><rect x="4" y="11" width="8" height="3" fill={fc.ac}/><rect x="3" y="8" width="2" height="2" fill={fc.ac}/><rect x="11" y="8" width="2" height="2" fill={fc.ac}/></>}
            {card.val==="J"&&<><rect x="6" y="2" width="4" height="4" fill={fc.ac}/><rect x="5" y="6" width="6" height="4" fill={fc.ac}/><rect x="6" y="10" width="4" height="4" fill={fc.ac}/><rect x="4" y="8" width="2" height="2" fill={fc.ac}/></>}
          </svg>
          <div style={{fontSize:6,color:fc.ac,fontFamily:PX,lineHeight:1,alignSelf:"flex-end",paddingRight:2,transform:"rotate(180deg)"}}>{card.val}</div>
        </>
      ):(
        <>
          <div style={{fontSize:card.val==="10"?8:9,fontWeight:"bold",color:sc,fontFamily:PX,lineHeight:1,alignSelf:"flex-start"}}>{card.val}</div>
          <svg width="20" height="20" viewBox="0 0 16 16" style={{imageRendering:"pixelated"}}><path d={SUIT_PATH[card.suit]} fill={sc}/></svg>
          <div style={{fontSize:card.val==="10"?8:9,fontWeight:"bold",color:sc,fontFamily:PX,lineHeight:1,alignSelf:"flex-end",transform:"rotate(180deg)"}}>{card.val}</div>
        </>
      )}
    </div>
  );
}

function CardBack({hasSecret}){
  return(
    <div style={{width:46,height:64,borderRadius:3,flexShrink:0,border:hasSecret?"2px solid #c9a84c":"2px solid #8B0000",boxShadow:hasSecret?"0 0 6px #c9a84c55,3px 3px 0 #000":"3px 3px 0 #000",background:"#1a0505",imageRendering:"pixelated",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <svg width="40" height="58" viewBox="0 0 40 58">
        {Array.from({length:5}).map((_,row)=>Array.from({length:4}).map((_,col)=>(
          <rect key={row+","+col} x={col*10+1} y={row*11+2} width={8} height={9} fill={(row+col)%2===0?"#5a0000":"#3d0000"}/>
        )))}
        <path d="M18,14 L20,10 L22,14 L20,13 L21,18 L19,18 L20,13 Z" fill="#c9a84c"/>
      </svg>
    </div>
  );
}

function WildBack({wild}){
  const rc=RCLR[wild.rarity];
  return(
    <div style={{width:46,height:64,borderRadius:3,flexShrink:0,border:"2px solid "+rc,boxShadow:"0 0 8px "+rc+",3px 3px 0 #000",background:"#080010",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3}}>
      <div style={{fontSize:5,color:rc,fontFamily:PX}}>WILD</div>
      <div style={{fontSize:12,color:rc,fontFamily:PX}}>W</div>
      <div style={{fontSize:4,color:rc+"aa",fontFamily:PX}}>{wild.rarity.slice(0,4)}</div>
    </div>
  );
}

function MonacoTrack({playerLap,rivalLap,totalLaps,rivalColor,rivalFrozen}){
  const pIdx=Math.floor((playerLap/totalLaps)*(TPTS.length-1));
  const rIdx=Math.floor((rivalLap/totalLaps)*(TPTS.length-1));
  const pp=TPTS[Math.min(pIdx,TPTS.length-1)];
  const rp=TPTS[Math.min(rIdx,TPTS.length-1)];
  return(
    <svg viewBox="0 0 100 60" style={{width:"100%",maxWidth:360,display:"block"}}>
      <path d={TRACK_PATH} fill="none" stroke="#333" strokeWidth="8" strokeLinejoin="round"/>
      <path d={TRACK_PATH} fill="none" stroke="#555" strokeWidth="6" strokeLinejoin="round"/>
      <path d={TRACK_PATH} fill="none" stroke="#3a3a3a" strokeWidth="4" strokeLinejoin="round" strokeDasharray="3,3"/>
      <rect x="12" y="44" width="6" height="8" fill="white" opacity="0.7"/>
      <rect x="12" y="44" width="2" height="2" fill="black" opacity="0.7"/>
      <rect x="14" y="46" width="2" height="2" fill="black" opacity="0.7"/>
      <rect x="12" y="48" width="2" height="2" fill="black" opacity="0.7"/>
      <rect x="14" y="50" width="2" height="2" fill="black" opacity="0.7"/>
      <rect x={rp[0]-3} y={rp[1]-2} width="6" height="4" rx="1" fill={rivalFrozen?"#444":rivalColor} opacity="0.9"/>
      <rect x={rp[0]-2} y={rp[1]-3} width="4" height="2" rx="1" fill={rivalFrozen?"#444":rivalColor} opacity="0.7"/>
      {rivalFrozen&&<text x={rp[0]} y={rp[1]-5} textAnchor="middle" fill="#aaa" fontSize="4">SC</text>}
      <rect x={pp[0]-3} y={pp[1]-2} width="6" height="4" rx="1" fill={GOLD}/>
      <rect x={pp[0]-2} y={pp[1]-3} width="4" height="2" rx="1" fill={GOLD} opacity="0.8"/>
      <rect x={pp[0]-1} y={pp[1]-1} width="2" height="2" fill="#fff" opacity="0.6"/>
      <text x="50" y="57" textAnchor="middle" fill="#555" fontSize="4" fontFamily="monospace">CIRCUIT DE MONACO</text>
    </svg>
  );
}

function ComboMeter({combo}){
  if(combo<2)return null;
  const pct=Math.min(combo/12,1);
  const angle=-135+pct*270;
  const rad=angle*Math.PI/180;
  const cx=30,cy=30,rv=20;
  const nx=cx+rv*Math.cos(rad),ny=cy+rv*Math.sin(rad);
  const color=combo>=8?RED:combo>=5?GOLD:"#2dc653";
  return(
    <div style={{textAlign:"center"}}>
      <svg width="60" height="44" viewBox="0 0 60 44">
        <path d="M 10,38 A 20,20 0 1 1 50,38" fill="none" stroke="#222" strokeWidth="6" strokeLinecap="round"/>
        <path d={"M 10,38 A 20,20 0 "+(pct>0.5?1:0)+" 1 "+nx.toFixed(1)+","+ny.toFixed(1)} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"/>
        <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)} stroke={color} strokeWidth="2"/>
        <circle cx={cx} cy={cy} r="3" fill={color}/>
        <text x={cx} y={cy+14} textAnchor="middle" fill={color} fontSize="7" fontFamily={PX}>{"x"+combo}</text>
      </svg>
    </div>
  );
}

function HeldSlot({part,index,onUse}){
  if(!part){
    return(
      <div style={{width:80,height:54,border:"1px dashed #2a2a2a",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",background:"#0a0a0a"}}>
        <div style={{fontSize:5,color:"#333",fontFamily:PX}}>{"SLOT "+(index+1)}</div>
      </div>
    );
  }
  return(
    <div onClick={onUse} style={{width:80,height:54,border:"2px solid "+CCAT[part.cat],borderRadius:3,background:"#0d0d0d",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:4,gap:3,boxShadow:"2px 2px 0 "+CCAT[part.cat]+"44"}}>
      <div style={{fontSize:6,color:GOLD,fontFamily:PX,textAlign:"center",lineHeight:1.4}}>{part.name}</div>
      <div style={{fontSize:5,color:CCAT[part.cat],fontFamily:PX}}>{part.cat}</div>
      <div style={{fontSize:5,color:"#555",fontFamily:PX}}>TAP USE</div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App(){
  const [screen,setScreen]       = useState("title");
  const [raceNum,setRaceNum]     = useState(1);
  const [season,setSeason]       = useState(1);
  const [credits,setCredits]     = useState(3);
  const [trophies,setTrophies]   = useState(0);
  const [carMods,setCarMods]     = useState([]);
  const [myPerks,setMyPerks]     = useState([]);
  const [totalParts,setTotalParts] = useState(0);
  const [carUpgrades,setCarUpgrades] = useState({engine:0,tires:0,aero:0,chassis:0,driver:0});
  const [upgradeMsg,setUpgradeMsg]   = useState("");
  const [activeBoons,setActiveBoons] = useState([]);      // boon apply-ids active this season
  const [usedBoons,setUsedBoons]     = useState([]);      // one-per-race boon ids used this race
  const [boonOffer,setBoonOffer]     = useState(null);    // {character, boon} or null
  const [bonusCredits,setBonusCredits] = useState(0);     // pit stop bonus credits offer
  const [beatFerri,setBeatFerri]     = useState(false);
  const [vehicle,setVehicle]         = useState(VEHICLES[0]);
  const [unlockedVehicles,setUnlockedVehicles] = useState(["sedan"]);
  const [vehicleSelect,setVehicleSelect] = useState(false);
  const [truckGroup,setTruckGroup]   = useState([]);   // cards selected for truck group
  const [raceWinsThisSeason,setRaceWinsThisSeason] = useState(0);
  const [stockDrawsThisSeason,setStockDrawsThisSeason] = useState(0);
  const [indyRunCount,setIndyRunCount] = useState(0);  // how many indy seasons played
  const [seenStory,setSeenStory]     = useState([]);   // story moment ids seen
  const [emilioTrust,setEmilioTrust] = useState(0);   // 0-6, increases on wins
  const [storyMoment,setStoryMoment] = useState(null); // current cutscene
  const [storyPage,setStoryPage]     = useState(0);   // dialogue line index
  const [pendingPitStop,setPendingPitStop] = useState(false); // wait for story dismiss
  const [season1done,setSeason1done] = useState(false);
  const [haleSeasonSlow,setHaleSeasonSlow] = useState(0); // hale_word boon effect
  const [collected,setCollected]     = useState([]);   // permanent collectible ids
  const [discovery,setDiscovery]     = useState(null); // {item} shown briefly
  const [format,setFormat]       = useState(RACE_FORMATS[0]);

  // race state
  const [tab,setTab]             = useState([]);
  const [stock,setStock]         = useState([]);
  const [top,setTop]             = useState(null);
  const [lapCount,setLapCount]   = useState(0);   // total cards cleared this race
  const [tabCleared,setTabCleared] = useState(0); // cards cleared in current tableau
  const [tabNum,setTabNum]       = useState(1);   // which tableau we're on (1-indexed)
  const [combo,setCombo]         = useState(0);
  const [msg,setMsg]             = useState("");
  const [rivalLap,setRivalLap]   = useState(0);
  const [rival,setRival]         = useState(RIVALS[0]);
  const [raceParts,setRaceParts] = useState([]);
  const [heldParts,setHeldParts] = useState([null,null,null]);
  const [offer,setOffer]         = useState(null);
  const [shopMods,setShopMods]   = useState([]);
  const [wildFlash,setWildFlash] = useState(null);
  const [lapBanner,setLapBanner] = useState(null); // {tableau, total, combo, topCard}
  const [haleWarning,setHaleWarning] = useState(null);

  // buffs
  const [rangeBuff,setRangeBuff]   = useState(0);
  const [freeDraws,setFreeDraws]   = useState(0);
  const [bonusCombo,setBonusCombo] = useState(0);
  const [suitBonus,setSuitBonus]   = useState(0);
  const [freeOp,setFreeOp]         = useState(0);
  const [rivalSlow,setRivalSlow]   = useState(0);
  const [reserveTank,setReserveTank] = useState(false);
  const [hardCompound,setHardCompound] = useState(false);
  const [doubleCredits,setDoubleCredits] = useState(false);
  const [comboLocked,setComboLocked] = useState(0);
  const [comboDoubleNext,setComboDoubleNext] = useState(false);
  const [cascade,setCascade]       = useState(0);
  const [freeOp5,setFreeOp5]       = useState(0);
  const [rivalFrozen,setRivalFrozen] = useState(false);
  const [ghostLap,setGhostLap]     = useState(false);
  const [rivalSurge,setRivalSurge] = useState(false); // Hale ability

  const timerRef  = useRef(null);
  const radioRef  = useRef(null);
  const crackleRef = useRef(false);

  const rivalTarget = format.distance + (carMods.indexOf("rollcage")>=0?18:0);
  // Car upgrade passive effects
  const upg = carUpgrades;
  const upgRivalSlow  = [0,0.08,0.16,0.25,0.35][upg.engine] + [0,0.06,0.10,0.16,0.22][upg.aero] + haleSeasonSlow;
  const upgStockBonus = [0,3,6,10,14][upg.chassis];
  const upgComboFloor = upg.engine>=2?2:upg.gears?2:carMods.indexOf("gears")>=0?2:0;
  const upgSuitBonus  = upg.tires>=1;
  const upgAcesFree   = upg.driver>=4;
  const upgUndo       = upg.driver>=3;
  const upgCascadeFace= upg.aero>=3;
  const upgWildSCTime = upg.aero>=4?12000:8000;
  // Synergy checks
  const activeSynergies = SYNERGIES.filter(s=>s.condition(upg));
  const synPlanted  = activeSynergies.find(s=>s.id==="planted");
  const synAttack   = activeSynergies.find(s=>s.id==="attack");
  const synZone     = activeSynergies.find(s=>s.id==="zone");
  const synFullPkg  = activeSynergies.find(s=>s.id==="fullpkg");
  const synVossSpec = activeSynergies.find(s=>s.id==="vossspec");
  const vRules = vehicle.rules;
  const cardRange   = Math.max(vRules.adjRange, carMods.indexOf("slicks")>=0||rangeBuff>0||(upg.tires>=4)||activeBoons.indexOf("hale_advice")>=0?2:1);

  // Rival timer
  useEffect(()=>{
    if(screen!=="race"){clearInterval(timerRef.current);return;}
    if(rivalFrozen){clearInterval(timerRef.current);return;}
    // Endurance gets a brutal push in final 2 tableaus
    const rallyBoost = vRules.rallyMode?1.25:1;
    const endurancePush = format.id==="endurance"&&tabNum>=5?1.3:1;
    const tableauScale = (1 + (tabNum-1)*format.rivalScale) * endurancePush * rallyBoost;
    // GP has a minimum speed multiplier — you're never safe
    const gpFloor = format.id==="grandprix"?1.2:1;
    const surgeScale   = (rivalSurge?2.5:1) * gpFloor;
    const slowMods     = rivalSlow+(myPerks.indexOf("coldblood")>=0?0.1:0)+(hardCompound?0.2:0)+upgRivalSlow;
    const iv = Math.max(380,(1800-raceNum*120)*((1+slowMods)/(tableauScale*surgeScale)));
    clearInterval(timerRef.current);
    timerRef.current=setInterval(()=>{
      setRivalLap(r=>{
        const next=r+1;
        if(next>=rivalTarget){
          clearInterval(timerRef.current);
          if(reserveTank){setReserveTank(false);setMsg("RESERVE TANK! ONE MORE LAP!");return next;}
          setMsg("RIVAL WINS. RETIRED.");
          setTimeout(()=>setScreen("gameover"),1600);
        }
        return next;
      });
    },iv);
    return()=>clearInterval(timerRef.current);
  },[screen,raceNum,rivalSlow,hardCompound,rivalTarget,rivalFrozen,rivalSurge,tabNum,format,myPerks]);

  // Check Hale boss abilities
  function checkHaleAbilities(newLapCount){
    if(format.id!=="the500") return;
    // Surge warning (fires one tableau before)
    const nextTabStart = tabNum*18;
    if(HALE_SURGES.indexOf(nextTabStart)>=0 && newLapCount===nextTabStart-18){
      setHaleWarning("HALE SURGING NEXT TABLEAU");
      setTimeout(()=>setHaleWarning(null),3000);
    }
    // Surge activate
    if(HALE_SURGES.indexOf(newLapCount)>=0){
      setRivalSurge(true);
      setMsg("HALE IS PUSHING! RIVAL AT 2.5X!");
      setTimeout(()=>setRivalSurge(false),18000);
    }
    // Fake-out (no warning) — swap top card from actual stock
    if(HALE_FAKEOUTS.indexOf(newLapCount)>=0){
      setStock(s=>{
        if(s.length>0&&!s[0].isWild){
          setTop(s[0]);
          return s.slice(1);
        }
        return s;
      });
      setMsg("HALE FAKE-OUT! TOP CARD CHANGED!");
    }
  }

  function startRace(rn,fmt){
    clearInterval(timerRef.current);
    clearTimeout(radioRef.current);
    crackleRef.current=false;
    const f=fmt||RACE_FORMATS[Math.min(rn-1,RACE_FORMATS.length-1)];
    setFormat(f);
    const deck=makeDeck();
    const boonStock=(activeBoons.indexOf("emilio_fuel")>=0?3:0);
    const motoStock=vRules.stockSize>0?vRules.stockSize:0;
    const extra=motoStock>0?0:(carMods.indexOf("tank")>=0?2:0)+upgStockBonus+boonStock;
    let newTab=recompute(dealTab(deck));
    const stockArr=deck.slice(18);
    const extraCards=extra>0?makeDeck().slice(0,extra):[];
    const withWilds=injectWilds(stockArr.slice(1));
    const r=RIVALS[Math.min(rn-1,RIVALS.length-1)];
    const finalStock=motoStock>0?shuffle(makeDeck()).slice(0,motoStock):extraCards.concat(withWilds);
    setTab(newTab);setStock(finalStock);setTop(stockArr[0]);
    // Inject one collectible into tableau if roll succeeds
    if(Math.random()<0.22){
      const pool=COLLECTIBLES.filter(c=>!collected.find(id=>id===c.id));
      if(pool.length>0){
        const item=pool[Math.floor(Math.random()*pool.length)];
        // Place under a random face-down card in row 0 or 1
        const candidates=[];
        [0,1].forEach(ri=>{
          newTab[ri].forEach((card,ci)=>{if(card&&!card.removed)candidates.push({ri,ci});});
        });
        if(candidates.length>0){
          const pos=candidates[Math.floor(Math.random()*candidates.length)];
          newTab[pos.ri][pos.ci]={...newTab[pos.ri][pos.ci],collectible:item};
        }
      }
    }
    setLapCount(0);setTabCleared(0);setTabNum(1);
    const boonCombo=activeBoons.indexOf("cord_years")>=0?3:activeBoons.indexOf("sera_dontlook")>=0?2:0;
    const startCombo=Math.max(boonCombo,vRules.startCombo+(vehicle.id==="indy"?Math.min(indyRunCount,3):0));
    setCombo(startCombo);
    setTruckGroup([]);setRaceParts([]);setHeldParts([null,null,null]);
    setOffer(null);setWildFlash(null);setLapBanner(null);setHaleWarning(null);
    setUsedBoons([]);
    const warmerOp=activeBoons.indexOf("emilio_warmers")>=0?4:0;
    setRangeBuff(0);setFreeDraws(0);setBonusCombo(0);setSuitBonus(0);setFreeOp(warmerOp);
    setRivalSlow(0);setReserveTank(false);setHardCompound(false);setDoubleCredits(false);
    setComboLocked(0);setComboDoubleNext(false);setCascade(0);setFreeOp5(0);
    setRivalFrozen(false);setGhostLap(false);setRivalSurge(false);
    setRival(r);setRivalLap(0);
    // hale_access: auto-clear bottom row card
    if(activeBoons.indexOf("hale_access")>=0){
      newTab=newTab.map((row,ri)=>{
        if(ri!==2)return row;
        let cleared=false;
        return row.map(card=>{
          if(!cleared&&card&&!card.removed){cleared=true;return{...card,removed:true};}
          return card;
        });
      });
      newTab=recompute(newTab);
    }
    setMsg(f.label+" - "+r.name+": \""+r.quote+"\"");
    // cord_logbook: reveal all face-down ranks
    if(activeBoons.indexOf("cord_logbook")>=0){
      newTab=newTab.map(row=>row.map(card=>({...card,faceUp:true})));
    }
    setScreen("race");
    const delay=8000+Math.random()*14000;
    radioRef.current=setTimeout(()=>{if(!crackleRef.current){crackleRef.current=true;doTriggerOffer("RADIO CRACKLE",[]);}},delay);
  }

  function advanceTableau(carryTop,carryCombo,currentLapCount){
    // Clear lap banner
    setLapBanner(null);
    const deck=makeDeck();
    const boonStock=(activeBoons.indexOf("emilio_fuel")>=0?3:0);
    const motoStock=vRules.stockSize>0?vRules.stockSize:0;
    const extra=motoStock>0?0:(carMods.indexOf("tank")>=0?2:0)+upgStockBonus+boonStock;
    let newTab=recompute(dealTab(deck));
    const stockArr=deck.slice(18);
    const extraCards=extra>0?makeDeck().slice(0,extra):[];
    const withWilds=injectWilds(stockArr.slice(1));

    // Hale card removal ability — use passed-in lapCount, not stale state
    if(format.id==="the500"&&HALE_REMOVALS.indexOf(currentLapCount)>=0){
      let removed=0;
      newTab=newTab.map(row=>row.map(card=>{
        if(removed<3&&card&&!card.removed&&card.faceUp){removed++;return{...card,removed:true};}
        return card;
      }));
      newTab=recompute(newTab);
      setMsg("HALE INTERFERENCE! 3 CARDS REMOVED!");
    }

    setTab(newTab);
    setStock(extraCards.concat(withWilds));
    setTop(carryTop);
    setTabCleared(0);
    setTabNum(n=>n+1);
  }

  function doTriggerOffer(label,rp){
    clearInterval(timerRef.current);
    const pool=PARTS.filter(p=>!rp.find(r=>r.id===p.id));
    setOffer({parts:shuffle(pool).slice(0,2),label});
  }

  function doResolveWild(wild){
    setWildFlash({wild,color:RCLR[wild.rarity]});
    setTimeout(()=>setWildFlash(null),2200);
    if(wild.id==="draft")   setFreeOp(v=>v+4);
    if(wild.id==="fuel")    setComboLocked(v=>v+3);
    if(wild.id==="line")    setComboDoubleNext(true);
    if(wild.id==="quali")   setCascade(v=>v+6);
    if(wild.id==="sc")      {setRivalFrozen(true);setTimeout(()=>setRivalFrozen(false),upgWildSCTime);setMsg("SAFETY CAR! RIVAL FROZEN!");}
    if(wild.id==="sector")  setCombo(c=>Math.min(c*2,c+8));
    if(wild.id==="vsc")     {setRivalLap(r=>Math.max(0,r-18));setMsg("VIRTUAL SC! RIVAL SET BACK!");}
    if(wild.id==="fastest") {setCombo(c=>Math.ceil(c*1.5));setFreeOp5(v=>v+5);}
    if(wild.id==="voss")    {setGhostLap(true);setFreeOp(v=>v+99);setMsg("ENZO'S LINE! DRIVE, MARCO.");}
    if(wild.id==="ghost")   {setGhostLap(true);setRivalFrozen(true);setMsg("GHOST LAP. COMBO UNBREAKABLE.");}
  }

  function doInstallPart(part,slotIndex){
    const scale=catScale(raceParts,part.cat);
    if(part.id==="turbo")        setRangeBuff(v=>v+Math.ceil(4*scale));
    if(part.id==="injector")     setFreeDraws(v=>v+Math.ceil(3*scale));
    if(part.id==="richmix")      setBonusCombo(v=>v+Math.ceil(5*scale));
    if(part.id==="soft")         setSuitBonus(v=>v+Math.ceil(6*scale));
    if(part.id==="blankets")     setFreeOp(v=>v+Math.ceil(3*scale));
    if(part.id==="downforce")    setRivalSlow(v=>v+0.15*scale);
    if(part.id==="hard")         {setRivalSlow(v=>v+0.2);setHardCompound(true);}
    if(part.id==="reserve")      setReserveTank(true);
    if(part.id==="octane")       setDoubleCredits(true);
    if(part.id==="displacement") {const e=makeDeck().slice(0,Math.ceil(2*scale));setStock(s=>e.concat(s));}
    if(part.id==="coldstart"){setTab(t=>{const nt=t.map(r=>r.slice());for(let ci=0;ci<nt[2].length;ci++){if(nt[2][ci]&&!nt[2][ci].removed){nt[2][ci]={...nt[2][ci],removed:true};break;}}return recompute(nt);});setTabCleared(c=>c+1);setLapCount(c=>c+1);}
    if(part.id==="diflock"){setTab(t=>{const nt=t.map(r=>r.slice());let f=false;for(let ri=0;ri<nt.length&&!f;ri++)for(let ci=0;ci<nt[ri].length&&!f;ci++)if(nt[ri][ci]&&!nt[ri][ci].removed&&!nt[ri][ci].available){nt[ri][ci]={...nt[ri][ci],available:true,faceUp:true};f=true;}return nt;});}
    if(part.id==="wetweather"&&stock.length>=5)setStock(s=>s.slice(2));
    setRaceParts(rp=>rp.concat([part]));
    const nt=totalParts+1;setTotalParts(nt);
    if(myPerks.indexOf("grease")<0&&nt>=20)setMyPerks(p=>p.concat(["grease"]));
    if(slotIndex!=null)setHeldParts(h=>{const n=h.slice();n[slotIndex]=null;return n;});
    const ss=scale<1?" ("+Math.round(scale*100)+"%)":"";
    setMsg(part.name+ss+" - "+part.emilio);
  }

  function acceptOffer(part,banner){
    setHeldParts(h=>{const n=h.slice();const e=n.indexOf(null);if(e>=0){n[e]=part;return n;}n[0]=n[1];n[1]=n[2];n[2]=part;return n;});
    setMsg(part.name+" HELD - TAP SLOT TO USE");
    setOffer(null);
    // If offer came from tableau clear, advance now that player has chosen
    if(banner&&banner.carryTop){
      advanceTableau(banner.carryTop,banner.carryCombo,banner.carryLapCount);
    }
  }

  function playCard(ri,ci){
    if(offer||wildFlash||lapBanner)return;
    const card=tab[ri][ci];
    if(!card||card.removed||!card.available)return;

    // TRUCK: group selection mode
    if(vRules.groupPlay){
      const alreadyIdx=truckGroup.findIndex(g=>g.ri===ri&&g.ci===ci);
      if(alreadyIdx>=0){
        setTruckGroup(g=>g.filter((_,i)=>i!==alreadyIdx));
        return;
      }
      if(truckGroup.length<2){
        setTruckGroup(g=>[...g,{ri,ci,card}]);
        setMsg("GROUP: "+[...truckGroup,{card}].map(g=>g.card.val+g.card.suit).join(" - ")+" ("+([...truckGroup].length+1)+"/3)");
        return;
      }
      // 3rd card — validate sequence and clear
      const group=[...truckGroup,{ri,ci,card}];
      let valid=true;
      for(let i=0;i<group.length-1;i++){
        if(!isAdj(group[i].card,group[i+1].card,1)&&!isAdj(group[i+1].card,group[i].card,1)){valid=false;break;}
      }
      if(!valid){setMsg("INVALID GROUP - Cards must be adjacent in sequence");setTruckGroup([]);return;}
      // Clear all 3
      let nt=tab.map((row,r)=>row.map((c,cj)=>{
        const inGroup=group.find(g=>g.ri===r&&g.ci===cj);
        return inGroup?{...c,removed:true}:c;
      }));
      setTab(recompute(nt));
      setTop(group[2].card);
      const nc3=combo+3;
      setCombo(nc3);
      setTruckGroup([]);
      const newLap3=lapCount+3;setLapCount(newLap3);
      const newTab3=tabCleared+3;setTabCleared(newTab3);
      setMsg("TRUCK GROUP CLEARED! +3 COMBO x"+nc3);
      if(newLap3>=format.distance){
        clearInterval(timerRef.current);clearTimeout(radioRef.current);
        const total=format.creditBase+Math.floor(nc3/3);
        setCredits(c=>c+total);setTrophies(t=>t+1);
        setRaceWinsThisSeason(w=>w+1);
        setMsg(format.label+" COMPLETE! +"+total+" CREDITS.");
        setTimeout(()=>{setShopMods(shuffle(MODS.filter(m=>carMods.indexOf(m.id)<0)).slice(0,3));generatePitOffer();setScreen("pitstop");},1400);
      }
      return;
    }
    const isFreeOp=freeOp>0||freeOp5>0;
    const seraJacket=activeBoons.indexOf("sera_jacket")>=0;
    const isFaceValid=(ghostLap||upgAcesFree||seraJacket||vRules.faceAlways)&&["J","Q","K","A"].indexOf(card.val)>=0||(upgAcesFree||vRules.aceAlways)&&card.val==="A";
    if(!isFreeOp&&!isFaceValid&&!isAdj(card,top,cardRange)){
      if(upg.driver>=1)setMsg("NOT ADJACENT. GOLD CARDS ARE VALID PLAYS.");
      else setMsg("NOT ADJACENT. DRAW OR USE A HELD PART.");
      return;
    }
    let nc=combo+1;
    if(hardCompound&&!ghostLap)nc=Math.max(1,Math.floor(nc/2));
    let nbc=bonusCombo,nsb=suitBonus,nfo=freeOp,nfo5=freeOp5,nrb=rangeBuff;
    if(nbc>0){nc++;nbc--;}
    if(nsb>0&&card.suit===top.suit){nc++;nsb--;}
    if(activeBoons.indexOf("ferri_attack")>=0&&combo>=5) nc++;
    // Sports car suit chain bonus
    if(vRules.suitChain&&card.suit===top.suit) nc++;
    if(activeBoons.indexOf("ferri_undercut")>=0&&rivalLap>lapCount) nc++;
    if(carMods.indexOf("stance")>=0&&card.suit===top.suit)nc++;
    if(comboDoubleNext){nc=nc*2;setComboDoubleNext(false);}
    if(nfo5>0)nfo5--;else if(nfo>0)nfo--;
    if(nrb>0)nrb--;
    setBonusCombo(nbc);setSuitBonus(nsb);setFreeOp(nfo);setFreeOp5(nfo5);setRangeBuff(nrb);
    if(upgComboFloor>0&&nc>1) nc=Math.max(nc,upgComboFloor);
    if(activeBoons.indexOf("hale_five")>=0&&nc>1) nc=Math.max(nc,2);
    setCombo(nc);
    if(activeBoons.indexOf("cord_saw")>=0&&card.val==="K") nc+=3;
    const np=myPerks.slice();
    if(np.indexOf("crowd")<0&&nc>=8){np.push("crowd");setMyPerks(np);}
    // emilio_weight: was this card face-down before we cleared it?
    if(activeBoons.indexOf("emilio_weight")>=0&&!card.faceUp) nc+=1;
    // Check for collectible hidden under this card
    if(card.collectible){
      const item=card.collectible;
      if(!collected.find(id=>id===item.id)){
        setCollected(c=>[...c,item.id]);
        setDiscovery(item);
        setTimeout(()=>setDiscovery(null),2500);
      }
    }
    let nt=tab.map((row,r)=>row.map((c,cj)=>r===ri&&cj===ci?{...c,removed:true}:c));
    const doFaceCascade=(upgCascadeFace||vRules.faceCascade)&&["J","Q","K","A"].indexOf(card.val)>=0&&ri>0;
    if((cascade>0||doFaceCascade)&&ri>0){const ar=ri-1,ac=Math.floor(ci/2);if(nt[ar]&&nt[ar][ac]&&!nt[ar][ac].removed){nt[ar][ac]={...nt[ar][ac],removed:true};if(cascade>0)setCascade(v=>v-1);}}
    // Check newly revealed cards for hidden collectibles
    const recomputed=recompute(nt);
    recomputed.forEach(row=>row.forEach(revCard=>{
      if(revCard&&revCard.faceUp&&!revCard.removed&&revCard.collectible){
        const item=revCard.collectible;
        setCollected(c=>{
          if(c.find(id=>id===item.id))return c;
          setDiscovery(item);
          setTimeout(()=>setDiscovery(null),2500);
          return [...c,item.id];
        });
      }
    }));
    setTab(recomputed);setTop(card);
    const newTabCleared=tabCleared+1;
    const newLapCount=lapCount+1;
    setTabCleared(newTabCleared);
    setLapCount(newLapCount);
    checkHaleAbilities(newLapCount);
    const cs=nc>=8?" CHAIN x"+nc+"!":nc>=5?" COMBO x"+nc:"";
    setMsg("LAP "+newLapCount+"/"+format.distance+"  "+card.val+card.suit+cs);

    // Race complete
    if(newLapCount>=format.distance){
      clearInterval(timerRef.current);clearTimeout(radioRef.current);
      const base=format.creditBase+Math.floor(nc/3);
      const earn=doubleCredits?base*2:base;
      const bonus=np.indexOf("crowd")>=0&&nc>=5?1:0;
      const total=earn+bonus;
      setCredits(c=>c+total);setTrophies(t=>t+1);
      setMsg(format.label+" COMPLETE! "+newLapCount+" LAPS. +"+total+" CREDITS.");
      if(rival.name==="L. FERRI") setBeatFerri(true);
      setRaceWinsThisSeason(w=>w+1);
      if(vehicle.id==="indy") setIndyRunCount(n=>n+1);
      setTimeout(()=>{
        setEmilioTrust(t=>Math.min(t+1,6));
        // Try story moment first — if one fires, it will transition to pitstop on dismiss
        const roll=Math.random();
        if(roll<0.60){
          const fixedM=STORY_MOMENTS.filter(m=>m.fixed&&seenStory.indexOf(m.id)<0&&seenStory.indexOf(m.fixed)>=0);
          const haleM=season>=3?STORY_MOMENTS.filter(m=>m.char==="HALE"&&seenStory.indexOf(m.id)<0):[];
          const finds=STORY_MOMENTS.filter(m=>m.type==="find"&&!m.fixed&&seenStory.indexOf(m.id)<0);
          const emilioD=STORY_MOMENTS.filter(m=>m.char==="EMILIO"&&m.type==="dialogue"&&seenStory.indexOf(m.id)<0&&m.trust<=emilioTrust+1);
          const pool=[...fixedM,...(haleM.length>0&&Math.random()<0.5?[haleM[0]]:[]),...finds,...emilioD];
          if(pool.length>0){
            const pick=pool[Math.floor(Math.random()*pool.length)];
            setStoryMoment(pick);
            setStoryPage(0);
            setScreen("story");
            return;
          }
        }
        setShopMods(shuffle(MODS.filter(m=>carMods.indexOf(m.id)<0)).slice(0,3));
        generatePitOffer();
        setScreen("pitstop");
      },1400);
      return;
    }

    // Tableau cleared — show banner, then offer, then next tableau
    if(newTabCleared>=18){
      const snap=raceParts.slice();
      setLapBanner({tableau:tabNum,totalTableaus:format.tableaus,lapCount:newLapCount,total:format.distance,combo:nc,topCard:card,carryTop:card,carryCombo:nc,carryLapCount:newLapCount});
      clearInterval(timerRef.current);
      setTimeout(()=>{
        doTriggerOffer("TABLEAU "+tabNum+" CLEARED",snap);
      },1800);
      return;
    }
    if(nc===5||nc===8){const snap=raceParts.slice();setTimeout(()=>doTriggerOffer("COMBO x"+nc,snap),300);}
  }

  function drawStock(){
    if(wildFlash||lapBanner||stock.length===0)return;
    const card=stock[0];
    if(card.isWild){setStock(s=>s.slice(1));doResolveWild(card.wildData);return;}
    const free=freeDraws>0;
    const seraFirst9=activeBoons.indexOf("sera_steady")>=0&&lapCount<9;
    const noReset=carMods.indexOf("light")>=0||free||myPerks.indexOf("latebraker")>=0||comboLocked>0||ghostLap||seraFirst9||vRules.comboNoReset;
    if(!noReset){
      setCombo(0);
      // Drawing costs you — rival gets a small boost unless you have chassis L3+
      if(carUpgrades.chassis<2) setRivalLap(r=>r+2);
    }
    if(free)setFreeDraws(v=>v-1);
    if(comboLocked>0)setComboLocked(v=>v-1);
    if(ghostLap||vRules.drawAddCombo)setCombo(c=>c+1);
    setTop(card);setStock(s=>s.slice(1));
    setStockDrawsThisSeason(d=>d+1);
    setMsg("DREW "+card.val+card.suit+(noReset?".":" COMBO RESET. RIVAL +2!"));
  }

  function buyMod(mod){
    if(credits<mod.cost||carMods.indexOf(mod.id)>=0)return;
    setCarMods(m=>m.concat([mod.id]));setCredits(c=>c-mod.cost);setMsg("INSTALLED: "+mod.name);
  }
  function nextRace(){
    if(raceNum>=4){setScreen("victory");return;}
    const next=raceNum+1;setRaceNum(next);startRace(next);
  }
  function startThe500(){
    setRaceNum(5);
    startRace(5,RACE_FORMATS[4]);
  }
  function newSeason(){
    const next=season+1;setSeason(next);setRaceNum(1);setCredits(3);setCarMods([]);
    setActiveBoons([]);setHaleSeasonSlow(0);
    setBoonOffer(null);setBonusCredits(0);
    setRaceWinsThisSeason(0);setStockDrawsThisSeason(0);
    setTruckGroup([]);
    if(next>1)setSeason1done(true);
    checkVehicleUnlocks();
    setScreen("vehicleselect");
  }

  function confirmVehicle(v){
    setVehicle(v);
    setScreen("title_ready");
  }

  // ── Story helpers ─────────────────────────────────────────────────────────
  function generateStoryMoment(){
    if(Math.random()>0.60)return; // 60% chance
    // Fixed moments first — check if prerequisites are met
    const fixed=STORY_MOMENTS.filter(m=>m.fixed&&seenStory.indexOf(m.id)<0&&seenStory.indexOf(m.fixed)>=0);
    if(fixed.length>0){
      setStoryMoment(fixed[0]);
      setStoryPage(0);
      return;
    }
    // Hale encounters when season >= 3
    if(season>=3){
      const haleStories=STORY_MOMENTS.filter(m=>m.char==="HALE"&&seenStory.indexOf(m.id)<0);
      if(haleStories.length>0&&Math.random()<0.5){
        setStoryMoment(haleStories[0]);
        setStoryPage(0);
        return;
      }
    }
    // Garage finds (not fixed)
    const finds=STORY_MOMENTS.filter(m=>m.type==="find"&&!m.fixed&&seenStory.indexOf(m.id)<0);
    // Emilio dialogue by trust tier
    const emilioDialogue=STORY_MOMENTS.filter(m=>m.char==="EMILIO"&&m.type==="dialogue"&&seenStory.indexOf(m.id)<0&&m.trust<=emilioTrust);
    const pool=[...finds,...emilioDialogue];
    if(pool.length===0)return;
    const pick=pool[Math.floor(Math.random()*pool.length)];
    setStoryMoment(pick);
    setStoryPage(0);
  }

  function advanceStory(){
    if(!storyMoment)return;
    const maxPage=storyMoment.type==="dialogue"?storyMoment.lines.length-1:0;
    if(storyPage<maxPage){
      setStoryPage(p=>p+1);
    } else {
      // Dismiss — mark seen, advance to pitstop
      setSeenStory(s=>[...s,storyMoment.id]);
      setStoryMoment(null);
      setStoryPage(0);
      setShopMods(shuffle(MODS.filter(m=>carMods.indexOf(m.id)<0)).slice(0,3));
      generatePitOffer();
      setScreen("pitstop");
    }
  }

  // ── Boon helpers ──────────────────────────────────────────────────────────
  function hasBoon(id){ return activeBoons.indexOf(id)>=0; }
  function hasUsedBoon(id){ return usedBoons.indexOf(id)>=0; }
  function markBoonUsed(id){ setUsedBoons(u=>u.indexOf(id)>=0?u:[...u,id]); }

  function generatePitOffer(){
    // 70% boon, 30% bonus credits
    if(Math.random()<0.30){
      setBoonOffer(null);
      setBonusCredits(4+Math.floor(Math.random()*5));
      return;
    }
    // Pick eligible character
    const eligible=[];
    Object.entries(BOONS).forEach(([key,char])=>{
      const cond=char.unlockCondition;
      const unlocked=cond==="always"||(cond==="beatFerri"&&beatFerri)||(cond==="season1done"&&season1done)||(cond==="season3"&&season>=3)||(cond==="fragments2"&&collected.length>=2);
      if(!unlocked)return;
      // Find boons not yet active this season
      const available=char.boons.filter(b=>activeBoons.indexOf(b.apply)<0);
      if(available.length>0)eligible.push({key,char,boon:available[Math.floor(Math.random()*available.length)]});
    });
    if(eligible.length===0){setBoonOffer(null);setBonusCredits(6);return;}
    const pick=eligible[Math.floor(Math.random()*eligible.length)];
    setBoonOffer({charKey:pick.key,char:pick.char,boon:pick.boon});
    setBonusCredits(0);
  }

  function acceptBoon(){
    if(!boonOffer)return;
    setActiveBoons(b=>[...b,boonOffer.boon.apply]);
    // Apply immediate effects
    if(boonOffer.boon.apply==="hale_word") setHaleSeasonSlow(0.2);
    setBoonOffer(null);
  }

  function declineBoon(){
    setBoonOffer(null);
    setBonusCredits(3); // consolation credits for declining
  }

  function claimBonusCredits(){
    setCredits(c=>c+bonusCredits);
    setBonusCredits(0);
  }

  function checkVehicleUnlocks(){
    const newUnlocked=[...unlockedVehicles];
    if(season>=2&&newUnlocked.indexOf("sports")<0)newUnlocked.push("sports");
    if(raceWinsThisSeason>=3&&newUnlocked.indexOf("rally")<0)newUnlocked.push("rally");
    if(stockDrawsThisSeason===0&&raceNum>=4&&newUnlocked.indexOf("truck")<0)newUnlocked.push("truck");
    if(collected.length>=5&&newUnlocked.indexOf("moto")<0)newUnlocked.push("moto");
    const indyUnlocked=seenStory.indexOf("g07")>=0&&Object.values(carUpgrades).some(v=>v>=4);
    if(indyUnlocked&&newUnlocked.indexOf("indy")<0)newUnlocked.push("indy");
    if(newUnlocked.length>unlockedVehicles.length)setUnlockedVehicles(newUnlocked);
  }

  function buyUpgrade(key){
    const lvl=carUpgrades[key];
    if(lvl>=4)return;
    const next=CAR_PARTS[key].levels[lvl+1];
    if(credits<next.credits||trophies<next.trophies)return;
    setCredits(c=>c-next.credits);
    setTrophies(t=>t-next.trophies);
    setCarUpgrades(u=>({...u,[key]:lvl+1}));
    setUpgradeMsg(CAR_PARTS[key].emilio[lvl+1]);
  }
  function canAfford(key){
    const lvl=carUpgrades[key];
    if(lvl>=4)return false;
    const next=CAR_PARTS[key].levels[lvl+1];
    return credits>=next.credits&&trophies>=next.trophies;
  }

  const SL="repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.008) 3px,rgba(255,255,255,0.008) 6px)";

  // ── Pre-computed values (before all screen blocks) ──────────────────────────
  const buffTags=[];
  if(rangeBuff>0)    buffTags.push({l:"RNG+2("+rangeBuff+")",c:GOLD});
  if(freeDraws>0)    buffTags.push({l:"FREE DRW("+freeDraws+")",c:"#4895ef"});
  if(bonusCombo>0)   buffTags.push({l:"+CMB("+bonusCombo+")",c:RED});
  if(suitBonus>0)    buffTags.push({l:"SUIT("+suitBonus+")",c:"#2dc653"});
  if(freeOp>0)       buffTags.push({l:"FREE("+freeOp+")",c:"#c9a84c"});
  if(freeOp5>0)      buffTags.push({l:"FAST("+freeOp5+")",c:"#f4a261"});
  if(cascade>0)      buffTags.push({l:"CASC("+cascade+")",c:"#9b5de5"});
  if(comboLocked>0)  buffTags.push({l:"LOCK("+comboLocked+")",c:GOLD});
  if(reserveTank)    buffTags.push({l:"RESERVE",c:RED});
  if(hardCompound)   buffTags.push({l:"HARD",c:"#aaa"});
  if(doubleCredits)  buffTags.push({l:"2X CR",c:"#2dc653"});
  if(rivalFrozen)    buffTags.push({l:"SC OUT",c:"#f4a261"});
  if(rivalSurge)     buffTags.push({l:"HALE SURGE!",c:RED});
  if(ghostLap)       buffTags.push({l:"GHOST",c:GOLD});
  if(activeBoons.indexOf("hale_advice")>=0)  buffTags.push({l:"HALE ADV",c:"#f4d03f"});
  if(activeBoons.indexOf("sera_jacket")>=0)  buffTags.push({l:"JACKET",c:"#4895ef"});
  if(activeBoons.indexOf("cord_logbook")>=0) buffTags.push({l:"LOGBOOK",c:"#9b5de5"});
  if(activeBoons.indexOf("hale_five")>=0)    buffTags.push({l:"X2 FLOOR",c:"#f4d03f"});
  if(activeBoons.indexOf("ferri_attack")>=0) buffTags.push({l:"ATTACK",c:"#e63946"});
  const garagePartKeys = ["engine","tires","aero","chassis","driver"];
  const garageActiveSyn = SYNERGIES.filter(s=>s.condition(carUpgrades));

  // ── TITLE ──────────────────────────────────────────────────────────────────
  if(screen==="title"){
    return(
      <div style={{minHeight:"100vh",background:DARK,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:PX,color:GOLD,padding:20,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.01) 2px,rgba(255,255,255,0.01) 4px)"}}>
        <div style={{fontSize:8,letterSpacing:4,color:"#444",marginBottom:10}}>INSERT COIN</div>
        <div style={{fontSize:28,letterSpacing:2,textShadow:"4px 4px 0 #8B0000,0 0 20px "+GOLD,lineHeight:1.4,textAlign:"center",marginBottom:4}}>GRAND</div>
        <div style={{fontSize:28,letterSpacing:2,textShadow:"4px 4px 0 #8B0000,0 0 20px "+GOLD,lineHeight:1.4,textAlign:"center",marginBottom:2}}>PRIX</div>
        <div style={{fontSize:20,letterSpacing:6,color:RED,textShadow:"3px 3px 0 #5a0000",marginBottom:6}}>ROUGE</div>
        <div style={{fontSize:7,color:"#555",marginBottom:28}}>1974  C  VOSS RACING</div>
        <div style={{border:"2px solid #333",borderRadius:4,padding:"16px 20px",marginBottom:16,maxWidth:300,textAlign:"center",background:"#0a0a0a"}}>
          <div style={{color:"#aaa",fontSize:7,lineHeight:2.2}}>
            {"MARCO VOSS - ROOKIE"}<br/>{"FATHER'S CHAMPIONSHIP"}<br/>{"WAS STOLEN."}<br/>
            <span style={{color:GOLD}}>{"FIND THE TRUTH."}</span>
          </div>
        </div>
        <div style={{marginBottom:16,width:"100%",maxWidth:300}}>
          <div style={{fontSize:6,color:"#555",marginBottom:8,letterSpacing:2}}>SEASON {season} RACE FORMATS</div>
          {RACE_FORMATS.slice(0,4).map((f,i)=>(
            <div key={f.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 8px",marginBottom:3,background:i===raceNum-1?"#1a1a0a":"#0d0d0d",border:"1px solid "+(i===raceNum-1?GOLD+"44":"#1a1a1a")}}>
              <div style={{fontSize:6,color:i===raceNum-1?GOLD:"#555"}}>{"R"+(i+1)+" "+f.label}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <div style={{fontSize:6,color:["#2dc653","#f4a261","#e63946","#9b5de5"][i]}}>{["LEARN","HARD","BRUTAL","UPGRADE REQ"][i]}</div>
                <div style={{fontSize:6,color:"#555"}}>{f.distance+" LAPS"}</div>
              </div>
            </div>
          ))}
        </div>
        {myPerks.length>0&&(
          <div style={{marginBottom:14,display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",maxWidth:300}}>
            {myPerks.map(pid=>{const p=PERKS.find(x=>x.id===pid);return p?<div key={pid} style={{border:"1px solid "+GOLD+"44",borderRadius:2,padding:"4px 8px",fontSize:6,color:GOLD}}>{p.name}</div>:null;})}
          </div>
        )}
        <button onClick={()=>{checkVehicleUnlocks();setScreen("vehicleselect");}} style={{background:RED,color:"#fff",border:"none",padding:"14px 32px",fontSize:10,fontFamily:PX,cursor:"pointer",letterSpacing:2,boxShadow:"4px 4px 0 #8B0000",marginBottom:8}}>
          START ENGINE
        </button>
        <div style={{fontSize:6,color:"#444",marginTop:8}}>{"SEASON "+season}</div>
      </div>
    );
  }

  // ── RACE ───────────────────────────────────────────────────────────────────
  if(screen==="race"){
    return(
      <div style={{minHeight:"100vh",background:"#0a0808",color:GOLD,fontFamily:PX,padding:"10px 8px",display:"flex",flexDirection:"column",alignItems:"center",backgroundImage:SL}}>

        {/* Lap banner overlay */}
        {lapBanner&&(
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.95)",zIndex:250,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{fontSize:7,color:"#555",letterSpacing:4,marginBottom:8}}>TABLEAU CLEARED</div>
            <div style={{fontSize:18,color:GOLD,textShadow:"3px 3px 0 #8B6914",marginBottom:12}}>{"T"+lapBanner.tableau+"/"+lapBanner.totalTableaus}</div>
            <div style={{fontSize:9,color:"#2dc653",marginBottom:6}}>{"LAP "+lapBanner.lapCount+" / "+lapBanner.total}</div>
            {lapBanner.combo>1&&<div style={{fontSize:12,color:lapBanner.combo>=8?RED:GOLD,marginBottom:6,textShadow:"0 0 10px currentColor"}}>{"COMBO x"+lapBanner.combo+" CARRIES"}</div>}
            <div style={{fontSize:7,color:"#555",marginTop:4}}>NEXT TOP CARD: {lapBanner.topCard.val}{lapBanner.topCard.suit}</div>
          </div>
        )}

        {/* Wild card flash */}
        {wildFlash&&(
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.93)",zIndex:300,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{fontSize:7,color:wildFlash.color,letterSpacing:4,marginBottom:8,fontFamily:PX}}>{wildFlash.wild.rarity}</div>
            <div style={{fontSize:14,color:wildFlash.color,fontFamily:PX,textShadow:"0 0 20px "+wildFlash.color,marginBottom:8,textAlign:"center"}}>{wildFlash.wild.name}</div>
            <div style={{fontSize:7,color:"#888",fontFamily:"Georgia,serif",fontStyle:"italic",marginBottom:12,textAlign:"center",maxWidth:260,lineHeight:1.8}}>{wildFlash.wild.flavor}</div>
            <div style={{fontSize:7,color:wildFlash.color,fontFamily:PX,textAlign:"center",lineHeight:1.8,border:"1px solid "+wildFlash.color+"44",padding:"8px 16px"}}>{wildFlash.wild.effect}</div>
          </div>
        )}

        {/* Parts offer */}
        {offer&&(
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.96)",zIndex:9999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16,fontFamily:PX}}>
            <div style={{fontSize:7,color:"#555",marginBottom:6,letterSpacing:3}}>-- PIT RADIO --</div>
            <div style={{fontSize:11,color:GOLD,marginBottom:4,textShadow:"2px 2px 0 #8B6914"}}>PARTS OFFER</div>
            <div style={{fontSize:7,color:"#666",marginBottom:20}}>{offer.label}</div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",maxWidth:340,marginBottom:16}}>
              {offer.parts.map(part=>{
                const sc=catScale(raceParts,part.cat);
                return(
                  <div key={part.id} onClick={()=>acceptOffer(part,lapBanner)} style={{background:"#0d0d0d",border:"2px solid "+CCAT[part.cat],padding:"14px 12px",width:130,cursor:"pointer",opacity:sc<1?0.7:1,boxShadow:"3px 3px 0 "+CCAT[part.cat]+"44"}}>
                    <div style={{fontSize:9,color:GOLD,marginBottom:6,lineHeight:1.6}}>{part.name}</div>
                    <div style={{fontSize:6,color:"#888",marginBottom:8,lineHeight:1.8}}>{part.effect}</div>
                    <div style={{fontSize:6,color:CCAT[part.cat],fontWeight:"bold"}}>{part.cat}</div>
                    {sc<1&&<div style={{fontSize:6,color:GOLD,marginTop:4}}>{"!! "+Math.round(sc*100)+"%"}</div>}
                  </div>
                );
              })}
            </div>
            <div style={{fontSize:6,color:"#444"}}>TAP CARD TO HOLD  |  RACE PAUSED</div>
          </div>
        )}

        {/* Collectible discovery banner */}
        {discovery&&(
          <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",zIndex:150,background:"#0d0a00",border:"2px solid #c9a84c",padding:"10px 18px",maxWidth:320,boxShadow:"0 0 20px #c9a84c44,4px 4px 0 #000",textAlign:"center"}}>
            <div style={{fontSize:6,color:"#c9a84c",letterSpacing:3,marginBottom:4,fontFamily:PX}}>FOUND</div>
            <div style={{fontSize:8,color:GOLD,fontFamily:PX,marginBottom:4,lineHeight:1.6}}>{discovery.name}</div>
            <div style={{fontSize:6,color:"#888",fontFamily:"Georgia,serif",fontStyle:"italic",lineHeight:1.6}}>{discovery.flavor}</div>
            <div style={{marginTop:6,fontSize:5,color:"#555",fontFamily:PX}}>{"COLLECTION: "+collected.length+"/40"}</div>
          </div>
        )}

        {/* Hale warning banner */}
        {haleWarning&&(
          <div style={{width:"100%",maxWidth:500,background:RED+"22",border:"1px solid "+RED,padding:"6px 12px",marginBottom:6,textAlign:"center",fontSize:7,color:RED,letterSpacing:1}}>
            {haleWarning}
          </div>
        )}

        {/* Header */}
        <div style={{width:"100%",maxWidth:500,marginBottom:6,background:"#111",border:"1px solid #2a2a2a",padding:"6px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:6,color:vehicle.color}}>{vehicle.icon+" "+format.label}</div>
          <div style={{fontSize:7,color:GOLD,textShadow:"1px 1px 0 #8B6914"}}>GRAND PRIX ROUGE</div>
          <div style={{display:"flex",gap:10,fontSize:7}}>
            <span style={{color:GOLD}}>{"T:"+trophies}</span>
            <span style={{color:"#2dc653"}}>{"C:"+credits}</span>
          </div>
        </div>

        {/* Lap counter — the headline stat */}
        <div style={{width:"100%",maxWidth:500,marginBottom:6,background:"#0d0d0d",border:"1px solid #1a1a1a",padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:6,color:"#555",marginBottom:3,letterSpacing:2}}>LAP</div>
            <div style={{fontSize:20,color:GOLD,textShadow:"2px 2px 0 #8B6914",lineHeight:1}}>
              {lapCount}<span style={{fontSize:9,color:"#555"}}>{"/"+ format.distance}</span>
            </div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:6,color:"#555",marginBottom:3,letterSpacing:2}}>TABLEAU</div>
            <div style={{fontSize:12,color:"#888"}}>{tabNum}<span style={{fontSize:8,color:"#444"}}>{"/"+ format.tableaus}</span></div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:6,color:"#555",marginBottom:3,letterSpacing:2}}>IN TAB</div>
            <div style={{fontSize:12,color:"#aaa"}}>{tabCleared}<span style={{fontSize:8,color:"#444"}}>/18</span></div>
          </div>
        </div>

        {/* Track */}
        <div style={{width:"100%",maxWidth:500,marginBottom:6,background:"#0d0d0d",border:"1px solid #1a1a1a",padding:"6px 8px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:6,color:"#555"}}>
            <span style={{color:GOLD}}>{"MARCO  "+lapCount+" LAPS"}</span>
            <span style={{color:rivalSurge?RED:rival.color}}>{rival.name+"  "+rivalLap+" LAPS"+(rivalSurge?" !SURGE!":"")}</span>
          </div>
          <MonacoTrack playerLap={lapCount} rivalLap={rivalLap} totalLaps={rivalTarget} rivalColor={rival.color} rivalFrozen={rivalFrozen}/>
        </div>

        {buffTags.length>0&&(
          <div style={{display:"flex",gap:4,marginBottom:5,flexWrap:"wrap",justifyContent:"center"}}>
            {buffTags.map((t,i)=><span key={i} style={{border:"1px solid "+t.c+"55",padding:"2px 6px",fontSize:5,color:t.c,background:"#111"}}>{t.l}</span>)}
          </div>
        )}

        {offer&&<div style={{width:"100%",maxWidth:500,marginBottom:4,background:GOLD,padding:"6px",fontSize:7,color:DARK,textAlign:"center",fontFamily:PX,cursor:"pointer"}} onClick={()=>window.scrollTo(0,0)}>PARTS OFFER WAITING — TAP HERE</div>}
        <div style={{width:"100%",maxWidth:500,marginBottom:6,background:"#0d0d0d",border:"1px solid #1a1a1a",padding:"5px 10px",fontSize:6,color:"#ccc",textAlign:"center",minHeight:20,letterSpacing:1}}>
          {vRules.groupPlay&&truckGroup.length>0
            ? "GROUP: "+truckGroup.map(g=>g.card.val+g.card.suit).join(" - ")+" ("+truckGroup.length+"/3) — TAP 3RD TO CONFIRM"
            : vRules.groupPlay&&truckGroup.length===0
            ? "SELECT 3 ADJACENT CARDS TO FORM A GROUP"
            : msg||"PLAY A CARD +/-1 RANK FROM TOP CARD"}
        </div>

        {/* Tableau */}
        <div style={{marginBottom:8}}>
          {tab.map((row,ri)=>(
            <div key={ri} style={{display:"flex",justifyContent:"center",gap:4,marginBottom:4}}>
              {row.map((card,ci)=>{
                if(!card||card.removed)return<div key={ci} style={{width:46,height:64,flexShrink:0}}/>;
                const inTruckGroup=vRules.groupPlay&&truckGroup.find(g=>g.ri===ri&&g.ci===ci);
                const canPlay=card.available&&(vRules.groupPlay||isAdj(card,top,cardRange)||freeOp>0||freeOp5>0||(ghostLap&&["J","Q","K","A"].indexOf(card.val)>=0));
                if(!card.faceUp)return<CardBack key={ci} hasSecret={!!card.collectible}/>;
                return<CardFace key={ci} card={card} onClick={()=>playCard(ri,ci)} hi={canPlay||!!inTruckGroup} dim={!card.available&&!vRules.groupPlay}/>;
              })}
            </div>
          ))}
        </div>

        {/* Stock + top + combo */}
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:10}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:6,color:"#444",marginBottom:4,letterSpacing:1}}>{"STOCK("+stock.length+")"}</div>
            <div onClick={drawStock} style={{cursor:"pointer"}}>
              {stock.length>0?(stock[0]&&stock[0].isWild?<WildBack wild={stock[0].wildData}/>:<CardBack/>):<div style={{width:46,height:64,border:"2px dashed #2a2a2a",borderRadius:3}}/>}
            </div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:6,color:"#444",marginBottom:4,letterSpacing:1}}>TOP CARD</div>
            {top&&<CardFace card={top}/>}
          </div>
          <ComboMeter combo={combo}/>
        </div>

        {/* Held parts */}
        <div style={{width:"100%",maxWidth:500,marginBottom:8}}>
          <div style={{fontSize:6,color:"#555",marginBottom:6,letterSpacing:2}}>HELD PARTS</div>
          <div style={{display:"flex",gap:6}}>
            {heldParts.map((part,i)=>(
              <HeldSlot key={i} part={part} index={i} onUse={()=>{if(part)doInstallPart(part,i);}}/>
            ))}
          </div>
        </div>

        {raceParts.length>0&&(
          <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}}>
            {raceParts.map((p,i)=><div key={i} style={{border:"1px solid "+CCAT[p.cat]+"55",padding:"2px 6px",fontSize:5,color:CCAT[p.cat],background:"#0d0d0d"}}>{p.name}</div>)}
          </div>
        )}
      </div>
    );
  }

  // ── VEHICLE SELECT ────────────────────────────────────────────────────────
  if(screen==="vehicleselect"){
    return(
      <div style={{minHeight:"100vh",background:DARK,color:GOLD,fontFamily:PX,padding:"18px 14px",display:"flex",flexDirection:"column",alignItems:"center",backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.008) 3px,rgba(255,255,255,0.008) 6px)"}}>
        <div style={{fontSize:6,color:"#555",letterSpacing:4,marginBottom:6}}>SEASON {season}</div>
        <div style={{fontSize:14,letterSpacing:2,marginBottom:4,textShadow:"3px 3px 0 #8B6914"}}>CHOOSE YOUR VEHICLE</div>
        <div style={{fontSize:6,color:"#555",marginBottom:20,letterSpacing:2}}>COMMIT FOR THE WHOLE SEASON</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%",maxWidth:440,marginBottom:20}}>
          {VEHICLES.map(v=>{
            const locked=unlockedVehicles.indexOf(v.id)<0;
            const selected=vehicle.id===v.id;
            return(
              <div key={v.id} onClick={()=>{if(!locked)setVehicle(v);}} style={{background:selected?"#0d0a00":locked?"#080808":"#0d0d0d",border:"2px solid "+(selected?v.color:locked?"#1a1a1a":"#2a2a2a"),padding:"12px 14px",cursor:locked?"default":"pointer",opacity:locked?0.4:1,boxShadow:selected?"0 0 10px "+v.color+"44":"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{fontSize:9,color:locked?"#333":v.color,fontFamily:PX}}>{locked?"????? ?????":v.name}</div>
                  <div style={{fontSize:5,color:locked?"#333":"#555",fontFamily:PX}}>{locked?v.unlockDesc:v.icon}</div>
                </div>
                {!locked&&<div style={{fontSize:6,color:"#888",lineHeight:1.6,marginBottom:6}}>{v.mechanic}</div>}
                {!locked&&<div style={{fontSize:6,color:"#555",fontFamily:"Georgia,serif",fontStyle:"italic"}}>"{v.emilio}"</div>}
                {locked&&<div style={{fontSize:6,color:"#333",lineHeight:1.6}}>LOCKED — {v.unlockDesc}</div>}
              </div>
            );
          })}
        </div>
        <button onClick={()=>{setScreen("title_ready");}} style={{background:vehicle.color,color:DARK,border:"none",padding:"13px 36px",fontSize:9,fontFamily:PX,cursor:"pointer",letterSpacing:2,boxShadow:"4px 4px 0 #000"}}>
          {"DRIVE THE "+vehicle.name}
        </button>
        <div style={{marginTop:10,fontSize:6,color:"#555",fontFamily:"Georgia,serif",fontStyle:"italic",maxWidth:300,textAlign:"center"}}>
          {vehicle.confirm}
        </div>
      </div>
    );
  }

  // ── TITLE READY (after vehicle select) ─────────────────────────────────────
  if(screen==="title_ready"){
    return(
      <div style={{minHeight:"100vh",background:DARK,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:PX,color:GOLD,padding:20,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.01) 2px,rgba(255,255,255,0.01) 4px)"}}>
        <div style={{fontSize:8,color:"#555",letterSpacing:4,marginBottom:10}}>SEASON {season}</div>
        <div style={{fontSize:18,letterSpacing:2,textShadow:"4px 4px 0 #8B0000,0 0 20px "+GOLD,lineHeight:1.4,textAlign:"center",marginBottom:6}}>{vehicle.name}</div>
        <div style={{fontSize:7,color:vehicle.color,letterSpacing:2,marginBottom:20}}>{vehicle.icon}</div>
        <div style={{fontSize:7,color:"#888",fontFamily:"Georgia,serif",fontStyle:"italic",marginBottom:28,maxWidth:280,textAlign:"center",lineHeight:1.8}}>"{vehicle.confirm}"</div>
        <button onClick={()=>startRace(raceNum)} style={{background:RED,color:"#fff",border:"none",padding:"14px 32px",fontSize:10,fontFamily:PX,cursor:"pointer",letterSpacing:2,boxShadow:"4px 4px 0 #8B0000"}}>
          START ENGINE
        </button>
      </div>
    );
  }

  // ── STORY MOMENT ──────────────────────────────────────────────────────────
  if(screen==="story"){
    return(
      <div style={{minHeight:"100vh",background:"#050505",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:PX,padding:24,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.006) 3px,rgba(255,255,255,0.006) 6px)"}} onClick={advanceStory}>
        {storyMoment&&storyMoment.type==="dialogue"&&(
          <div style={{maxWidth:400,width:"100%"}}>
            <div style={{fontSize:6,color:storyMoment.color,letterSpacing:4,marginBottom:16,textAlign:"center"}}>{storyMoment.char}</div>
            {storyMoment.lines.slice(0,storyPage+1).map((line,i)=>(
              <div key={i} style={{marginBottom:14,opacity:i<storyPage?0.45:1,transition:"opacity 0.3s"}}>
                <div style={{fontSize:6,color:line.speaker==="EMILIO"?"#c9a84c":line.speaker==="HALE"?"#f4d03f":line.speaker==="MARCO"?"#aaa":"#9b5de5",letterSpacing:2,marginBottom:5}}>{line.speaker}</div>
                <div style={{fontSize:8,color:"#ddd",fontFamily:"Georgia,serif",fontStyle:"italic",lineHeight:1.9}}>"{line.text}"</div>
              </div>
            ))}
            <div style={{marginTop:24,fontSize:6,color:"#333",textAlign:"center",letterSpacing:2}}>
              {storyPage<storyMoment.lines.length-1?"TAP TO CONTINUE":"TAP TO CONTINUE"}
            </div>
            <div style={{marginTop:8,display:"flex",justifyContent:"center",gap:6}}>
              {storyMoment.lines.map((_,i)=>(
                <div key={i} style={{width:6,height:6,borderRadius:3,background:i<=storyPage?storyMoment.color:"#222"}}/>
              ))}
            </div>
          </div>
        )}
        {storyMoment&&storyMoment.type==="find"&&(
          <div style={{maxWidth:380,width:"100%"}}>
            <div style={{fontSize:6,color:storyMoment.color,letterSpacing:4,marginBottom:8,textAlign:"center"}}>FOUND IN THE GARAGE</div>
            <div style={{background:"#0a0800",border:"2px solid "+storyMoment.color,padding:"20px",boxShadow:"0 0 20px "+storyMoment.color+"33,6px 6px 0 #000",marginBottom:20}}>
              <div style={{fontSize:7,color:storyMoment.color,letterSpacing:2,marginBottom:12,textAlign:"center"}}>{storyMoment.title}</div>
              <div style={{fontSize:7,color:"#aaa",fontFamily:"Georgia,serif",fontStyle:"italic",lineHeight:2.0}}>{storyMoment.desc}</div>
            </div>
            <div style={{fontSize:6,color:"#333",textAlign:"center",letterSpacing:2}}>TAP TO CONTINUE</div>
          </div>
        )}
      </div>
    );
  }

  // ── PIT STOP ───────────────────────────────────────────────────────────────
  if(screen==="pitstop"){
    return(
      <div style={{minHeight:"100vh",background:DARK,color:GOLD,fontFamily:PX,padding:"20px 16px",display:"flex",flexDirection:"column",alignItems:"center",backgroundImage:SL}}>
        <div style={{fontSize:6,color:"#555",marginBottom:4,letterSpacing:4}}>{format.label+" COMPLETE"}</div>
        <div style={{fontSize:14,letterSpacing:2,marginBottom:2,textShadow:"3px 3px 0 #8B6914"}}>PIT STOP</div>
        <div style={{fontSize:7,color:"#555",marginBottom:4}}>{lapCount+" LAPS COMPLETED"}</div>
        <div style={{fontSize:6,color:"#555",marginBottom:18,letterSpacing:2}}>{"SEASON "+season}</div>
        <div style={{background:"#0d0d0d",border:"2px solid #2a2a2a",padding:"14px 16px",maxWidth:380,width:"100%",marginBottom:18,boxShadow:"4px 4px 0 #000"}}>
          <div style={{fontSize:6,color:"#555",marginBottom:8,letterSpacing:2}}>EMILIO - CHIEF ENGINEER</div>
          <div style={{fontSize:7,color:"#aaa",lineHeight:2.2,whiteSpace:"pre-line",fontFamily:"Georgia,serif",fontStyle:"italic"}}>
            {'"'+EMILIO_Q[Math.min(raceNum-1,EMILIO_Q.length-1)]+'"'}
          </div>
        </div>
        <div style={{display:"flex",gap:24,marginBottom:16}}>
          <div style={{textAlign:"center",background:"#0d0d0d",border:"1px solid #222",padding:"10px 16px",boxShadow:"3px 3px 0 #000"}}>
            <div style={{fontSize:14,color:GOLD}}>{"T:"+trophies}</div>
            <div style={{fontSize:6,color:"#555",marginTop:4}}>TROPHIES</div>
          </div>
          <div style={{textAlign:"center",background:"#0d0d0d",border:"1px solid #222",padding:"10px 16px",boxShadow:"3px 3px 0 #000"}}>
            <div style={{fontSize:14,color:"#2dc653"}}>{"C:"+credits}</div>
            <div style={{fontSize:6,color:"#555",marginTop:4}}>CREDITS</div>
          </div>
        </div>
        {carMods.length>0&&(
          <div style={{marginBottom:12,display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center",maxWidth:420}}>
            {carMods.map(mid=>{const m=MODS.find(x=>x.id===mid);return m?<div key={mid} style={{border:"1px solid "+GOLD+"33",padding:"3px 8px",fontSize:6,color:GOLD,background:"#0d0d0d"}}>{m.name}</div>:null;})}
          </div>
        )}
        {/* Boon offer or bonus credits */}
        {(boonOffer||bonusCredits>0)&&(
          <div style={{width:"100%",maxWidth:440,marginBottom:18}}>
            {boonOffer?(
              <div style={{background:"#0d0d0d",border:"2px solid "+boonOffer.char.color,padding:"14px 16px",boxShadow:"0 0 12px "+boonOffer.char.color+"33,4px 4px 0 #000"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:8,color:boonOffer.char.color,fontFamily:PX}}>{boonOffer.char.name}</div>
                  <div style={{fontSize:5,color:"#555",fontFamily:PX}}>{boonOffer.char.title}</div>
                </div>
                <div style={{fontSize:6,color:"#888",fontFamily:"Georgia,serif",fontStyle:"italic",lineHeight:1.8,marginBottom:10}}>"{boonOffer.boon.quote}"</div>
                <div style={{fontSize:7,color:boonOffer.char.color,fontFamily:PX,marginBottom:4}}>{boonOffer.boon.name}</div>
                <div style={{fontSize:6,color:"#888",lineHeight:1.6,marginBottom:12}}>{boonOffer.boon.effect}</div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={acceptBoon} style={{flex:1,background:boonOffer.char.color,color:DARK,border:"none",padding:"8px 0",fontSize:7,fontFamily:PX,cursor:"pointer",boxShadow:"3px 3px 0 #000"}}>ACCEPT</button>
                  <button onClick={declineBoon} style={{flex:1,background:"#111",color:"#555",border:"1px solid #333",padding:"8px 0",fontSize:7,fontFamily:PX,cursor:"pointer"}}>DECLINE (+C3)</button>
                </div>
              </div>
            ):(
              <div style={{background:"#0d0d0d",border:"1px solid #2dc65344",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:7,color:"#2dc653",fontFamily:PX,marginBottom:4}}>BONUS CREDITS</div>
                  <div style={{fontSize:6,color:"#888"}}>No boon available this stop.</div>
                </div>
                <button onClick={claimBonusCredits} style={{background:"#2dc653",color:DARK,border:"none",padding:"8px 14px",fontSize:8,fontFamily:PX,cursor:"pointer",boxShadow:"3px 3px 0 #000"}}>+C{bonusCredits}</button>
              </div>
            )}
          </div>
        )}

        {/* Active boons */}
        {activeBoons.length>0&&(
          <div style={{width:"100%",maxWidth:440,marginBottom:14}}>
            <div style={{fontSize:5,color:"#555",letterSpacing:3,marginBottom:6}}>-- ACTIVE BOONS --</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {activeBoons.map((bid,i)=>{
                let name="",color="#888";
                Object.values(BOONS).forEach(char=>{
                  const b=char.boons.find(b=>b.apply===bid);
                  if(b){name=b.name;color=char.color;}
                });
                return name?<div key={i} style={{border:"1px solid "+color+"44",padding:"3px 8px",fontSize:5,color:color,background:"#0d0d0d",fontFamily:PX}}>{name}</div>:null;
              })}
            </div>
          </div>
        )}

        <div style={{fontSize:7,letterSpacing:3,color:"#555",marginBottom:10}}>-- MOD SHOP --</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%",maxWidth:420,marginBottom:20}}>
          {shopMods.map(mod=>{
            const owned=carMods.indexOf(mod.id)>=0;
            const afford=credits>=mod.cost;
            return(
              <div key={mod.id} style={{background:"#0d0d0d",border:"2px solid "+(owned?"#2dc653":afford?GOLD+"44":"#1a1a1a"),padding:"10px 12px",display:"flex",alignItems:"center",gap:12,opacity:owned||!afford?0.5:1}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:8,color:GOLD,marginBottom:4}}>{mod.name}</div>
                  <div style={{fontSize:6,color:"#666",lineHeight:1.8}}>{mod.effect}</div>
                </div>
                <button onClick={()=>buyMod(mod)} disabled={owned||!afford} style={{background:owned?"transparent":afford?GOLD:"#111",color:owned?"#2dc653":afford?DARK:"#333",border:"none",padding:"6px 10px",fontSize:7,fontFamily:PX,cursor:owned||!afford?"default":"pointer"}}>
                  {owned?"OK":"C"+mod.cost}
                </button>
              </div>
            );
          })}
        </div>
        {myPerks.length>0&&(
          <div style={{marginBottom:16,width:"100%",maxWidth:420}}>
            <div style={{fontSize:6,letterSpacing:3,color:"#444",marginBottom:8}}>-- CAREER PERKS --</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {myPerks.map(pid=>{const p=PERKS.find(x=>x.id===pid);return p?<div key={pid} style={{border:"1px solid "+GOLD+"33",padding:"4px 8px",fontSize:6,color:GOLD,background:"#0d0d0d"}}>{p.name}</div>:null;})}
            </div>
          </div>
        )}
        {msg&&<div style={{color:"#2dc653",fontSize:7,marginBottom:12,textAlign:"center",lineHeight:1.8}}>{msg}</div>}
        <button onClick={nextRace} style={{background:RED,color:"#fff",border:"none",padding:"13px 32px",fontSize:9,fontFamily:PX,cursor:"pointer",letterSpacing:2,boxShadow:"4px 4px 0 #8B0000"}}>
          {raceNum>=4?"SEASON COMPLETE":"NEXT RACE"}
        </button>
      </div>
    );
  }

  // ── GAME OVER ──────────────────────────────────────────────────────────────
  if(screen==="gameover"){
    return(
      <div style={{minHeight:"100vh",background:DARK,color:RED,fontFamily:PX,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{fontSize:22,letterSpacing:2,textShadow:"4px 4px 0 #8B0000",marginBottom:6}}>RETIRED</div>
        <div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>{"LAP "+lapCount+" / "+format.distance}</div>
        <div style={{fontSize:7,color:"#444",marginBottom:20}}>{"RACE "+raceNum+" - "+format.label+"  SEASON "+season}</div>
        <div style={{color:"#666",fontSize:7,marginBottom:24,textAlign:"center",maxWidth:280,lineHeight:2.2}}>{"\"WE'LL GET THEM NEXT SEASON, MARCO.\""}</div>
        {myPerks.length>0&&(
          <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",marginBottom:24,maxWidth:340}}>
            {myPerks.map(pid=>{const p=PERKS.find(x=>x.id===pid);return p?<div key={pid} style={{border:"1px solid "+GOLD+"22",padding:"3px 8px",fontSize:6,color:GOLD,background:"#0d0d0d"}}>{p.name}</div>:null;})}
          </div>
        )}
        <button onClick={newSeason} style={{background:RED,color:"#fff",border:"none",padding:"13px 32px",fontSize:9,fontFamily:PX,cursor:"pointer",letterSpacing:2,boxShadow:"4px 4px 0 #8B0000"}}>NEW SEASON</button>
      </div>
    );
  }

  // ── VICTORY ────────────────────────────────────────────────────────────────
  if(screen==="victory"){
    return(
      <div style={{minHeight:"100vh",background:DARK,color:GOLD,fontFamily:PX,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{fontSize:22,letterSpacing:2,textShadow:"4px 4px 0 #8B6914,0 0 30px "+GOLD,marginBottom:4}}>CHAMPION</div>
        <div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:20}}>{"SEASON "+season+" COMPLETE"}</div>
        <div style={{fontSize:7,color:"#aaa",marginBottom:28,textAlign:"center",maxWidth:300,lineHeight:2.2}}>
          {"EMILIO IS WEEPING."}<br/>{"EVEN FERRI GIVES YOU A NOD."}<br/>
          <span style={{color:"#666"}}>{"\"NOT BAD, MARCO.\""}</span>
        </div>
        {myPerks.length>0&&(
          <div style={{marginBottom:28,width:"100%",maxWidth:380}}>
            <div style={{fontSize:6,letterSpacing:3,color:"#444",marginBottom:8,textAlign:"center"}}>-- CAREER PERKS --</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
              {myPerks.map(pid=>{const p=PERKS.find(x=>x.id===pid);return p?<div key={pid} style={{border:"1px solid "+GOLD+"44",padding:"4px 8px",fontSize:6,color:GOLD,background:"#0d0d0d"}}>{p.name}</div>:null;})}
            </div>
          </div>
        )}
        <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
          <button onClick={startThe500} style={{background:RED,color:"#fff",border:"none",padding:"13px 28px",fontSize:8,fontFamily:PX,cursor:"pointer",letterSpacing:1,boxShadow:"4px 4px 0 #8B0000"}}>THE 500</button>
          <button onClick={()=>setScreen("garage")} style={{background:GOLD,color:DARK,border:"none",padding:"13px 28px",fontSize:8,fontFamily:PX,cursor:"pointer",letterSpacing:1,boxShadow:"4px 4px 0 #8B6914"}}>GARAGE</button>
        </div>
      </div>
    );
  }


  // ── GARAGE ─────────────────────────────────────────────────────────────────
  if(screen==="garage"){
    return(
      <div style={{minHeight:"100vh",background:DARK,color:GOLD,fontFamily:PX,padding:"18px 14px",display:"flex",flexDirection:"column",alignItems:"center",backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.008) 3px,rgba(255,255,255,0.008) 6px)"}}>
        <div style={{fontSize:6,color:"#555",letterSpacing:4,marginBottom:4}}>BETWEEN SEASONS</div>
        <div style={{fontSize:16,letterSpacing:2,marginBottom:4,textShadow:"3px 3px 0 #8B6914"}}>THE GARAGE</div>
        <div style={{fontSize:6,color:"#555",marginBottom:16,letterSpacing:2}}>{"SEASON "+(season)+" COMPLETE"}</div>

        {/* Currency */}
        <div style={{display:"flex",gap:20,marginBottom:16}}>
          <div style={{textAlign:"center",background:"#0d0d0d",border:"1px solid #222",padding:"8px 14px",boxShadow:"3px 3px 0 #000"}}>
            <div style={{fontSize:13,color:GOLD}}>{"C:"+credits}</div>
            <div style={{fontSize:5,color:"#555",marginTop:3}}>CREDITS</div>
          </div>
          <div style={{textAlign:"center",background:"#0d0d0d",border:"1px solid #222",padding:"8px 14px",boxShadow:"3px 3px 0 #000"}}>
            <div style={{fontSize:13,color:"#f4a261"}}>{"T:"+trophies}</div>
            <div style={{fontSize:5,color:"#555",marginTop:3}}>TROPHIES</div>
          </div>
        </div>

        {/* Emilio message */}
        {upgradeMsg&&(
          <div style={{background:"#0d0d0d",border:"1px solid #2a2a2a",padding:"10px 14px",maxWidth:360,width:"100%",marginBottom:14,boxShadow:"3px 3px 0 #000"}}>
            <div style={{fontSize:5,color:"#555",marginBottom:5,letterSpacing:2}}>EMILIO</div>
            <div style={{fontSize:7,color:"#aaa",fontFamily:"Georgia,serif",fontStyle:"italic",lineHeight:1.8}}>{"\""+upgradeMsg+"\""}</div>
          </div>
        )}

        {/* Component upgrade cards */}
        <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%",maxWidth:440,marginBottom:16}}>
          {garagePartKeys.map(key=>{
            const part=CAR_PARTS[key];
            const lvl=carUpgrades[key];
            const current=part.levels[lvl];
            const next=lvl<4?part.levels[lvl+1]:null;
            const affordable=next&&credits>=next.credits&&trophies>=next.trophies;
            const maxed=lvl>=4;
            return(
              <div key={key} style={{background:"#0d0d0d",border:"2px solid "+(maxed?current.color:affordable?"#333":"#1a1a1a"),padding:"10px 12px",boxShadow:maxed?"0 0 8px "+current.color+"44":"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{fontSize:7,color:current.color,letterSpacing:1}}>{part.label}</div>
                  <div style={{fontSize:6,color:current.color}}>{current.name}</div>
                  {maxed&&<div style={{fontSize:5,color:current.color,border:"1px solid "+current.color,padding:"1px 5px"}}>MAX</div>}
                </div>
                {/* Level bar */}
                <div style={{display:"flex",gap:3,marginBottom:6}}>
                  {[0,1,2,3,4].map(i=>(
                    <div key={i} style={{flex:1,height:6,background:i<=lvl?part.levels[Math.min(i,4)].color:"#1a1a1a",borderRadius:1}}/>
                  ))}
                </div>
                <div style={{fontSize:5,color:"#888",marginBottom:6,lineHeight:1.6}}>{current.effect}</div>
                {next&&(
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:5,color:"#555"}}>
                      {"NEXT: "+next.name}
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      {next.credits>0&&<span style={{fontSize:5,color:credits>=next.credits?"#2dc653":"#e63946"}}>{"C"+next.credits}</span>}
                      {next.trophies>0&&<span style={{fontSize:5,color:trophies>=next.trophies?"#f4a261":"#e63946"}}>{"T"+next.trophies}</span>}
                      <button onClick={()=>buyUpgrade(key)} disabled={!affordable} style={{background:affordable?GOLD:"#111",color:affordable?DARK:"#333",border:"none",padding:"4px 10px",fontSize:6,fontFamily:PX,cursor:affordable?"pointer":"default"}}>
                        {affordable?"UPGRADE":"..."}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Active synergies */}
        {garageActiveSyn.length>0&&(
          <div style={{width:"100%",maxWidth:440,marginBottom:14}}>
            <div style={{fontSize:6,color:"#555",letterSpacing:3,marginBottom:8}}>-- SYNERGIES ACTIVE --</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {garageActiveSyn.map(s=>(
                <div key={s.id} style={{border:"1px solid "+GOLD+"44",padding:"4px 8px",background:"#0d0d0d"}}>
                  <div style={{fontSize:6,color:GOLD,marginBottom:2}}>{s.name}</div>
                  <div style={{fontSize:5,color:"#888"}}>{s.effect}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Casebook — story progress */}
        {seenStory.length>0&&(
          <div style={{width:"100%",maxWidth:440,marginBottom:16}}>
            <div style={{fontSize:6,color:"#555",letterSpacing:3,marginBottom:8}}>-- CASEBOOK --</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {seenStory.map((sid,i)=>{
                const m=STORY_MOMENTS.find(x=>x.id===sid);
                return m?(
                  <div key={i} style={{border:"1px solid "+m.color+"44",padding:"3px 8px",background:"#0d0d0d"}}>
                    <div style={{fontSize:5,color:m.color,fontFamily:PX}}>{m.title||m.char+" - "+m.id}</div>
                  </div>
                ):null;
              })}
            </div>
            {seenStory.indexOf("g07")>=0&&(
              <div style={{marginTop:10,border:"1px solid #9b5de5",padding:"8px 12px",background:"#0a0010"}}>
                <div style={{fontSize:6,color:"#9b5de5",fontFamily:PX,marginBottom:4}}>TRUE ENDING UNLOCKED</div>
                <div style={{fontSize:5,color:"#666"}}>Find Enzo's Prototype to face Hale in The 500.</div>
              </div>
            )}
          </div>
        )}

        {/* Collection wall */}
        <div style={{width:"100%",maxWidth:440,marginBottom:16}}>
          <div style={{fontSize:6,color:"#555",letterSpacing:3,marginBottom:8}}>-- GARAGE WALL ({collected.length}/40) --</div>
          {["MEMORABILIA","ENZO","CONSPIRACY","WEIRD"].map(cat=>{
            const catItems=COLLECTIBLES.filter(c=>c.cat===cat);
            const catFound=catItems.filter(c=>collected.indexOf(c.id)>=0);
            const cc=CAT_COLORS_COLL[cat];
            return(
              <div key={cat} style={{marginBottom:10}}>
                <div style={{fontSize:5,color:cc,letterSpacing:2,marginBottom:5}}>{cat+" ("+catFound.length+"/"+catItems.length+")"}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {catItems.map(item=>{
                    const found=collected.indexOf(item.id)>=0;
                    return(
                      <div key={item.id} style={{width:64,background:found?"#0d0d0d":"#080808",border:"1px solid "+(found?cc+"55":"#1a1a1a"),padding:"4px 5px",opacity:found?1:0.3}}>
                        <div style={{fontSize:4,color:found?cc:"#333",fontFamily:PX,lineHeight:1.6}}>{found?item.name:"???"}</div>
                        {found&&<div style={{fontSize:4,color:"#666",fontFamily:"Georgia,serif",fontStyle:"italic",lineHeight:1.4,marginTop:2}}>{item.flavor.slice(0,30)+"..."}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={newSeason} style={{background:RED,color:"#fff",border:"none",padding:"13px 32px",fontSize:9,fontFamily:PX,cursor:"pointer",letterSpacing:2,boxShadow:"4px 4px 0 #8B0000"}}>
          NEXT SEASON
        </button>
      </div>
    );
  }

  return null;
}
