// Port of the non-rendering logic in DCourt/Screens/Quest/arQuest.java -
// applyChoice() and everything it dispatches to, plus battleActionResult().
// Pulled out of arQuest.vue into its own composable (rather than component
// methods) because battleActionResult() must be callable from arBattle.vue
// too, and arBattle.vue mounts only *after* arQuest.vue has already
// unmounted (App.vue's <component :is> swap) - a component method
// (`defineExpose`) can't survive that, but a plain function taking
// `session` explicitly can, the same way every other piece of state in
// this quest engine is carried through props rather than component
// lifetime. See questSession.ts's header comment for the fuller version
// of this lesson.
//
// Deliberate deviations:
// - `Tools.getBest()` (a server-reported multiplayer field, in
//   mobControls()'s "convinces you that you are X" flavor line) is
//   substituted with the hero's own name, same as every other screen that
//   hit this already (arTavern.vue, arHealer.vue, arGemShop.vue).
// - mobControls()'s hero-death branch calls heroStore.resolveDeath() (the
//   same domain call every other death path in this codebase uses) but
//   surfaces the result via arNotice rather than a dedicated healer
//   screen - nothing else in this codebase routes death anywhere more
//   specific either (see arStatus's effectEnchant, which hit the exact
//   same gap first).
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { contest, roll, select } from '../../engine/dice'
import * as C from '../../domain/constants'
import * as GT from '../../domain/gearTypes'
import * as QuestStrings from '../../domain/questStrings'
import { ItList } from '../../domain/itList'
import { packString } from './questHelpers'
import { runBattleRound } from './battleRound'
import {
  BRIBE,
  FEED,
  RIDDLE,
  TRADE,
  HELP,
  SEDUCE,
  CONTROL,
  BACKSTAB,
  BERZERK,
  SWINDLE,
  IEATSU,
  ATTACK,
  FLEE,
  FISH,
  BUSHIDO,
  CAPTURE,
} from './useQuestOptions'
import type { QuestSession } from './questSession'
import ArNotice from '../Utility/arNotice.vue'
import ArQuest from './arQuest.vue'
import ArBattle from './arBattle.vue'

const TRAINS_TEXT =
  '\tYou are taken to a remote location in the forest where you undergo a bizzare training regimen.  You shower naked beneath a freezing waterfall.  You eat nothing but rice and fish.  You must sit for hours in a lotus position while  contemplating the sound of a single hand clapping.\n\tWhen the time comes to draw your blade, you find that an unheralded clarity of vision guides your stroke.\n\t\t\tYour Training is Complete\n\n<<< You Have Gained in Samurai Skill >>>\n\n\t*** The Cost to Your Body is Severe ***\n\t*** -3 Guts  -3 Wits  -3 Charm ***\n'

export function useQuestActions(session: QuestSession) {
  const heroStore = useHeroStore()
  const nav = useNavigationStore()

  function noticeToGate(message: string) {
    nav.goto(ArNotice, { message }, { home: session.gate, showStatus: false })
  }

  function noticeToQuest(message: string) {
    nav.goto(ArQuest, { session }, { home: session.gate, showStatus: false })
    const questEntry = nav.current
    nav.goto(ArNotice, { message }, { home: questEntry, showStatus: false })
  }

  function noticeThenNoticeToGate(first: string, second: string) {
    nav.goto(ArNotice, { message: second }, { home: session.gate, showStatus: false })
    const secondEntry = nav.current
    nav.goto(ArNotice, { message: first }, { home: secondEntry, showStatus: false })
  }

  /**
   * Computes one battle round *once* here (not inside arBattle.vue's own
   * mount - see battleRound.ts's header comment for why that would
   * double-apply the round on the events-notice round-trip) and navigates
   * to it, showing an interstitial notice first if there's pre-round
   * flavor text (a potion/troll/goat/worm effect).
   */
  function gotoBattleRound(priorMsg: string | null) {
    const hero = heroStore.hero!
    const mob = session.mob
    const { text, events } = runBattleRound(hero, mob, priorMsg)
    nav.goto(ArBattle, { session, text }, { home: session.gate, showStatus: false })
    if (events.length > 0) {
      const battleEntry = nav.current
      nav.goto(ArNotice, { message: events }, { home: battleEntry, showStatus: false })
    }
  }

  function noticeThenBattle(message: string) {
    gotoBattleRound(null)
    const battleChainEntry = nav.current
    nav.goto(ArNotice, { message }, { home: battleChainEntry, showStatus: false })
  }

  function startBattle(message: string | null) {
    gotoBattleRound(message)
  }

  function backToQuest() {
    nav.goto(ArQuest, { session }, { home: session.gate, showStatus: false })
  }

  function choose(choice: number) {
    switch (choice) {
      case BRIBE:
        tryBribe()
        return
      case FEED:
        trySupply(GT.FOOD, FEED)
        return
      case RIDDLE:
        tryRiddle()
        return
      case TRADE:
        tryTrade()
        return
      case HELP:
        tryAssist()
        return
      case SEDUCE:
        trySeduce()
        return
      case FLEE:
        tryFlee()
        return
      case FISH:
        trySupply(GT.FISH, FISH)
        return
      case BUSHIDO:
        tryToken()
        return
      case CAPTURE:
        tryCapture()
        return
      default:
        genericAction(choice)
    }
  }

  function genericAction(choice: number) {
    const hero = heroStore.hero!
    const mob = session.mob
    const ha = hero.getActions()
    const ma = mob.getActions()
    switch (choice) {
      case CONTROL:
        ha.setName(C.CONTROL)
        break
      case BACKSTAB:
        ha.setName(C.BACKSTAB)
        break
      case BERZERK:
        ha.setName(C.BERZERK)
        break
      case SWINDLE:
        ha.setName(C.SWINDLE)
        break
      case IEATSU:
        ha.setName(C.IEATSU)
        break
      case ATTACK:
        ha.setName(C.ATTACK)
        break
    }
    if (ma.isMatch(C.RUNAWAY)) {
      mobFlees(null)
      return
    }
    if (ha.isMatch(ma.getName())) {
      if (choice === CONTROL) {
        stareDown()
        return
      }
      if (choice === SWINDLE) {
        swapGoods()
        return
      }
    }
    startBattle(null)
  }

  /** Called by arBattle.vue's Continue click - resolves what a completed combat round leads to. */
  function battleActionResult() {
    const hero = heroStore.hero!
    const mob = session.mob
    if (hero.isDead()) {
      const death = heroStore.resolveDeath(null, true)
      noticeToGate(death?.message ?? '')
      return
    }
    if (hero.isControl()) {
      heroControls('')
      return
    }
    if (hero.isSwindle()) {
      heroSwindles()
      return
    }
    if (mob.isDead()) {
      heroWins()
      return
    }
    if (mob.isControl()) {
      mobControls('')
      return
    }
    if (mob.isSwindle()) {
      mobSwindles()
      return
    }
    hero.resetActions()
    session.opt.nextRound(mob)
    mob.resetActions()
    mob.chooseActions(hero, false)
    backToQuest()
  }

  function tryBribe() {
    const hero = heroStore.hero!
    const mob = session.mob
    const exp = mob.baseExp()
    const num = Math.trunc((session.weight * (mob.getGuts() + mob.getWits())) / 2)
    const cost = hero.subMoney(num)
    if (cost >= num && contest(hero.bribeCharm(), mob.bribeCharm())) {
      let msg = `\tYou have averted conflict by paying the ${mob.getName()} ${cost} marks...\n`
      msg += hero.gainExp(exp)
      hero.subFatigue(1)
      msg += hero.gainCharm(session.weight)
      noticeToGate(msg)
    } else if (mob.isAggresive()) {
      mob.addMoney(cost)
      startBattle(`The ${mob.getName()} takes ${cost} marks, then attacks!\n`)
    } else if (mob.isHostile()) {
      mob.addMoney(cost)
      session.opt.remove(BRIBE)
      noticeToQuest(`\tThe ${mob.getName()} takes ${cost} marks, then laughs at you!`)
    } else {
      hero.addMoney(cost)
      session.opt.remove(BRIBE)
      noticeToQuest(`The ${mob.getName()} refuses your money...`)
    }
  }

  function trySupply(id: string, removeChoice: number) {
    const hero = heroStore.hero!
    const mob = session.mob
    const exp = mob.baseExp()
    const num = Math.trunc((mob.getGuts() + 4) / 5)
    const cost = hero.subPackCount(id, num)
    if (cost >= num && contest(hero.feedCharm(), mob.feedCharm())) {
      let msg = `The ${mob.getName()} chows down on ${cost} ${id}, the waddles away with satisfaction...\n`
      msg += hero.gainExp(exp)
      hero.subFatigue(1)
      msg += hero.gainCharm(session.weight)
      noticeToGate(msg)
    } else if (mob.isAggresive()) {
      startBattle(`The ${mob.getName()} eats your ${id}...then it attacks!\n`)
    } else if (mob.isHostile()) {
      session.opt.remove(removeChoice)
      noticeToQuest(`The ${mob.getName()} eats ${cost} ${id}...then blocks your path!\n`)
    } else {
      hero.addPackCount(GT.FOOD, cost)
      session.opt.remove(removeChoice)
      noticeToQuest(`The ${mob.getName()} turns up it's nose up at your ${id}...\n`)
    }
  }

  function tryTrade() {
    const hero = heroStore.hero!
    const mob = session.mob
    const exp = mob.baseExp()
    const num = session.weight * (mob.getCharm() + mob.getWits())
    const cost = hero.subMoney(num)
    const gear = ItList.fromList(mob.getPack())
    gear.zero(C.MARKS)
    if (!gear.isEmpty() && cost >= num && contest(hero.tradeCharm(), mob.tradeCharm())) {
      let msg = 'You flash your marks at it until an agreeable price is reached...\n'
      msg += `\nYou spend ${cost} marks.\n`
      mob.getPack().zero(C.MARKS)
      msg += packString('\nYou Recieve: ', mob.getPack())
      hero.getPack().mergeList(mob.getPack())
      msg += hero.gainExp(exp)
      msg += hero.gainCharm(session.weight)
      noticeToGate(msg)
    } else if (mob.isAggresive()) {
      mob.addMoney(cost)
      startBattle(`\tThe ${mob.getName()} takes ${cost} marks, then attacks!\n`)
    } else if (mob.isHostile()) {
      mob.addMoney(cost)
      mob.setPassive()
      mob.getActions().setName(C.ATTACK)
      mobFlees(`\tIt steals ${cost} marks!\n`)
    } else {
      hero.addMoney(cost)
      session.opt.remove(TRADE)
      noticeToQuest(`The ${mob.getName()} shows no interest in trading...\n`)
    }
  }

  function tryAssist() {
    const hero = heroStore.hero!
    const mob = session.mob
    const exp = mob.baseExp()
    if (contest(hero.getWits(), mob.getWits())) {
      let msg = `\tYou manage to fix the problem!\n\n\tThe ${mob.getName()} is indebted to you for your kind assistance...\n`
      mob.getPack().loseHalf()
      msg += packString('\nYou Recieve: ', mob.getPack())
      hero.getPack().mergeList(mob.getPack())
      hero.addStatus(C.FAME, session.weight)
      msg += hero.gainExp(exp)
      msg += hero.gainWits(session.weight)
      noticeToGate(msg)
    } else if (mob.isAggresive()) {
      startBattle(`\tThe ${mob.getName()} attacks while you busy!\n`)
    } else if (mob.isHostile()) {
      session.opt.remove(HELP)
      noticeToQuest(`\tYou can't seem to solve the problem...\n\n\tThe ${mob.getName()} calls you a worthless loser!\n`)
    } else {
      session.opt.remove(HELP)
      noticeToQuest(`\tYou can't seem to solve the problem...\n\n\tThe ${mob.getName()} thanks you for your efforts.\n`)
    }
  }

  function tryRiddle() {
    const hero = heroStore.hero!
    const mob = session.mob
    const exp = mob.baseExp()
    const which = roll(QuestStrings.riddle.length)
    let msg = `\t${QuestStrings.riddle[which]}\n\n\t`
    if (!contest(hero.getWits(), mob.getWits())) {
      msg += `${QuestStrings.guess[roll(QuestStrings.guess.length)]}\n`
      session.opt.remove(RIDDLE)
      if (mob.isAggresive() || mob.isHostile()) {
        startBattle(`${msg}\n\tWRONG!! SCREEEEECH!!!\n`)
      } else {
        noticeToQuest(`${msg}\n\tThe ${mob.getName()} shakes its head.\n`)
      }
      return
    }
    msg += `${QuestStrings.answer[which]}\n\n\tGARRGH! THAT'S RIGHT!!\n`
    mob.getPack().loseHalf()
    msg += packString('\nYou Recieve: ', mob.getPack())
    hero.getPack().mergeList(mob.getPack())
    msg += hero.gainExp(exp)
    hero.addStatus(C.FAME, session.weight)
    msg += hero.gainWits(session.weight)
    noticeToGate(msg)
  }

  function trySeduce() {
    const hero = heroStore.hero!
    const mob = session.mob
    const exp = mob.baseExp()
    const msg = `\tYou waggle your eyebrows and make kissing noises towards ${mob.getName()}.\n`
    if (contest(hero.seduceCharm(), mob.seduceCharm())) {
      let msg2 = `${msg}\tIt smiles and slinks on over. ${select(QuestStrings.seduces)}\n\tAfterwards, ${mob.getName()} gives you a small token of affection\n`
      mob.getPack().loseHalf()
      msg2 += packString('\nYou Recieve: ', mob.getPack())
      hero.getPack().mergeList(mob.getPack())
      hero.addStatus(C.FAME, session.weight)
      msg2 += hero.gainExp(exp)
      msg2 += hero.gainCharm(session.weight)
      noticeToGate(msg2)
    } else if (!mob.isPassive()) {
      startBattle(`${msg}\tIt shrieks with fury at your shallow lies and attacks!\n`)
    } else {
      noticeToGate(`${msg}\tIt shrieks and runs away, giggling.\n`)
    }
  }

  function tryFlee() {
    const hero = heroStore.hero!
    const mob = session.mob
    const exp = mob.baseExp() + Math.trunc(mob.getWits() / 5)
    const tf = hero.thiefRank()
    if (mob.isPassive() || mob.isDefensive()) {
      hero.subFatigue(1)
      noticeToGate(
        `\tYou run like the wind.  Fear lending flight to thy heels.\n\tThe ${mob.getName()} makes no effort to pursue.\n`,
      )
    } else if (mob.isHostile()) {
      let msg = `\tYou run like the wind.  Fear lending flight to thy heels.\n\tThe ${mob.getName()} chases you for a while just to make sure you aren't coming back\n`
      if (tf >= 2) msg += thiefRun()
      noticeToGate(msg)
    } else {
      let hs = hero.runWits()
      if (mob.hasTrait(C.BANDIT)) hs = Math.trunc(hs / 2)
      if (!contest(hs, mob.runWits())) {
        startBattle(
          `\tYou run like the wind.  Fear lending flight to thy heels.\n\tBut the ${mob.getName()} proves to be swifter!\n`,
        )
      } else {
        let msg = `\tThe ${mob.getName()} is left behind, panting. Your fleet feet have just saved your skin.\n`
        if (tf >= 3) msg += thiefRun()
        msg += hero.gainExp(exp)
        msg += hero.gainWits(session.weight)
        noticeToGate(msg)
      }
    }
  }

  function thiefRun(): string {
    const hero = heroStore.hero!
    const mob = session.mob
    if (!contest(hero.getCharm(), mob.getCharm())) return ''
    hero.subFatigue(1)
    return `\nYour 'merchant' training comes in handy. You duck into cover and the ${mob.getName()} passes by.\n`
  }

  function stareDown() {
    const hero = heroStore.hero!
    const mob = session.mob
    mob.reduceMagic(1)
    hero.reduceMagic(1)
    session.opt.redraw(hero)
    const msg = `\tYou and the ${mob.getName()} lock stares in a ferocious contest of wills...`
    if (!contest(hero.getWits(), mob.getWits())) {
      mobControls(`${msg}You blink first!\n`)
    } else {
      heroControls(`${msg}It blinks first!\n`)
    }
  }

  function heroControls(msg: string) {
    const hero = heroStore.hero!
    const mob = session.mob
    const exp = mob.baseExp() + mob.getWits()
    let msg2 = `${msg}\tFirst you take all its treasures. Then you ${select(QuestStrings.controls)}\n`
    msg2 += packString('\nYou Recieve: ', mob.getPack())
    hero.getPack().mergeList(mob.getPack())
    msg2 += hero.gainExp(exp)
    msg2 += hero.gainWits(session.weight * 5)
    noticeToGate(msg2)
  }

  function mobControls(msg: string) {
    const hero = heroStore.hero!
    const mob = session.mob
    if (mob.isAggresive()) {
      const death = heroStore.resolveDeath(null, true)
      noticeToGate(
        `${msg}\tOut of sheer maliciousness, the creature sends you on a long hike over a short cliff.\n${death?.message ?? ''}`,
      )
      return
    }
    const controlled = [...QuestStrings.controlled]
    controlled[0] = `convinces you that you are ${hero.getName()}.`
    if (mob.isPassive()) {
      noticeToGate(`${msg}\nThe ${mob.getName()} expresses its anger when it ${select(controlled)}\n`)
      return
    }
    hero.getPack().loseHalf()
    noticeToGate(`${msg}\n\tFirst the ${mob.getName()} takes half your gear, then it ${select(controlled)}\n`)
  }

  function swapGoods() {
    const hero = heroStore.hero!
    const mob = session.mob
    mob.reduceThief(1)
    hero.reduceThief(1)
    session.opt.nextRound(mob)
    noticeToQuest(
      `\tYou and the ${mob.getName()} start trading gear, and before you know it... You are right back where you started???\n`,
    )
  }

  function heroSwindles() {
    const hero = heroStore.hero!
    const mob = session.mob
    const exp = mob.baseExp() + mob.getCharm()
    if (mob.subPackCount(GT.INSURANCE, 1) === 1) {
      hero.addPackCount(GT.INSURANCE, 1)
      noticeToGate(
        `\tYou start 'trading' in earnest with the ${mob.getName()}, rooting through its back pack as it nods enthusiastically, when you find a magic coupon: Thief Insurance.  Grumbling, you take the receipt and walk away.\n`,
      )
      return
    }
    let msg = `\tYou lay out a complicated deal that the ${mob.getName()} is unable to follow.  By the time you are finished, it is paying you to take all its equipment.\n`
    msg += packString('\nYou Recieve: ', mob.getPack())
    hero.getPack().mergeList(mob.getPack())
    msg += hero.gainExp(exp)
    msg += hero.gainCharm(session.weight * 5)
    noticeToGate(msg)
  }

  function mobSwindles() {
    const hero = heroStore.hero!
    const mob = session.mob
    if (hero.subPackCount(GT.INSURANCE, 1) === 1) {
      noticeToGate(
        `\tThe ${mob.getName()} starts to tell you about this terrific bridge for sale in Brook Land, then it spies your Thief Insurance.  Grumbling, it snags the coupon and makes an escape!\n`,
      )
      return
    }
    if (mob.isAggresive()) {
      hero.getPack().clrQueue()
      noticeToGate(
        `\tThe ${mob.getName()} starts to show you the benefits of trading goods.  Pretty soon you walk away completely satisfied with an empty backpack.\n`,
      )
      return
    }
    if (mob.isPassive()) {
      const cash = hero.getMoney()
      hero.getPack().zero(C.MARKS)
      hero.addPackCount('Rock', 1)
      noticeToGate(`\tThe ${mob.getName()} sells you a 'magic' rock for ${cash} marks, and leaves you a satisfied customer.\n`)
      return
    }
    const cash = hero.getMoney()
    hero.getPack().loseHalf()
    hero.fixPack(C.MARKS, Math.trunc(cash / 2))
    noticeToGate(
      `\tThe ${mob.getName()} makes an irresistable sales pitch.  It only costs you ${cash - Math.trunc(cash / 2)} marks for him to haul away half your gear.\n`,
    )
  }

  function mobFlees(prefix: string | null) {
    const hero = heroStore.hero!
    const mob = session.mob
    const msg = `${prefix ?? ''}\tThe ${mob.getName()} turns and makes tracks rapidly away from you.\n`
    let ms = mob.runWits()
    if (hero.hasTrait(C.BANDIT)) ms = Math.trunc(ms / 2)
    if (!contest(ms, hero.runWits())) {
      startBattle(`${msg}\tBut you catch it before it escapes!\n`)
    } else {
      noticeToGate(`${msg}\tIt manages to stay ahead of you long enough to escape...`)
    }
  }

  function tryToken() {
    const hero = heroStore.hero!
    const mob = session.mob
    const msg = `\tThe ${mob.getName()} fixes you with an intent stare, studying you to the core of your soul.  Finally, it makes a decision.\n`
    if (contest(hero.getPower(), mob.getPower())) {
      let msg2 = `${msg}\tBy some invisible procedure, the ${mob.getName()} has judged you worthy to recieve special training.  You are taken to a remote location where you will learn the secrets of Ieatsu.\n`
      msg2 += hero.gainExp(2 * mob.baseExp())
      msg2 += hero.gainGuts(2 * session.weight)
      msg2 += hero.gainWits(2 * session.weight)
      msg2 += hero.gainCharm(2 * session.weight)
      hero.addGuts(-3)
      hero.addWits(-3)
      hero.addCharm(-3)
      hero.addRank(C.IEATSU, 1)
      hero.addTemp(C.IEATSU, 1)
      hero.subFatigue(10)
      noticeThenNoticeToGate(msg2, TRAINS_TEXT)
    } else if (mob.isAggresive()) {
      startBattle('\tIt launches itself into battle, determined to destroy you!\n')
    } else {
      session.opt.remove(BUSHIDO)
      noticeToQuest(
        `\tThe ${mob.getName()} slaps the token from your hand, then smashes it. Apparently you have failed some unspoken test.\n`,
      )
    }
  }

  function tryCapture() {
    const hero = heroStore.hero!
    const mob = session.mob
    const msg = `\tYou scurry around the water, hopping over logs, rocks and roots.  The ${mob.getName()}  spins away from you squeeking in fear as it leaves behind a trail of sparkling dust.\n`
    if (contest(hero.getWits(), mob.getWits())) {
      let msg2 = `${msg}\tYou Capture It!\n\n*** Bottled Faery found ***`
      hero.addPackCount('Bottled Faery', 1)
      msg2 += hero.gainWits(10)
      msg2 += hero.gainExp(mob.baseExp())
      noticeToGate(msg2)
    } else if (roll(3) >= mob.getStance()) {
      noticeToGate(`${msg}\tThe ${mob.getName()} escapes over a small cliff and quickly vanishes into some hedges.`)
    } else {
      noticeThenBattle(`${msg}\tOkay! Now its mad!`)
    }
  }

  function heroWins() {
    const hero = heroStore.hero!
    const mob = session.mob
    const exp = mob.baseExp() + Math.trunc(((2 * mob.getGuts() + mob.getWits() + mob.getCharm()) * session.weight) / 4)
    hero.setState(C.VICTORY)
    let msg = `You have slain the ${mob.getName()} with tremendous valor.\n`
    msg += packString('\nYou Find: ', mob.getPack())
    hero.getPack().mergeList(mob.getPack())
    if (hero.getOverload() > 0) msg += '*** YOUR PACK IS OVERLOADED ***\n'
    msg += hero.gainExp(exp)
    hero.addStatus(C.FAME, mob.baseFame())
    if (hero.getActions().isMatch(C.BACKSTAB)) {
      msg += hero.gainCharm(session.weight * 3)
      msg += hero.gainGuts(session.weight * 2)
    } else if (hero.getActions().isMatch(C.BERZERK)) {
      msg += hero.gainGuts(session.weight * 5)
    } else {
      msg += hero.gainGuts(session.weight)
    }
    noticeToGate(msg)
  }

  return { choose, battleActionResult }
}
