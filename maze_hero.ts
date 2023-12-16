namespace maze {
    export class Hero {
        maze: Maze
        mover: Mover

        constructor() {
            this.mover = new Mover()
        }

        init() {
            this.maze = getMaze()
            this.mover.init("hero")
            this.mover.mapType = MapFlags.Maze
            scene.cameraFollowSprite(this.mover.sprite)
        }

        initLevel() {
            this.mover.hx = this.maze.map.home.x
            this.mover.hy = this.maze.map.home.y
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

            this.mover.update()

            // eat pills
            if (this.mover.changedTile) {
                if (this.maze.map.eatPill(this.mover.tile)) {
                    this.maze.events.fire(Event.EatPill)
                } else if (this.maze.map.eatPower(this.mover.tile)) {
                    this.maze.events.fire(Event.EatPower)
                }
            }

            // avoid chasers
            for (const chaser of this.maze.chasers) {
                if (this.mover.tile.tx == chaser.mover.tile.tx && this.mover.tile.ty == chaser.mover.tile.ty)
                {
                    this.maze.events.fire(Event.LoseLife)
                    // can only get eaten once per life!
                    break
                }
            }
        }
    }
}
