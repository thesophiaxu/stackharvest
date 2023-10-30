const escapeChars: Record<string, string> = {
  '¢': 'cent',
  '£': 'pound',
  '¥': 'yen',
  '€': 'euro',
  '©': 'copy',
  '®': 'reg',
  '<': 'lt',
  '>': 'gt',
  '"': 'quot',
  '&': 'amp',
  "'": '#39',
}

let regexString = '['
for (const key in escapeChars) {
  regexString += key
}
regexString += ']'

const regex = new RegExp(regexString, 'g')

export function escapeHTML(str: string) {
  return str.replace(regex, function (m) {
    return '&' + escapeChars[m] + ';'
  })
}

export function isValidUUID(uuid: any) {
  if (typeof uuid !== 'string') return false
  const regex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
  return regex.test(uuid)
}

export function normalizeAttribute(attribute: string) {
  // Remove leading underscores
  let normalizedAttribute = attribute.replace(/^_+/, '')

  // Trailing
  normalizedAttribute = normalizedAttribute.replace(/_+$/, '')

  // Convert camelCase to kebab-case
  normalizedAttribute = normalizedAttribute
    .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2')
    .toLowerCase()

  // Convert underscore to hyphen
  normalizedAttribute = normalizedAttribute.replace(/_+/g, '-')

  return normalizedAttribute
}

export function hashCode(s: string) {
  let h
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(31, h as any) + s.charCodeAt(i)) | 0
  return h
}

export function maxOverlap(s1: string, s2: string) {
  const m = s1.length,
    n = s2.length

  // Create a 2D table to store lengths of longest common suffixes of substrings.
  // Note that dp[i][j] contains length of longest common suffix of s1[0..i-1]
  // and s2[0..j-1].
  const dp = Array.from(Array(m + 1), () => new Array(n + 1).fill(0))

  let maxLen = 0 // Length of longest common substring

  // Compute longest common suffix in bottom-up manner
  for (let i = 0; i <= m; i++) {
    for (let j = 0; j <= n; j++) {
      if (i == 0 || j == 0) {
        dp[i][j] = 0
      } else if (s1[i - 1] == s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
        maxLen = Math.max(maxLen, dp[i][j])
      } else {
        dp[i][j] = 0
      }
    }
  }
  return maxLen
}

export function tryJSONParse(str: string) {
  try {
    return JSON.parse(str)
  } catch (e) {
    return null
  }
}
