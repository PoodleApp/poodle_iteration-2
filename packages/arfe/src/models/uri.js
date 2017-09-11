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
    ? `mid:${encodeURIComponent(messageId)}/${encodeURIComponent(contentId)}`
    : `mid:${encodeURIComponent(messageId)}`
}

const midExp = /(mid:|cid:)([^/]+)(?:\/(.+))?$/

export function parseMidUri (
  uri: URI
): ?{ scheme: string, messageId: ?string, contentId: ?string } {
  const matches = uri.match(midExp)
  if (matches) {
    const scheme = matches[1]
    const messageId =
      scheme === 'mid:' ? decodeURIComponent(matches[2]) : undefined
    const contentId =
      scheme === 'cid:'
        ? decodeURIComponent(matches[2])
        : decodeURIComponent(matches[3])
    return { scheme, messageId, contentId }
  }
}

export function sameUri(x: ?URI, y: ?URI): boolean {
  // TODO: normalization
  return !!x && !!y && (x === y)
}

export function sameEmail(x: ?Email, y: ?Email): boolean {
  // TODO: normalization
  return !!x && !!y && (x === y)
}
