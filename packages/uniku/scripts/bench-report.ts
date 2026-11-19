#!/usr/bin/env bun
import { writeFileSync } from 'node:fs'
import { benchResultsFromVitestReport, loadVitestJsonReport } from './bench-results'

const [reportPath = 'bench-report.json', outputPath = 'bench-results.json'] = process.argv.slice(2)

const results = benchResultsFromVitestReport(loadVitestJsonReport(reportPath))
writeFileSync(outputPath, `${JSON.stringify(results, null, 2)}\n`)
