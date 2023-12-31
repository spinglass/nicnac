namespace maze {
    export class Hero {
        mover: Mover
        images: DirImage
        chaserMode: ChaserMode

        constructor() {
            this.mover = new Mover()
            this.images = new DirImage()
        }

        init() {
            this.images.load("hero")
            this.mover.init(this.images)
            this.mover.fastTurn = true
        }

        initLevel() {
            this.mover.hx = map.home.x
            this.mover.hy = map.home.y
            this.mover.place()
        }

        update() {
            if (!this.mover.isReady()) {
                return
            }

            if (controller.up.isPressed()) {
                this.mover.request = Direction.Up
            } else if (controller.down.isPressed()) {
                this.mover.request = Direction.Down
            } else if (controller.left.isPressed()) {
                this.mover.request = Direction.Left
            } else if (controller.right.isPressed()) {
                this.mover.request = Direction.Right
            }

            if (this.chaserMode == ChaserMode.Fright) {
                this.mover.speed = level.speedHeroFright
            } else {
                this.mover.speed = level.speedHero
            }
            this.mover.update()
            this.mover.setImage()

            // eat pills
            if (this.mover.changedTile) {
                if (map.eatPill(this.mover.tile)) {
                    events.fire(Event.EatPill)
                } else if (map.eatPower(this.mover.tile)) {
                    events.fire(Event.EatPower)
                }
            }

            // check for eating or losing a life
            for (const chaser of chasers) {
                if (this.mover.tile.tx == chaser.mover.tile.tx && this.mover.tile.ty == chaser.mover.tile.ty)
                {
                    if (chaser.mode == ChaserMode.Scatter || chaser.mode == ChaserMode.Chase) {
                        if (!level.immortal) {
                            events.fire(Event.LoseLife)

                            // can only get eaten once per life!
                            break
                        }
                    }
                    if (chaser.mode == ChaserMode.Fright) {
                        events.fire(Event.EatChaser)

                        // send the chaser home
                        chaser.doEaten()

                        // also only one per frame, so both score events are seen
                        break
                    }                  
                }

                // Also check by distance to prevent the pass-through bug, but only for fright,
                // as otherwise the player can feel cheated
                // Leaving for being eaten though, as it's like a bonus get-out-of-jail card
                if (chaser.mode == ChaserMode.Fright) {
                    const dx = Math.abs(chaser.mover.x - this.mover.x)
                    const dy = Math.abs(chaser.mover.y - this.mover.y)
                    if (dx < 4 && dy < 4) {
                        events.fire(Event.EatChaser)

                        // send the chaser home
                        chaser.doEaten()

                        // also only one per frame, so both score events are seen
                        break
                    }
                }
            }
        }

        resetLevel() {
            this.mover.place()
            this.mover.setImage()
        }
    }
}
