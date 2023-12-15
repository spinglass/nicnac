namespace maze {
    enum Effect {
        Pill,
        Power,
        Count
    }

    export class Audio {
        sounds: music.Playable[]

        constructor() {
            this.sounds = []
            this.sounds.length = Effect.Count
        }

        init() {
            this.sounds[Effect.Pill] = music.createSoundEffect(WaveShape.Sine, 838, 2584, 120, 120, 60, SoundExpressionEffect.None, InterpolationCurve.Linear)
            this.sounds[Effect.Power] = music.melodyPlayable(music.powerUp)

            // register for events
            const events = getMaze().events
            events.register(Event.Pill, () => this.play(Effect.Pill))
            events.register(Event.Power, () => this.play(Effect.Power))
        }

        private play(effect: Effect) {
            const s = this.sounds[effect]
            if (s) {
                music.play(s, music.PlaybackMode.InBackground)
            }
        }
    }
}