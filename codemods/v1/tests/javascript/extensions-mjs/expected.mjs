import { ksuid as makeKsuid } from 'uniku/ksuid'

export const id = makeKsuid({ msecs: readSeconds() * 1000 })
