export function buildDidMetadata(pdsUrl: string, username: string, didKey: string): string {
  const handle = username && pdsUrl ? `${username.toLowerCase()}.${pdsUrl}` : ''
  let endpoint = pdsUrl || ''
  if (endpoint && !endpoint.startsWith('http')) endpoint = `https://${endpoint}`

  return JSON.stringify({
    services: {
      atproto_pds: { type: 'AtprotoPersonalDataServer', endpoint },
    },
    alsoKnownAs: handle ? [`at://${handle}`] : [],
    verificationMethods: { atproto: didKey },
  }, null, 2)
}
