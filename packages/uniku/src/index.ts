export function canIUseCrypto() {
  if (!crypto?.getRandomValues) {
    throw new Error('WebCrypto API not available. Ensure globalThis.crypto is defined.')
  }

  return true
}
