import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import SoundToggle, { SOUND_OFF_MESSAGE } from './SoundToggle.tsx'

describe('강의실 소리 버튼', () => {
  it('기본은 꺼져 있고 새소리와 잔향을 각각 누를 수 있다', () => {
    const html = renderToStaticMarkup(<SoundToggle />)
    expect(html).toContain('창밖 새소리')
    expect(html).toContain('실내 잔향')
    expect(html).toContain(SOUND_OFF_MESSAGE)
    expect(html).toContain('aria-pressed="false"')
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(2)
    expect(html).not.toContain('role="alert"')
  })
})
