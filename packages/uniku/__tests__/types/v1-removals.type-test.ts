import { type CuidV2, type CuidV2Options, cuidv2 } from 'uniku/cuid/v2'
import { type KsuidOptions, ksuid } from 'uniku/ksuid'
import { type NanoidOptions, nanoid } from 'uniku/nanoid'
import { type ObjectIdOptions, objectid } from 'uniku/objectid'
import { type TypeidOptions, typeid } from 'uniku/typeid'
import { type UuidV7Options, uuidv7 } from 'uniku/uuid/v7'
import { type XidOptions, xid } from 'uniku/xid'

type AssertTrue<T extends true> = T
type DoesNotHaveKey<T, Key extends PropertyKey> = Key extends keyof T ? false : true

type KsuidHasNoSecs = AssertTrue<DoesNotHaveKey<KsuidOptions, 'secs'>>
type ObjectIdHasNoSecs = AssertTrue<DoesNotHaveKey<ObjectIdOptions, 'secs'>>
type XidHasNoSecs = AssertTrue<DoesNotHaveKey<XidOptions, 'secs'>>
type UuidV7HasNoSeq = AssertTrue<DoesNotHaveKey<UuidV7Options, 'seq'>>
type TypeidHasNoSeq = AssertTrue<DoesNotHaveKey<TypeidOptions, 'seq'>>
type NanoidHasNoSize = AssertTrue<DoesNotHaveKey<NanoidOptions, 'size'>>
type CuidV2HasNoCuid2Value = AssertTrue<DoesNotHaveKey<typeof import('uniku/cuid/v2'), 'cuid2'>>

const cuidGenerator: CuidV2 = cuidv2
const cuidOptions: CuidV2Options = { length: 24 }
void cuidGenerator(cuidOptions)

ksuid({ msecs: 1_500_000_000_000 })
objectid({ msecs: 1_700_000_000_000 })
xid({ msecs: 1_700_000_000_000 })
uuidv7({ counter: 1 })
typeid('user', { counter: 1 })
nanoid({ length: 10 })
nanoid(10)

// @ts-expect-error v1 removes the legacy CUID2 package subpath.
import 'uniku/cuid2'

// @ts-expect-error v1 accepts only millisecond timestamp options.
ksuid({ secs: 1_500_000_000 })
// @ts-expect-error v1 accepts only millisecond timestamp options.
objectid({ secs: 1_700_000_000 })
// @ts-expect-error v1 accepts only millisecond timestamp options.
xid({ secs: 1_700_000_000 })
// @ts-expect-error v1 names the UUID v7 sequence input counter.
uuidv7({ seq: 1 })
// @ts-expect-error TypeID inherits the UUID v7 counter option.
typeid('user', { seq: 1 })
// @ts-expect-error Nanoid object options use length; size remains positional only.
nanoid({ size: 10 })

export type V1RemovalContracts = [
  KsuidHasNoSecs,
  ObjectIdHasNoSecs,
  XidHasNoSecs,
  UuidV7HasNoSeq,
  TypeidHasNoSeq,
  NanoidHasNoSize,
  CuidV2HasNoCuid2Value,
]

export type RemovedCuidNameContracts = [
  // @ts-expect-error the canonical module does not export the legacy cuid2 value.
  typeof import('uniku/cuid/v2')['cuid2'],
  // @ts-expect-error the canonical module does not export the legacy Cuid2 type.
  import('uniku/cuid/v2').Cuid2,
  // @ts-expect-error the canonical module does not export the legacy Cuid2Options type.
  import('uniku/cuid/v2').Cuid2Options,
]
