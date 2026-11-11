import { ksuid as makeKsuid } from 'uniku/ksuid'

export const id = makeKsuid({ secs: readSeconds() })
