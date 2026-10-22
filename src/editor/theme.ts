/*
 * Neon Coast for the editor: the pixel palette from phareim.no (themes/base/pixel/palette.ts) on the night background.
 * Cyan is you (cursor, focus, matches), pink is a keyword, gold a string, orange a number, teal a property.
 * Code is set in JetBrains Mono; the 5×7 pixel font is for the chrome around it.
 */
import { HighlightStyle } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

export const PAL = {
  night: '#0b0616',
  shade: '#1c1030',
  dusk: '#2a1f4a',
  white: '#fff4ff',
  ink: '#cfc6ff',
  muted: '#8f86b8',
  dim: '#5a5285',
  cyan: '#2ff3ff',
  pink: '#ff2fa0',
  rose: '#ff8ae0',
  violet: '#9a4ff0',
  gold: '#ffd23f',
  orange: '#ff8a3d',
  red: '#ff3b5c',
  lime: '#b6ff4a',
  teal: '#3fd8b0',
} as const

export const neonTheme = EditorView.theme(
  {
    '&': {
      color: PAL.ink,
      backgroundColor: 'transparent',
    },
    '.cm-scroller': {
      fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
      lineHeight: '1.6',
    },
    '.cm-content': { caretColor: PAL.cyan, padding: '12px 0' },
    '&.cm-focused .cm-cursor': {
      borderLeft: `2px solid ${PAL.cyan}`,
      boxShadow: `0 0 6px ${PAL.cyan}`,
    },
    '.cm-cursor': { borderLeft: `2px solid ${PAL.cyan}` },
    '&.cm-focused': { outline: 'none' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'rgba(154, 79, 240, 0.38)',
    },
    '.cm-activeLine': { backgroundColor: 'rgba(47, 243, 255, 0.05)' },
    '.cm-selectionMatch': { backgroundColor: 'rgba(47, 243, 255, 0.14)' },
    '&.cm-focused .cm-matchingBracket': {
      backgroundColor: 'rgba(47, 243, 255, 0.18)',
      outline: `1px solid rgba(47, 243, 255, 0.55)`,
    },
    '&.cm-focused .cm-nonmatchingBracket': { backgroundColor: 'rgba(255, 59, 92, 0.3)' },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      color: PAL.dim,
      border: 'none',
      borderRight: `2px solid rgba(47, 243, 255, 0.12)`,
    },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 12px', minWidth: '2ch' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: PAL.cyan },
    '.cm-errorLine': {
      backgroundColor: 'rgba(255, 59, 92, 0.14)',
      boxShadow: `inset 3px 0 0 ${PAL.red}`,
    },
    '.cm-placeholder': { color: PAL.dim },
    '.cm-searchMatch': { backgroundColor: 'rgba(255, 210, 63, 0.22)', outline: `1px solid rgba(255, 210, 63, 0.5)` },
    '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'rgba(255, 210, 63, 0.4)' },
    '.cm-panels': { backgroundColor: PAL.shade, color: PAL.ink },
    '.cm-panels.cm-panels-bottom': { borderTop: `2px solid ${PAL.cyan}` },
    '.cm-panels.cm-panels-top': { borderBottom: `2px solid ${PAL.cyan}` },
    '.cm-tooltip': {
      backgroundColor: PAL.night,
      color: PAL.ink,
      border: 'none',
      boxShadow: `0 -2px 0 ${PAL.cyan}, 0 2px 0 ${PAL.cyan}, -2px 0 0 ${PAL.cyan}, 2px 0 0 ${PAL.cyan}, 0 8px 24px rgba(0, 0, 0, 0.6)`,
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul': {
      fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
      maxHeight: '14em',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li': { padding: '2px 10px 2px 4px', lineHeight: '1.5' },
    '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: PAL.cyan, color: PAL.night },
    '.cm-tooltip-autocomplete ul li[aria-selected] .cm-completionDetail': { color: PAL.shade },
    '.cm-tooltip-autocomplete ul li[aria-selected] .cm-completionIcon': { color: PAL.night },
    '.cm-completionMatchedText': { textDecoration: 'none', color: PAL.gold },
    '.cm-tooltip-autocomplete ul li[aria-selected] .cm-completionMatchedText': { color: PAL.night },
    '.cm-completionDetail': { color: PAL.muted, fontStyle: 'normal', marginLeft: '1em' },
    '.cm-completionIcon': { width: '1.4em', opacity: '1', color: PAL.muted },
    '.cm-completionIcon-keyword': { color: PAL.pink },
    '.cm-completionIcon-function, .cm-completionIcon-method': { color: PAL.cyan },
    '.cm-completionIcon-variable': { color: PAL.ink },
    '.cm-completionIcon-property': { color: PAL.teal },
    '.cm-completionIcon-class': { color: PAL.violet },
    '.cm-completionIcon-text': { color: PAL.gold },
  },
  { dark: true },
)

export const neonHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword], color: PAL.pink },
  { tag: [t.string, t.special(t.string), t.regexp], color: PAL.gold },
  { tag: [t.number, t.bool, t.null, t.atom], color: PAL.orange },
  { tag: [t.function(t.variableName), t.function(t.definition(t.variableName))], color: PAL.cyan },
  { tag: [t.function(t.propertyName)], color: PAL.cyan },
  { tag: [t.definition(t.variableName)], color: PAL.white },
  { tag: t.variableName, color: PAL.ink },
  { tag: [t.propertyName, t.definition(t.propertyName)], color: PAL.teal },
  { tag: [t.className, t.typeName, t.definition(t.className)], color: PAL.violet },
  { tag: [t.self, t.special(t.variableName)], color: PAL.rose },
  { tag: [t.comment, t.lineComment, t.blockComment], color: PAL.muted },
  { tag: [t.operator, t.arithmeticOperator, t.logicOperator, t.compareOperator], color: PAL.rose },
  { tag: [t.punctuation, t.derefOperator, t.separator, t.bracket, t.paren, t.brace, t.squareBracket], color: PAL.muted },
  { tag: t.escape, color: PAL.lime },
  { tag: t.invalid, color: PAL.red },
])
