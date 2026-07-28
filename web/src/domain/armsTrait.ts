// Port of DCourt/Static/ArmsTrait.java

export const HEAD = 'Head'
export const BODY = 'Body'
export const RIGHT = 'Right'
export const LEFT = 'Left'
export const FEET = 'Feet'
export const SECRET = 'Secret'
export const DECAY = 'Decay'
export const CURSED = 'Cursed'
export const CURSE = 'Curse'
export const GLOWS = 'Glows'
export const FLAME = 'Flame'
export const BLESS = 'Bless'
export const LUCKY = 'Lucky'
export const DISEASE = 'Disease'
export const BLIND = 'Blind'
export const PANIC = 'Panic'
export const BLAST = 'Blast'
export const ENCHANT = 'Enchant'

export const traitLabel = [
  HEAD, BODY, FEET, RIGHT, LEFT, DECAY, SECRET, CURSED, CURSE, GLOWS, FLAME, BLESS, LUCKY,
  'Disease', 'Blind', 'Panic', BLAST, ENCHANT,
]

// indices into traitLabel, computed the same way itList.firstOf() did in Java
export const VISIBLE_TRAIT = traitLabel.indexOf(CURSE)
export const RANDOM_TRAIT = traitLabel.indexOf(CURSED)
export const VALUED_TRAIT = traitLabel.indexOf(GLOWS)
export const END_WEAR_TRAIT = traitLabel.indexOf(LEFT) + 1
export const ENCHANT_TRAIT = traitLabel.indexOf(ENCHANT)
export const MAX_TRAITS = traitLabel.length

// aligned index-for-index with traitLabel; 300 here matches Tools.DEFAULT_HEIGHT in the Java source
export const traitValue = [0, 0, 0, 0, 0, 0, 0, 0, 0, 50, 800, 300, 250, 1500, 4000, 3000, 2000, 100]
