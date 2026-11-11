import { cuidv2 } from 'uniku/cuid/v2'
import { ERROR_CODES, InvalidInputError } from 'uniku/errors'
import { ID_GENERATORS } from 'uniku/generators'
import { ksuid } from 'uniku/ksuid'
import { nanoid } from 'uniku/nanoid'
import { objectid } from 'uniku/objectid'
import { tsid } from 'uniku/tsid'
import { typeid } from 'uniku/typeid'
import { ulid } from 'uniku/ulid'
import { uuidv4 } from 'uniku/uuid/v4'
import { uuidv5 } from 'uniku/uuid/v5'
import { uuidv7 } from 'uniku/uuid/v7'
import { xid } from 'uniku/xid'

const status = document.querySelector<HTMLElement>('#status')
const report = (outcome: 'pass' | 'fail', message = '') => fetch(`/__${outcome}`, { method: 'POST', body: message })

try {
  if (!status) throw new Error('The browser smoke status element is missing.')

  const stringIds = [uuidv4(), uuidv7(), ulid(), typeid('smoke'), cuidv2(), nanoid(), ksuid(), objectid(), xid()]

  if (!stringIds.every((id) => typeof id === 'string' && id.length > 0)) {
    throw new Error('A string generator returned an invalid value.')
  }
  if (uuidv5('www.example.com', uuidv5.DNS) !== '2ed6657d-e927-568b-95e1-2665a8aea6a2') {
    throw new Error('UUID v5 did not reproduce the RFC 9562 test vector.')
  }
  if (uuidv5.namespace(uuidv5.URL)('日本語🦄') !== 'd2cdb36d-613b-5f03-a81c-eaa948daae54') {
    throw new Error('UUID v5 did not hash a non-ASCII name as UTF-8.')
  }
  if (typeof tsid() !== 'bigint') {
    throw new Error('TSID did not return a bigint.')
  }
  if (!(new InvalidInputError('LENGTH_OUT_OF_RANGE', 'smoke') instanceof Error)) {
    throw new Error('The public error class is not an Error.')
  }
  if (!ERROR_CODES.includes('LENGTH_OUT_OF_RANGE') || new Set(ERROR_CODES).size !== ERROR_CODES.length) {
    throw new Error('The public error code catalog is incomplete or contains duplicates.')
  }
  if (!ID_GENERATORS.includes('uuid') || !ID_GENERATORS.includes('tsid') || !ID_GENERATORS.includes('xid')) {
    throw new Error('The generator manifest is incomplete.')
  }

  status.textContent = 'UNIKU_BROWSER_SMOKE_OK'
  await report('pass')
} catch (error) {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
  if (status) status.textContent = `UNIKU_BROWSER_SMOKE_FAILED: ${message}`
  await report('fail', message)
}
