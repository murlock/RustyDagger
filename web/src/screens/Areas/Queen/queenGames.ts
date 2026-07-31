// Port of the four playable Dragon Court minigames
// (DCourt/Screens/Areas/Queen/arqDice.java, arqMingle.java, arqBoast.java,
// arqGame.java - each `extends arNotice` in Java, computing its whole
// outcome message in the constructor and showing it via the base class).
// Ported as plain functions rather than components - there's no UI beyond
// "show this precomputed text", the same "compute a message, then
// nav.goto(ArNotice, {message})" shape used everywhere else in this
// codebase for arNotice-subclass screens (e.g. arCastle.vue's
// enterDocks()).
//
// arqStudy.java and arqFlirt.java are NOT ported - neither is wired to any
// button in arQueen.java's action() (only Dice/Mingle/Boast/Game are, per
// its own `text` array), and neither is referenced anywhere else in the
// decompiled source. arqFlirt is a literal stub (`"\tWorking..."`, nothing
// else). arqStudy is unfinished/broken even on its own terms - its
// constructor passes the raw, un-filled `studyMsg` template
// (`$lordname$`/`$topic$` tokens that nothing ever replaces) straight to
// arNotice, and its `boastText` array holds meaningless placeholder
// strings ("0", "1", "2", "3", ...) never read by anything. Both are dead
// code shipped in the jar but genuinely unreachable in play - see
// CONVERSION_PLAN.md's #17 entry.
//
// Deliberate deviations:
// - arqMingle.java's own `Tools.fourTest(skill, level * MINGLERISK)` is
//   called *twice* independently - once to index `mingleText[]` for the
//   displayed message, again in the `switch` that applies the mechanical
//   effects. Since fourTest() rolls dice with no memoization, the two
//   calls can (and will) disagree, showing one outcome's flavor text while
//   applying a *different* outcome's stat effects. arqDice/arqBoast/
//   arqGame all compute this exact same kind of roll-and-branch value
//   exactly once into a local `index` and reuse it consistently - strongly
//   suggesting arqMingle's double call is a genuine slip in the original,
//   not a deliberate design. Ported the same way its three siblings
//   already do it: roll once, use the same `index` for both the text and
//   the effects.
// - `GameStrings.interests[]`'s `$He$`/`$his$`/`$man$` tokens (mixed-case)
//   are never resolved by `MadLib.genderize()` in Java either - its own
//   gender table is uppercase-only (`$HE$`/`$HIM$`/`$HIS$`/`$MAN$`/
//   `$BOY$`), so these particular interest lines have always rendered
//   with the literal, unresolved token text to players. A genuine
//   original-game cosmetic bug, not a decompiler artifact - `madlib.ts`
//   already mirrors the same uppercase-only table, so this reproduces
//   faithfully with no special-casing needed.
import { contest, fourTest, roll, select, twice } from '../../../engine/dice'
import * as C from '../../../domain/constants'
import * as GameStrings from '../../../domain/gameStrings'
import { MadLib } from '../../../domain/madlib'
import type { ItHero } from '../../../domain/itHero'

const RECOMMEND_MSG = '$CR$Perhaps you could speak with the Queen...$CR$'

// Port of arQueen.Recommend() - shared flavor line appended by all four
// minigames, hinting the hero is close enough to petition for a rank raise.
export function recommend(hero: ItHero): string {
  const favor = hero.hasTrait(C.POPULAR) ? Math.trunc(hero.getFavor() / 700) : Math.trunc(hero.getFavor() / 900)
  const threshold = C.rankCost[hero.getSocial()]
  return favor < threshold || roll(2) > 0 ? '' : RECOMMEND_MSG
}

function lordName(rank: number): string {
  return `${C.rankTitle[rank]}${select(GameStrings.Names)}`
}

const DICE_MSG =
  "$TB$You engage $lordname$ in a friendly game of bones.  $HE$ wants to make things 'interesting' by wagering the small sum of $bet$ marks.  You gulp and smile bravely, then grab for the dice.$CR$"
const DICE_SWAP_MSG = '$TB$(You surreptitiously swap dice)$CR$'
const DICE_GUILD_SIGN = '$TB$($lordname$ flashes the trade guild hand-sign)$CR$'
const DICE_TEXT = [
  '$TB$A short time later, you are handing over a full purse of money to the gloating $lordrank$.  $HE$ slaps you on the back and shakes your hand. You may have lost, but you have gained a friend.$CR$',
  '$TB$You dice with great care, but lose steadily. Soon, you shake your head and cut your losses at $cost$ marks.  $lordname$ smiles broadly and offers to play again in the future.$CR$',
  '$TB$You dice with gay abandon.  At the end, you and the $lordrank$ break even.  $HE$ thanks you for the friendly game.$CR$',
  '$TB$You dice with good success. $lordname$ smiles wanly as you take half $HIS$ money.$CR$',
  "$TB$A short time later, you are adding a fat purse to your possessions.  It is the $lordrank$'s turn to smile bravely.$CR$",
]

// Port of arqDice.java's prepareText().
export function diceOutcome(hero: ItHero): string {
  let rank = 1 + Math.trunc(hero.getMoney() / 25000) + roll(3)
  if (rank > 10) rank = 10
  const level = rank * 2 + roll(rank * 2)
  const thief = roll(2) === 0 ? 0 : roll(level)
  let dskill = level * 8
  let cost = 2500 * (rank + 1)
  if (cost > hero.getMoney()) cost = hero.getMoney()
  let pskill = hero.getWits()
  const favor = hero.getFavor()
  hero.addFatigue(1)
  const msg = new MadLib(DICE_MSG)
  const swap = contest(hero.thief(), thief)
  if (!swap) {
    dskill += thief * 5
  } else {
    msg.append(DICE_SWAP_MSG)
    pskill += hero.thief() * 5
  }
  const index = fourTest(pskill, dskill)
  msg.append(DICE_TEXT[index])
  switch (index) {
    case 0:
      hero.subMoney(cost)
      hero.addFavor(Math.trunc(favor / (20 - rank)))
      break
    case 1:
      msg.replace('$cost$', Math.trunc(cost / 2))
      hero.subMoney(Math.trunc(cost / 2))
      hero.addFavor(Math.trunc(favor / (30 - rank)))
      break
    case 2:
      msg.append(hero.gainExp(rank + thief + level))
      msg.append(hero.gainWits(4))
      hero.addFavor(Math.trunc(favor / (40 - rank)))
      break
    case 3:
      hero.addMoney(Math.trunc(cost / 2))
      msg.append(hero.gainExp((rank + thief) * 2 + level))
      msg.append(hero.gainWits(7))
      hero.subFavor(Math.trunc(favor / (30 - rank)))
      break
    case 4:
      hero.addMoney(cost)
      msg.append(hero.gainExp((rank + thief) * 5 + level))
      msg.append(hero.gainWits(10))
      hero.subFavor(Math.trunc(favor / (20 - rank)))
      break
  }
  if (!swap && hero.thief() > 0 && thief > 0) msg.append(DICE_GUILD_SIGN)
  msg.append(recommend(hero))
  msg.replace('$lordname$', lordName(rank))
  const sex = roll(2)
  msg.replace('$lordrank$', C.rankName[sex][rank])
  msg.replace('$bet$', cost)
  msg.genderize(sex === 0)
  return msg.getText()
}

const MINGLE_RISK = 5
const MINGLE_MSG = '$TB$You engange $lordname$ in conversation. $interests$$CR$'
const MINGLE_TEXT = [
  '$TB$Five minutes pass while you describe your bladder problems to $lordname$.  $HE$ smiles in a strained fashion and takes $his$ leave as soon as possible.$CR$$TB$Perhaps you could have been a little more attentive.$CR$',
  '$TB$The $lordrank$ is a terrific conversationalist. $HE$ smiles and nods for several minutes while you speak at some length about your adventures and aspirations.$CR$$TB$You part company thinking that you have made great success with ... uh ... what was $his$ name again? $CR$',
  '$TB$You exchange friendly banter with the noble for several minutes.  You fail to find any topic of common interest and thus part ways a short time later.$CR$$TB$Well, at least you have offended noone.$CR$',
  '$TB$You listen attentively while $lordname$ describes $HIS$ pursuits.  You nod and smile at all the appropriate points during $HIS$ stories.$CR$$TB$The $lordrank$ is favorably impressed by your intelligence and acumen.  $HE$ invites you to come visit at $HIS$ estates sometime.$CR$$TB$You have won another friend in the Dragon Court.$CR$',
  '$TB$You listen with grave attention as the $lordrank$ describes $his$ pursuits.  You wax enthusiastic and make knowledgable comments on the topic.$CR$$TB$ $lordname$ thanks you for the delightful conversation and expresses interest in your future career. You have earned yourself a staunch ally in the Dragon Court.$CR$',
]

// Port of arqMingle.java's prepareText() - see this file's header comment
// for the double-fourTest() fix.
export function mingleOutcome(hero: ItHero): string {
  let rank = 1 + roll(2 + hero.getSocial())
  if (rank > 10) rank = 10
  const level = rank * 2 + roll(rank * 2)
  const skill = hero.getCharm() + hero.magic() * 5
  const favor = hero.getFavor()
  hero.addFatigue(1)
  const index = fourTest(skill, level * MINGLE_RISK)
  const msg = new MadLib(MINGLE_MSG + MINGLE_TEXT[index])
  switch (index) {
    case 0:
      hero.subFavor(Math.trunc(favor / (14 - rank)))
      break
    case 1:
      hero.subFavor(Math.trunc(favor / (17 - rank)))
      break
    case 2:
      msg.append(hero.gainExp(rank + level))
      msg.append(hero.gainCharm(4))
      break
    case 3:
      msg.append(hero.gainExp(rank * 2 + level))
      msg.append(hero.gainCharm(7))
      hero.addFavor(Math.trunc(favor / (17 - rank)))
      break
    case 4:
      msg.append(hero.gainExp(rank * 5 + level))
      msg.append(hero.gainCharm(10))
      hero.addFavor(Math.trunc(favor / (14 - rank)))
      break
  }
  msg.append(recommend(hero))
  msg.replace('$lordname$', lordName(rank))
  const sex = roll(2)
  msg.replace('$lordrank$', C.rankName[sex][rank])
  msg.replace('$interests$', select(GameStrings.interests))
  msg.genderize(sex === 0)
  return msg.getText()
}

const BOAST_RISK = 10
const BOAST_MSG =
  '$TB$You corner $lordname$ and start spilling your tales of adventure throughout the realm. You dramatize this narrative by leaping onto tables and swinging candelabras as makeshift weaponry.$CR$'
const BOAST_TEXT = [
  '$TB$Your narrative is going well, when quite by accident you $accident$$CR$$TB$You apologize profusely, but the guardsmen grab you by the collar, take half your purse for damages and eject you from the premises.$CR$',
  "$TB$$lordname$'s frown grows deeper and deeper as you blather continuously about the inummerable goblins, rodents, and boars you have slain in your day.$CR$$TB$Finally, $HE$ interrupts you, declares you a bore and a liar and stomps away indignantly for having wasted $his$ time.$CR$",
  '$TB$The $lordrank$ bears an amused smile throughout your discourse.  When your tale is concluded, $HE$ thanks you for the opportunity to wax nostalgic and dream about $HIS$ own halcyon days of youth.$CR$',
  '$TB$The $lordrank$ listens with fascination for the better part of an hour.  $HE$ is favorably impressed by your courage and heroism and agrees to take up your case with the queen.$CR$',
  '$TB$The $lordrank$ becomes the core of an admiring knot of listeners.  When you finish they all applaud.$CR$$TB$The $lordrank$ shakes your hand and thanks you heartily for such a terrifically inspiring tale of braggadocio and derring-do.  $HE$ further declares you to be a credit and inspiration to the entire court.$CR$',
]
const BOAST_ACCIDENTS = [
  'smash an antique burial urn.',
  'step on the dinner platter.',
  'slip and fall into the fireplace.',
  "hurl a drumstick into the Queen's lap.",
  "kick the Queen's favorite wolf-hound.",
  'skid and rip your trews wide open.',
  "throw wine on the Queen's portrait.",
  "refer to the Queen as 'a bit of rumpy-pumpy'.",
  'swing on the chandelier, carrying it and you into a drunken group of visiting dignitaries who proceed to pummel you senseless with their oddly shaped walking sticks.',
]

/** Port of arqBoast.java's prepareText(). `toCastle` mirrors `setHome(new arCastle())` on the failure branch (index 0) - every other outcome keeps the caller's own home (arQueen). */
export function boastOutcome(hero: ItHero): { message: string; toCastle: boolean } {
  let rank = 1 + roll(hero.getSocial() + roll(3))
  if (rank > 10) rank = 10
  const level = rank * 2 + roll(rank * 2)
  const skill = hero.getCharm() + hero.fight() * 5
  const favor = hero.getFavor()
  hero.addFatigue(1)
  const index = fourTest(skill, level * BOAST_RISK)
  const msg = new MadLib(BOAST_MSG + BOAST_TEXT[index])
  switch (index) {
    case 0:
      hero.subMoney(Math.trunc(hero.getMoney() / 2))
      hero.subFavor(Math.trunc(favor / (12 - rank)))
      break
    case 1:
      hero.subFavor(Math.trunc(favor / (14 - rank)))
      break
    case 2:
      msg.append(hero.gainExp(rank + level))
      msg.append(hero.gainCharm(4))
      break
    case 3:
      msg.append(hero.gainExp(rank * 2 + level))
      msg.append(hero.gainCharm(7))
      hero.addFavor(Math.trunc(favor / (14 - rank)))
      break
    case 4:
      msg.append(hero.gainExp(rank * 5 + level))
      msg.append(hero.gainCharm(10))
      hero.addFavor(Math.trunc(favor / (12 - rank)))
      break
  }
  msg.append(recommend(hero))
  msg.replace('$lordname$', lordName(rank))
  const sex = roll(2)
  msg.replace('$lordrank$', C.rankName[sex][rank])
  msg.replace('$accident$', select(BOAST_ACCIDENTS))
  msg.genderize(sex === 0)
  return { message: msg.getText(), toCastle: index === 0 }
}

const GAME_MSG = "$TB$Your friends tell you about the latest craze from $country$.  It's called $game$$CR$"
const GAME_NAMES = [
  'Wickets.  You whack a wooden ball with a mallet and try to knock down a standing stick called a wicket while a team of nine men try to stop you.',
  'Nine Pins. You set up ten pegs in a triangle formation. then take turns throwing a ball to bowl them down.',
  'Croquette.  You knock a wooden ball through little hoops and try to hit a standing stick.',
  'Golfing. You knock a small ball with a stick and try to drop it into a hole with the fewest swings.',
  'Badmitton.  Two players enter a court, then knock a feathered ball over a net and off the walls.',
  'Poloball.  You ride a horse around whacking a wooden ball with a mallet.  You score by shooting into a goal box.',
  'Scrumming. Two teams face off over an inflated pigs bladder. They charge at each other and try to push the balloon across an end line.',
  'Fisticuffs. Two to six men face off in a ring wielding nothing more than their bare knuckles.  Points are scored by striking the face and shoulders.',
]
const GAME_ACCIDENTS = [
  'accidently smash your hand',
  'run headfirst into a wall',
  'trip and wrench your ankle',
  'jump and bang your head',
  'turn and twist your knee',
  'throw out your back',
]
const GAME_COUNTRIES = ['Hie Brasil', 'Shangala', 'Orehwon', 'the Troll Dominion', 'Alfheim', 'Raynoma', 'Farstael', 'Ter Winache']
const GAME_RESULT = [
  '$TB$You bumble about clumsily, fowling your opponents and tripping up repeatedly. When you $accident$ your mates kick you out of the game.$CR$$TB$Later that the day, everyone is whispering and giggling whenever you aren\'t looking.$CR$$CR$$TB$$TB$*** you take -$hurt$ wounds ***',
  "$TB$You play as hard as you can, but for some reason you just can't quite get the hang of things. You remain scoreless for the day.$CR$$TB$After the game, your friends try to cheer you up. They pretend that noone likes this game, but you know that's a lie.$CR$",
  '$TB$You charge about with strength and enthusiam. You score once and so do some of your mates.$CR$$TB$When all the scores are tallied, things are about even.Everyone declares the game to be great good fun and vow to play it daily.$CR$',
  '$TB$You charge about with verve and force.  You score several times, impressing the crowds.$CR$$TB$When the scores are tallied, you are found to be ahead of everyone.  Your mates congratulate and express their admiration.$CR$',
  '$TB$You play with an unmatched skill that devestates the opposition. You stop all their points, and score with complete impunity.$CR$$TB$At the end of play, the crowds charge forward and bear you on their shoulders while loudly chanting your name.$CR$',
]
export const GAME_SMASHED =
  '\tYou are wounded mortally and fall to the ground. Your friends crowd around looking worried and confused. Finally, someone sends for the healers.  You are carried to the monastery where your life is refreshed.\n'

/** Port of arqGame.java's prepareText() + its constructor's death check. `deathTale` mirrors `killedScreen(this, SMASHED, false)` firing when the wound outcome (index 0) drops the hero below their own Guts. */
export function gameOutcome(hero: ItHero): { message: string; deathTale: string | null } {
  const rank = roll(6) + roll(3)
  const level = hero.getLevel()
  const skill = hero.getGuts()
  const favor = hero.getFavor()
  hero.addFatigue(1)
  const index = fourTest(skill, (1 + rank) * 20)
  const msg = new MadLib(GAME_MSG + GAME_RESULT[index])
  switch (index) {
    case 0: {
      const num = Math.trunc(((1 + twice(3)) * hero.getGuts()) / 10)
      hero.addWounds(num)
      hero.subFavor(Math.trunc(favor / (12 - rank)))
      msg.replace('$hurt$', num)
      break
    }
    case 1:
      hero.subFavor(Math.trunc(favor / (14 - rank)))
      break
    case 2:
      msg.append(hero.gainExp(rank + level))
      msg.append(hero.gainGuts(4))
      break
    case 3:
      msg.append(hero.gainExp(rank * 2 + level))
      msg.append(hero.gainGuts(7))
      hero.addFavor(Math.trunc(favor / (14 - rank)))
      break
    case 4:
      msg.append(hero.gainExp(rank * 5 + level))
      msg.append(hero.gainGuts(10))
      hero.addFavor(Math.trunc(favor / (12 - rank)))
      break
  }
  msg.append(recommend(hero))
  msg.replace('$country$', select(GAME_COUNTRIES))
  msg.replace('$game$', GAME_NAMES[rank])
  msg.replace('$accident$', select(GAME_ACCIDENTS))
  const deathTale = hero.getWounds() >= hero.getGuts() ? GAME_SMASHED : null
  return { message: msg.getText(), deathTale }
}
