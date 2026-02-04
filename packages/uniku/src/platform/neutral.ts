const randomUUID: () => string = globalThis.crypto.randomUUID.bind(globalThis.crypto)
const randomFill: (buf: Uint8Array) => void = globalThis.crypto.getRandomValues.bind(globalThis.crypto)

export { randomUUID, randomFill }
