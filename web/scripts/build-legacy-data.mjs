#!/usr/bin/env node
// One-time migration: parses the legacy `{type|field|...}` entity format
// (documented in /SPEC.md, originally read by DCourt/Tools/Buffer.java +
// DCourt/Items/*.java factory() methods) out of the decompiled Java sources
// and emits static JSON for web/src/data/. Not part of the app runtime —
// re-run only if the Java source data changes.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const javaRoot = join(__dirname, '../../src/main/java/DCourt')
const dataRoot = join(__dirname, '../src/data')

// --- Java string literal extraction -----------------------------------

function extractStringConstants(src) {
  const re = /public static final String (\w+)\s*=\s*"((?:[^"\\]|\\.)*)";/g
  const out = {}
  let m
  while ((m = re.exec(src))) {
    out[m[1]] = unescapeJava(m[2])
  }
  return out
}

function unescapeJava(s) {
  return s.replace(/\\(.)/g, (_, ch) => {
    switch (ch) {
      case 'n':
        return '\n'
      case 't':
        return '\t'
      case 'r':
        return '\r'
      default:
        return ch
    }
  })
}

// --- Buffer.java tokenizer port (read-only, just enough to parse data) -

class Buf {
  constructor(text) {
    this.text = text
    this.size = text.length
    this.index = 0
    this.mark = 0
  }
  charAt(i) {
    return i < 0 || i >= this.size ? '' : this.text[i]
  }
  skipWhite() {
    while (this.index < this.size && this.text.charCodeAt(this.index) <= 32) this.index++
  }
  begin() {
    this.skipWhite()
    if (this.charAt(this.index) !== '{') return false
    this.index++
    return true
  }
  end() {
    this.skipWhite()
    if (this.charAt(this.index) !== '}') return false
    this.index++
    return true
  }
  split() {
    this.skipWhite()
    if (this.charAt(this.index) !== '|') return false
    this.index++
    return true
  }
  setMark() {
    this.mark = this.index
  }
  goMark() {
    this.index = this.mark
  }
  token() {
    this.skipWhite()
    if (this.index >= this.size) return ''
    const start = this.index
    let c
    while (this.index < this.size && (c = this.charAt(this.index)) !== '{' && c !== '|' && c !== '}') {
      this.index++
    }
    return this.text.slice(start, this.index).trim()
  }
  num() {
    const n = parseInt(this.token(), 10)
    return Number.isNaN(n) ? 0 : n
  }
  match(val) {
    this.setMark()
    if (val === this.token()) return true
    this.goMark()
    return false
  }
  startsWith(s) {
    this.skipWhite()
    return this.text.startsWith(s, this.index)
  }
}

// --- Item.factory dispatch port -----------------------------------------

function itemFactory(buf) {
  if (buf.startsWith('{#|')) return countFactory(buf)
  if (buf.startsWith('{@|')) return randomFactory(buf)
  if (buf.startsWith('{%|')) return percentFactory(buf)
  if (buf.startsWith('{=|')) return valueFactory(buf)
  if (buf.startsWith('{~|') || buf.startsWith('{itList|')) return listFactory(buf)
  if (buf.startsWith('{itArms|')) return armsFactory(buf)
  if (buf.startsWith('{itText|')) return textFactory(buf)
  if (buf.startsWith('{itNote|')) return noteFactory(buf)
  if (buf.startsWith('{itMonster|')) return monsterFactory(buf)
  return tokenFactory(buf)
}

function tokenFactory(buf) {
  const name = buf.token()
  if (!name) return null
  return { type: 'token', name }
}

function countLike(buf, type) {
  if (!buf.begin()) return null
  const icon = buf.token()
  if (icon.length !== 1) return null
  let name = null
  let count = 0
  if (buf.split()) name = buf.token()
  if (buf.split()) count = buf.num()
  buf.end()
  return { type, name, count }
}
const countFactory = (buf) => countLike(buf, 'count')
const percentFactory = (buf) => countLike(buf, 'percent')
const randomFactory = (buf) => countLike(buf, 'random')

function valueFactory(buf) {
  if (!buf.begin() || !buf.match('=')) return null
  let name = null
  let value = null
  if (buf.split()) name = buf.token()
  if (buf.split()) value = buf.token()
  buf.end()
  return { type: 'value', name, value }
}

function listFactory(buf) {
  if (!buf.begin()) return null
  if ((!buf.match('itList') && !buf.match('~')) || !buf.split()) return null
  const name = buf.token()
  const items = []
  while (buf.split()) {
    const it = itemFactory(buf)
    if (it) items.push(it)
  }
  buf.end()
  return { type: 'list', name, items }
}

function armsFactory(buf) {
  if (!buf.begin() || !buf.match('itArms') || !buf.split()) return null
  const name = buf.token()
  let attack = 0
  let defend = 0
  let skill = 0
  if (buf.split()) attack = buf.num()
  if (buf.split()) defend = buf.num()
  if (buf.split()) skill = buf.num()
  const items = []
  while (buf.split()) {
    const it = itemFactory(buf)
    if (it) items.push(it)
  }
  buf.end()
  return { type: 'arms', name, attack, defend, skill, items }
}

function textFactory(buf) {
  if (!buf.begin() || !buf.match('itText') || !buf.split()) return null
  const name = buf.token()
  let text = null
  if (buf.split()) text = buf.token()
  const items = []
  while (buf.split()) {
    const it = itemFactory(buf)
    if (it) items.push(it)
  }
  buf.end()
  return { type: 'text', name, text, items }
}

function noteFactory(buf) {
  if (!buf.begin() || !buf.match('itNote') || !buf.split()) return null
  const name = buf.token()
  const items = []
  while (buf.split()) {
    const it = itemFactory(buf)
    if (it) items.push(it)
  }
  buf.end()
  return { type: 'note', name, items }
}

function monsterFactory(buf) {
  if (!buf.begin() || !buf.match('itMonster') || !buf.split()) return null
  const name = buf.token()
  let guts = 0
  let wits = 0
  let charm = 0
  if (buf.split()) guts = buf.num()
  if (buf.split()) wits = buf.num()
  if (buf.split()) charm = buf.num()
  let baseA = 0
  let baseD = 0
  let baseS = 0
  if (buf.split()) baseA = buf.num()
  if (buf.split()) baseD = buf.num()
  if (buf.split()) baseS = buf.num()
  const items = []
  while (buf.split()) {
    const it = itemFactory(buf)
    if (it) items.push(it)
  }
  buf.end()
  return { type: 'monster', name, guts, wits, charm, baseA, baseD, baseS, items }
}

// --- shape raw parsed trees into the schema the domain layer wants -----

function findList(items, name) {
  return items.find((it) => it.type === 'list' && it.name === name)
}
function findValue(items, name) {
  const it = items.find((i) => i.type === 'value' && i.name === name)
  return it ? it.value : null
}

function shapeMonster(key, raw) {
  const values = findList(raw.items, 'values')
  const passion = values ? findValue(values.items, 'passion') : null
  const adjust = values ? values.items.some((it) => it.type === 'token' && it.name === 'adjust') : false
  const pack = findList(raw.items, 'pack')?.items ?? []
  const temp = findList(raw.items, 'temp')?.items ?? []
  const gear = findList(raw.items, 'gear')?.items ?? []
  const opts = (findList(raw.items, 'opts')?.items ?? []).map((it) => it.name)
  const textNode = raw.items.find((it) => it.type === 'text' && it.name === 'text')
  const substitutions = {}
  if (textNode) {
    for (const it of textNode.items) {
      if (it.type === 'list') substitutions[it.name] = it.items.map((sub) => sub.name)
    }
  }
  return {
    key,
    name: raw.name,
    guts: raw.guts,
    wits: raw.wits,
    charm: raw.charm,
    baseAttack: raw.baseA,
    baseDefend: raw.baseD,
    baseSkill: raw.baseS,
    picture: findValue(raw.items, 'pic'),
    passion,
    adjust,
    pack: pack.map(shapeCountItem),
    temp: temp.map(shapeCountItem),
    gear: shapeGear(gear),
    opts,
    text: textNode ? { template: textNode.text, substitutions } : null,
  }
}

function shapeCountItem(it) {
  return { kind: it.type, name: it.name, count: it.count }
}

function shapeGear(items) {
  // gear slots are itPercent entries (weapon, armour, ...) with occasional
  // bare trait tokens (e.g. "bless") applied to the whole gear set
  const slots = items.filter((it) => it.type !== 'token').map(shapeCountItem)
  const traits = items.filter((it) => it.type === 'token').map((it) => it.name)
  return { slots, traits }
}

function shapeArms(raw) {
  return {
    name: raw.name,
    attack: raw.attack,
    defend: raw.defend,
    skill: raw.skill,
    traits: raw.items.filter((it) => it.type === 'token').map((it) => it.name),
  }
}

// --- extract + parse -----------------------------------------------------

const monsterKeyToConst = {
  'Town:Guard': 'townGuard',
  'Castle:Guard': 'castleGuard',
  'Vortex:Guard': 'vortexGuard',
  Faery: 'faeryRing',
  'Fields:Rodent': 'fieldRodent',
  'Fields:Goblin': 'fieldGoblin',
  'Fields:Gypsy': 'fieldGypsy',
  'Fields:Centaur': 'fieldCentaur',
  'Fields:Merchant': 'fieldMerchant',
  'Fields:Wizard': 'fieldWizard',
  'Fields:Soldier': 'fieldSoldier',
  'Forest:Boar': 'forestBoar',
  'Forest:Orc': 'forestOrc',
  'Forest:Elf': 'forestElf',
  'Forest:Gryphon': 'forestGryphon',
  'Forest:Snot': 'forestSnot',
  'Forest:Unicorn': 'forestUnicorn',
  'Mound:Gate': 'moundGate',
  'Mound:Gang': 'moundGang',
  'Mound:Rager': 'moundRager',
  'Mound:Thief': 'moundThief',
  'Mound:Worm': 'moundWorm',
  'Mound:Mage': 'moundMage',
  'Mound:Guard': 'moundGuard',
  'Mound:Vault': 'moundVault',
  'Mound:Champ': 'moundChamp',
  'Mound:Queen': 'moundQueen',
  'Hills:Goat': 'hillsGoat',
  'Hills:Basilisk': 'hillsBasilisk',
  'Hills:Wyvern': 'hillsWyvern',
  'Hills:Troll': 'hillsTroll',
  'Hills:Sphinx': 'hillsSphinx',
  'Hills:Giant': 'hillsGiant',
  'Hills:Dragon': 'hillsDragon',
  'Dunjeon:Rodent': 'dungRodent',
  'Dunjeon:Snot': 'dungSnot',
  'Dunjeon:Rager': 'dungRager',
  'Dunjeon:Gang': 'dungGang',
  'Dunjeon:Troll': 'dungTroll',
  'Dunjeon:Mage': 'dungMage',
  'Ocean:Traders': 'seaTraders',
  'Ocean:Serpent': 'seaSerpent',
  'Ocean:Mermaid': 'seaMermaid',
  'Brasil:Harpy': 'braHarpy',
  'Brasil:Fighter': 'braFighter',
  'Brasil:Golem': 'braGolem',
  'Brasil:Medusa': 'braMedusa',
  'Brasil:Hero': 'braHero',
  'Shang:Gunner': 'shaGunner',
  'Shang:Plague': 'shaPlague',
  'Shang:Peasant': 'shaPeasant',
  'Shang:Ninja': 'shaNinja',
  'Shang:Shogun': 'shaShogun',
  'Shang:Panda': 'shaPanda',
  'Shang:Samurai': 'shaSamurai',
}

const questsSrc = readFileSync(join(javaRoot, 'Screens/Quest/Quests.java'), 'utf8')
const vquestsSrc = readFileSync(join(javaRoot, 'Screens/Quest/VQuests.java'), 'utf8')
const monsterConsts = { ...extractStringConstants(questsSrc), ...extractStringConstants(vquestsSrc) }

const monsters = Object.entries(monsterKeyToConst).map(([key, constName]) => {
  const raw = monsterConsts[constName]
  if (!raw) throw new Error(`missing monster constant ${constName} for key ${key}`)
  const parsed = monsterFactory(new Buf(raw))
  if (!parsed) throw new Error(`failed to parse monster ${key}`)
  return shapeMonster(key, parsed)
})

const armsSrc = readFileSync(join(javaRoot, 'Control/ArmsTable.java'), 'utf8')
const armsRe = /add\("(\{itArms\|[^"]*)"\);/g
const arms = []
let am
while ((am = armsRe.exec(armsSrc))) {
  const parsed = armsFactory(new Buf(am[1]))
  if (!parsed) throw new Error(`failed to parse arms entry: ${am[1]}`)
  arms.push(shapeArms(parsed))
}

writeFileSync(join(dataRoot, 'monsters.json'), JSON.stringify(monsters, null, 2) + '\n')
writeFileSync(join(dataRoot, 'arms.json'), JSON.stringify(arms, null, 2) + '\n')

console.log(`wrote ${monsters.length} monsters, ${arms.length} arms`)
