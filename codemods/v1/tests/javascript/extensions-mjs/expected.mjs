import { ksuid as makeKsuid } from 'uniku/ksuid'

export const id = makeKsuid({ msecs: 2 * 1000 })
