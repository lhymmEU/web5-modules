export { bytesFrom, hexFrom } from "@web5-modules/utils";

export function checkUsernameFormat(username: string): boolean {
  if (username.length < 4 || username.length > 18) {
    return false;
  }
  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
  return usernameRegex.test(username);
}

export async function getDidByUsername(username: string, pdsAPIUrl: string): Promise<string | null> {
  try {
    const handle = `${username.toLowerCase()}.${pdsAPIUrl}`;
    const url = `https://${handle}/.well-known/atproto-did`;
    const response = await fetch(url);
    const text = await response.text();

    if (text.trim().startsWith('did:ckb')) {
      return text.trim();
    } else if (text.includes('User not found')) {
      return '';
    } else {
      return null;
    }
  } catch (e: unknown) {
    console.error(e);
    return null;
  }
}
