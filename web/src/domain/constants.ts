// Port of DCourt/Static/Constants.java

export const SUITE = 'suite'
export const ROOM = 'room'
export const FLOOR = 'floor'
export const COT = 'cot'
export const TOWN = 'town'
export const FIELDS = 'fields'
export const FOREST = 'forest'
export const HILLS = 'hills'
export const MOUND = 'mound'
export const DOCKS = 'docks'
export const DUNJEON = 'dunjeon'
export const PLACE_ARRAY = [SUITE, ROOM, FLOOR, COT, TOWN, FIELDS, FOREST, HILLS, MOUND, DOCKS, DUNJEON]
export const PLACE_CAMP: Record<string, number> = {
  [SUITE]: 0,
  [ROOM]: 0,
  [FLOOR]: 1,
  [COT]: 3,
  [TOWN]: 0,
  [FIELDS]: 3,
  [FOREST]: 7,
  [HILLS]: 3,
  [MOUND]: 1,
  [DOCKS]: 0,
  [DUNJEON]: 0,
}

export const FIGHT = 'fight'
export const MAGIC = 'magic'
export const THIEF = 'thief'
export const IEATSU = 'Ieatsu'
export const ATTACK = 'Attack'
export const DEFEND = 'Defend'
export const SKILL = 'Skill'
export const SPELLS = 'Magic Assault'
export const VICTORY = 'Victory'
export const RUNAWAY = 'Runs Aways'
export const BERZERK = 'Berzek'
export const CONTROL = 'Control'
export const SWINDLE = 'Swindle'
export const BACKSTAB = 'Backstab'
export const WORM = 'worm'
export const GOAT = 'goat'
export const EXP = 'Exp'
export const AGE = 'Age'
export const FAME = 'Fame'
export const HIGH = 'High'
export const PEAK = 'Peak'
export const LEVEL = 'Level'
export const MONEY = 'Marks'
export const SOCIAL = 'Social'
export const ACTIONS = 'Action'
export const WOUNDS = 'Wounds'
export const FATIGUE = 'Fatigue'
export const DISEASE = 'Disease'
export const STIPEND = 'Stipend'
export const BLIND_STR = '*BLIND*'
export const PANIC_STR = '+PANIC+'
export const FAVOR = 'Favor'
export const VERSION = 'Version'
export const MAIL = 'Mail'
export const TITLE = 'Title'
export const MALE = 'Male'
export const FEMALE = 'Female'
export const BOTH = 'Both'
export const NONE = 'None'
export const SEXS = [MALE, FEMALE, BOTH, NONE]
export const GENDER = 'Gender'
export const DRESS = 'Dress'
export const BEHAVE = 'Behave'
export const RACE = 'Race'
export const BUILD = 'Build'
export const SIGN = 'Sign'
export const SKIN = 'Skin'
export const EYES = 'Eyes'
export const HAIR = 'Hair'
export const HABIT = 'Habit'
export const CLAN = 'Clan'
export const MARKS = 'Marks'
export const PHRASE = 'Phrase'
export const RANK = 'Rank'
export const NAME = 'Name'
export const GUTS = 'Guts'
export const WITS = 'Wits'
export const CHARM = 'Charm'
export const MAXRANK = 10

export const rankTitle = ['', 'Sr. ', 'Brn. ', 'Cnt. ', 'Vct. ', 'Mqs. ', 'Earl ', 'Duke ', 'Prc. ', 'Regent ', 'Ruler ', 'Emperor ']

export const rankName = [
  ['Peasant', 'Knight', 'Baron', 'Count', 'Viscount', 'Marquis', 'Earl', 'Duke', 'Prince', 'Regent', 'King', 'Emperor'],
  ['Peasant', 'Dame', 'Baroness', 'Countess', 'Comtessa', 'Marquessa', 'Earl', 'Duchess', 'Princess', 'Regent', 'Queen', 'Empress'],
]

export const rankCost = [5, 20, 80, 320, 1250, 5000, 20000, 80000, 320000, 0, 0, 0]

export const GUILD = 'Guild'
export const MYSTIC = 'Mystic'
export const TRADER = 'Trader'
export const ILLUMINATI = 'Illuminati'
export const STRONG = 'Strong'
export const STURDY = 'Sturdy'
export const AGILE = 'Agile'
export const UNAGING = 'Unaging'
export const CATSEYES = 'CatsEyes'
export const HILLFOLK = 'HillFolk'
export const SWIFT = 'Swift'
export const SINCERE = 'Sincere'
export const TRICKY = 'Tricky'
export const EMPATHIC = 'Empathic'
export const SEXY = 'Sexy'
export const FENCER = 'Fencer'
export const STUBBORN = 'Stubborn'
export const CLEVER = 'Clever'
export const DRAGON = 'Dragon'
export const POPULAR = 'Popular'
export const RANGER = 'Ranger'
export const GYPSY = 'Gypsy'
export const MERCHANT = 'Merchant'
export const BANDIT = 'Bandit'
export const MEDIC = 'Medic'
export const SMITH = 'Smith'
export const ARMOR = 'Armor'
export const QUICK = 'Quick'
export const HOTEL = 'Hotel'
export const HARDY = 'Hardy'
export const ALERT = 'Alert'
export const REFLEX = 'Reflex'

export const TraitList = [
  ARMOR, AGILE, ALERT, BANDIT, BERZERK, CATSEYES, CLEVER, DRAGON, EMPATHIC, FENCER, GUILD, GYPSY,
  HARDY, HOTEL, HILLFOLK, ILLUMINATI, MEDIC, MERCHANT, MYSTIC, POPULAR, RANGER, REFLEX, SINCERE,
  SEXY, SMITH, STRONG, STUBBORN, STURDY, SWIFT, TRADER, TRICKY, UNAGING, QUICK,
]

export const TraitStub = [
  'AR', 'AG', 'AL', 'BA', 'BE', 'CA', 'CL', 'DR', 'EM', 'FE', 'GU', 'GY', 'HA', 'HO', 'HI', 'IL',
  'MM', 'MR', 'MY', 'PO', 'RA', 'RE', 'SI', 'SE', 'SM', 'ST', 'SB', 'SR', 'SW', 'TA', 'TK', 'UN', 'QU',
]
