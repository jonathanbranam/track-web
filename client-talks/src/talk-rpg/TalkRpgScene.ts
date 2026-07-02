import * as Phaser from 'phaser'
import { Beat, BEATS } from './script'

export default class TalkRpgScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TalkRpgScene' })
  }

  create() {
    // Auto-play the initial beat (title screen) on scene start
    this.playSegment(BEATS[0])

    this.game.events.on('beat', (beatIndex: number) => {
      const beat = BEATS[beatIndex]
      this.children.removeAll(true)
      if (!beat) {
        this.game.events.emit('segment-complete')
        return
      }
      this.playSegment(beat)
    })
  }

  playSegment(beat: Beat) {
    const { width, height } = this.scale

    switch (beat.phaserSegment) {
      case 'title-screen': {
        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a)
        bg.setDepth(0)

        const logoRect = this.add.rectangle(width / 2, height * 0.38, width * 0.6, height * 0.22, 0xbf9000)
        logoRect.setDepth(1)

        this.add.text(width / 2, height * 0.38, 'ENGINEERING WITH AI', {
          fontFamily: 'monospace',
          fontSize: `${Math.round(width * 0.035)}px`,
          color: '#ffffff',
          align: 'center',
        }).setOrigin(0.5).setDepth(2)

        const prompt = this.add.text(width / 2, height * 0.78, '▶ BEGIN QUEST', {
          fontFamily: 'monospace',
          fontSize: `${Math.round(width * 0.028)}px`,
          color: '#ffffff',
          align: 'center',
        }).setOrigin(0.5).setDepth(2)

        this.tweens.add({
          targets: prompt,
          alpha: { from: 1, to: 0.2 },
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          onStart: () => {
            this.game.events.emit('segment-complete')
          },
        })
        break
      }

      case 'name-entry-stub': {
        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a)
        bg.setDepth(0)

        this.add.text(width / 2, height / 2, 'JON', {
          fontFamily: 'monospace',
          fontSize: `${Math.round(width * 0.08)}px`,
          color: '#ffffff',
          align: 'center',
        }).setOrigin(0.5).setDepth(1)

        this.game.events.emit('segment-complete')
        break
      }

      default:
        this.game.events.emit('segment-complete')
        break
    }
  }
}
