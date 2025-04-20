import { Buffer } from 'buffer'
import process from 'process'

window.global = window as any
window.process = process
window.Buffer = Buffer as any 