import { describe, expect, test } from '@jest/globals'
import { themeTokenIds, themeTokens } from '../tokens'

describe('theme tokens', () => {
  test('includes known flattened ids', () => {
    expect(themeTokenIds).toEqual(expect.arrayContaining(['sys.color.primary', 'sys.shadow.dropdown']))
  })

  test('every leaf value is represented in the flattened list', () => {
    const collect = (obj: Record<string, any>, prefix = ''): string[] =>
      Object.entries(obj).flatMap(([key, value]) => {
        const id = prefix ? `${prefix}.${key}` : key
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return collect(value, id)
        }
        return [id]
      })

    const flattened = collect(themeTokens as unknown as Record<string, any>)
    expect(new Set(themeTokenIds)).toEqual(new Set(flattened))
  })
})
