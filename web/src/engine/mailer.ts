// Port of DCourt/Screens/Utility/arPackage.java's static send() - shared by
// the interactive arPackage.vue screen (player-authored mail) and system-
// composed mail elsewhere (arClanHall's petition/grant/denial notes, later
// arQueen's Invest). Thin wrapper over cgiClient.sendMail returning an error
// string (matching Buffer.isError()'s "peek() the message" shape) or null on
// success, same contract as Java's own `send()`.
import { sendMail } from './cgiClient'
import type { ItList } from '../domain/itList'

export async function sendPackage(from: string, to: string, label: string, mail: ItList): Promise<string | null> {
  const result = await sendMail(from, to, label, mail.toJSON())
  return result.ok ? null : result.error
}
