import { SAMPLE_CONFIGS } from './engine'

describe('sample audio engine configuration', () => {
  it('uses local piano and guitar sample folders', () => {
    expect(SAMPLE_CONFIGS.piano.baseUrl).toBe('/samples/piano/')
    expect(SAMPLE_CONFIGS.guitar.baseUrl).toBe('/samples/guitar/')
  })

  it('maps enough anchor samples for repitched playback', () => {
    expect(Object.keys(SAMPLE_CONFIGS.piano.urls)).toEqual([
      'C3',
      'E3',
      'G3',
      'C4',
      'E4',
      'G4',
      'C5',
      'E5',
      'G5',
      'C6'
    ])
    expect(Object.keys(SAMPLE_CONFIGS.guitar.urls)).toEqual(['E2', 'A2', 'D3', 'G3', 'B3', 'E4', 'A4', 'D5'])
  })
})
