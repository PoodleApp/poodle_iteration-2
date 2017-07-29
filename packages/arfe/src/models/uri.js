/* @flow */

export type URI = string

type Email = string

// TODO: normalize URIs
export function equals(x: URI, y: URI): boolean {
  return x === y
}

export function mailtoUri(email: Email): URI {
  // TODO: Should we normalize? Maybe lowercase?
  return `mailto:${email}`
}

export function midUri(messageId: string, contentId: ?string): URI {
  return contentId
    ? `mid:${messageId}/${contentId}`
    : `mid:${messageId}`
}

export function sameUri(x: URI, y: URI): boolean {
  // TODO: normalization?
  return x === y
}

export function sameEmail(x: Email, y: Email): boolean {
  // TODO: normalization
  return x === y
}
