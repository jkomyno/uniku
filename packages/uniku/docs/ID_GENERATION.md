# ID Generation Strategy Guidelines

Rules for implementing new ID generators in uniku.

## API Structure

Export a single function with attached static methods:

```typescript
export const generator = Object.assign(mainFunction, {
  toBytes: parseFunction,    // String → Uint8Array (where applicable)
  fromBytes: formatFunction, // Uint8Array → String (where applicable)
  timestamp: extractTime,    // Extract timestamp (time-ordered only)
  isValid: validator,        // Type guard: (id: unknown) => id is string
  NIL: '...',                // Nil/zero value constant
  MAX: '...',                // Maximum value constant
})
```

## Function Overloads

Generators support two modes via overloads:
- **String mode** (default): `generator()` returns a string
- **Buffer mode**: `generator(options, buf, offset)` writes to provided `Uint8Array`

## Options Type

Define an options type with these optional fields:

- `random?: Uint8Array` — Custom random bytes for deterministic tests
- `msecs?: number` — Custom timestamp in milliseconds (time-ordered generators)
- `seq?: number` — Sequence number (only for uuidv7)

## Monotonic State (Time-Ordered Generators)

For time-ordered IDs (uuidv7, ulid, ksuid):

- Maintain module-level state tracking last timestamp and sequence/random
- Document that state persists in serverless warm starts
- When same millisecond: increment sequence or random portion
- When new millisecond: reset with fresh random

## Random Byte Handling

- Use `globalThis.crypto.getRandomValues()` for portability
- Implement byte pooling for hot paths (pre-allocate buffer, refill when exhausted)
- Pool size: 256 bytes is standard

## Validation

Implement `isValid` as a type guard with regex validation:

```typescript
function isValid(id: unknown): id is string {
  return typeof id === 'string' && REGEX.test(id)
}
```

## Entry Point

Each generator has its own entry point (no barrel exports):
- `uniku/uuid/v4`, `uniku/uuid/v7`, `uniku/ulid`, etc.

## Testing

- Mock `Date.now()` for deterministic timestamp tests
- Use `random` option for deterministic output
- Cross-validate with reference npm packages in integration tests
