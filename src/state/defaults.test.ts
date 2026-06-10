import { DEFAULT_PREFERENCES, normalizePreferences } from './defaults'

describe('preferences defaults', () => {
  it('migrates old unsupported timbres to piano', () => {
    const migrated = normalizePreferences({
      ...DEFAULT_PREFERENCES,
      audio: {
        ...DEFAULT_PREFERENCES.audio,
        timbre: 'steel_guitar' as never
      }
    })

    expect(migrated.audio.timbre).toBe('piano')
  })

  it('keeps supported guitar timbre', () => {
    const migrated = normalizePreferences({
      ...DEFAULT_PREFERENCES,
      audio: {
        ...DEFAULT_PREFERENCES.audio,
        timbre: 'guitar'
      }
    })

    expect(migrated.audio.timbre).toBe('guitar')
  })
})
