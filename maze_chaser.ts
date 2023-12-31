namespace maze {
    export enum ChaserKind {
        Blinky,
        Pinky,
        Inky,
        Clyde,
    }

    export enum ChaserMode {
        None,
        Wait,
        EnterBase,
        ExitBase,
        Scatter,
        Chase,
        Fright,
        ReturnToBase,
    }

    export class Chaser {
        mover: Mover
        img: DirImage
        imgReturn: DirImage
        imgFright: DirImage
        imgWarn: DirImage
        kind: ChaserKind
        id: number
        mode: ChaserMode        // mode this chaser is using
        gameMode: ChaserMode    // mode the game requested
        target: Tile
        scatterTarget: Tile
        waitDir: Direction
        release: boolean
        reverse: boolean
        warn: boolean
        eaten: boolean
        home: Pos
        baseExit: Pos
        baseCentre: Pos

        constructor(kind: ChaserKind, id: number) {
            this.mover = new Mover()
            this.img = new DirImage()
            this.imgReturn = new DirImage()
            this.imgFright = new DirImage()
            this.imgWarn = new DirImage()
            this.kind = kind
            this.id = id
        }

        init() {
            this.img.load("chaser" + this.id)
            this.mover.init(this.img)
            
            this.imgReturn.load("eyes")
            this.imgFright.load("chaser_fright")
            this.imgWarn.load("chaser_warn")
        }

        initLevel() {
            this.scatterTarget = map.scatterTargets[this.id]
            this.home = map.chaserBase[this.id]
            this.baseExit = map.chaserBaseTop
            this.baseCentre = map.chaserBaseCentre
            this.release = false
            this.reverse = false
            this.resetLevel()
        }

        private isDirectionValid(dir: Direction): boolean {
            // check can move that direction and its now the opposite to current
            return (this.mover.isDirectionValid(dir) && this.mover.dir != directionOpposite(dir))
        }

        private checkNone(): boolean {
            this.mode = this.gameMode
            this.mover.request = Direction.Left
            return false
        }

        private checkWait(): boolean {
            // Check if allowed to exit base during fright mode
            if (level.enableExitBaseDuringFright || this.gameMode != ChaserMode.Fright) {
                if (this.waitDir == Direction.Up && this.release) {
                    this.mode = ChaserMode.ExitBase
                }
            }
            return true
        }

        private checkEnterBase(): boolean {
            if (this.mover.y > this.baseCentre.y) {
                this.mode = ChaserMode.Wait
                this.waitDir = Direction.Down

                // make sure we don't re-enter fright mode
                if (level.enableExitBaseDuringFright && this.gameMode == ChaserMode.Fright) {
                    this.gameMode = ChaserMode.Chase
                }
            }
            return true
        }

        private checkExitBase(): boolean {
            if (this.mover.y <= this.baseExit.y) {
                this.mover.placeAtPos(this.baseExit.x, this.baseExit.y)
                this.mode = ChaserMode.None
            }
            return true
        }

        private checkStandard(): boolean {
            if (this.mode != this.gameMode) {
                if (this.mode != ChaserMode.Fright) {
                    this.reverse = true
                }
                this.mode = this.gameMode
            }

            // let the update run
            return true
        }

        private checkReturnTobase() {
            // Watch for crossing the tile boundary at the base entry
            if (this.mover.changedTile) {
                // Is the the right position?
                const dx = Math.abs(this.mover.x - this.baseExit.x)
                const dy = Math.abs(this.mover.y - this.baseExit.y)
                if (dx < 4 && dy < 4) {
                    this.mode = ChaserMode.EnterBase
                }
            }

            // let the update run
            return true
        }
        
        private doTarget() {
            // get distance to target in each axis
            const dx = (this.target.tx - this.mover.tile.tx)
            const dy = (this.target.ty - this.mover.tile.ty)

            // decide prefered direction for each axis, based on which axis is furthest
            const dirX = (dx > 0) ? Direction.Right : Direction.Left
            const dirY = (dy > 0) ? Direction.Down : Direction.Up

            let dirs: Direction[]
            if (Math.abs(dx) > Math.abs(dy)) {
                // Want to right direction in x then y
                dirs = [dirX, dirY, directionOpposite(dirY), directionOpposite(dirX)]
            } else {
                // Want to right direction in y then x
                dirs = [dirY, dirX, directionOpposite(dirX), directionOpposite(dirY)]
            }

            // request the first direction that is allowed
            for (const dir of dirs) {
                if (this.isDirectionValid(dir)) {
                    this.mover.request = dir
                    break
                }
            }
        }

        private doWait(): boolean {
            this.mover.updateState()

            const minY = this.baseCentre.y - 4
            const maxY = this.baseCentre.y + 4
            this.mover.forceUpdate(this.waitDir, this.mover.x, this.mover.x, minY, maxY)
            this.mover.setImage()

            // switch direction when hit limits
            if (this.mover.y <= minY) {
                this.waitDir = Direction.Down
            }
            if (this.mover.y >= maxY) {
                this.waitDir = Direction.Up
            }

            return false
        }

        private doEnterBase(): boolean {
            this.mover.updateState()
            this.mover.forceUpdate(Direction.Down, this.baseExit.x, this.baseExit.x, this.baseExit.y, this.baseCentre.y)
            return false
        }

        private doExitBase(): boolean {
            this.eaten = false
            this.mover.updateState()

            // return to y center
            if ((this.waitDir == Direction.Up && this.mover.y > this.baseCentre.y) || (this.waitDir == Direction.Down && this.mover.y < this.baseCentre.y))
            {
                // complete wait cycle
                return this.doWait()
            }

            // move to center
            if (this.home.x < this.baseExit.x && this.mover.x < this.baseExit.x) {
                this.mover.forceUpdate(Direction.Right, this.home.x, this.baseExit.x, this.home.y, this.home.y)
                this.mover.setImage()
                return false
            }
            if (this.home.x > this.baseExit.x && this.mover.x > this.baseExit.x) {
                this.mover.forceUpdate(Direction.Left, this.baseExit.x, this.home.x, this.home.y, this.home.y)
                this.mover.setImage()
                return false
            }

            // move out
            this.mover.forceUpdate(Direction.Up, this.baseExit.x, this.baseExit.x, this.baseExit.y, this.baseCentre.y)
            this.mover.setImage()

            return false
        }

        private doReverse(): boolean {
            if (this.mover.changedTile && this.reverse) {
                this.reverse = false
                const rev = directionOpposite(this.mover.dir)
                if (this.mover.isDirectionValid(rev)) {
                    this.mover.request = rev
                    return true
                }
            }
            return false
        }

        private doScatter(): boolean {
            if (this.doReverse()) {
                return true
            }
            if (this.mover.changedTile) {
                this.target = this.scatterTarget
                this.doTarget()
            }
            return true
        }

        private doChase(): boolean {
            if (this.doReverse()) {
                return true
            }
            if (this.mover.changedTile) {
                // generate target
                switch(this.kind) {
                    case ChaserKind.Blinky: {
                        // directly target the hero
                        this.target = hero.mover.tile
                        break
                    }
                    case ChaserKind.Pinky:  {
                        // target 4 tiles ahead of the hero
                        this.target = hero.mover.tile.getNextIn(hero.mover.dir, 4)

                        // implement the overflow bug
                        if (this.mover.dir == Direction.Down) {
                            this.target = this.target.getNextIn(Direction.Right, 4)
                        }
                         break
                    }
                    case ChaserKind.Inky: {
                        // get position 2 in front of hero
                        const t1 = hero.mover.tile.getNextIn(hero.mover.dir, 2)

                        // get position of first chaser
                        const t2 = chasers[0].mover.tile

                        // cast vector between them beyond t1
                        const dx = t1.tx - t2.tx
                        const dy = t1.ty - t2.ty
                        this.target = new Tile(t1.tx + dx, t1.ty + dy)
                        break
                    }
                    case ChaserKind.Clyde: {
                        // calculate distance from player
                        const dx = Math.abs(hero.mover.tile.tx - this.mover.tile.tx)
                        const dy = Math.abs(hero.mover.tile.ty - this.mover.tile.ty)
                        const dist = dx + dy
                        if (dist > 8) {
                            // far, target hero direction
                            this.target = hero.mover.tile
                        } else {
                            // too close - scatter!
                            this.target = this.scatterTarget
                        }
                        break
                    }
                }
                this.doTarget()
            }
            return true
        }

        private doFright(): boolean {
            if (this.doReverse()) {
                return true
            }
            if (this.mover.changedTile) {
                let dirs: Direction[] = [Direction.Up, Direction.Right, Direction.Down, Direction.Left]
                let options: Direction[] = []

                // determine which directions are possible
                dirs.forEach(dir => {
                    if (this.isDirectionValid(dir)) {
                        options.push(dir)
                    }
                })

                // randomly pick one
                if (options.length > 0) {
                    const ran = Math.randomRange(0, options.length - 1)
                    this.mover.request = options[ran]
                }
            }
            return true
        }

        private doReturnToBase(): boolean {
            this.target = map.chaserReturn
            this.doTarget()
            return true
        }

        private checkMode(): boolean {
            switch (this.mode) {
                case ChaserMode.None:           return this.checkNone()
                case ChaserMode.Wait:           return this.checkWait()
                case ChaserMode.EnterBase:      return this.checkEnterBase()
                case ChaserMode.ExitBase:       return this.checkExitBase()
                case ChaserMode.Scatter:
                case ChaserMode.Chase:
                case ChaserMode.Fright:         return this.checkStandard()
                case ChaserMode.ReturnToBase:   return this.checkReturnTobase()
            }
            return false
        }

        private doMode(): boolean {
            switch (this.mode) {
                case ChaserMode.Wait:           return this.doWait()
                case ChaserMode.EnterBase:      return this.doEnterBase()
                case ChaserMode.ExitBase:       return this.doExitBase()
                case ChaserMode.Scatter:        return this.doScatter()
                case ChaserMode.Chase:          return this.doChase()
                case ChaserMode.Fright:         return this.doFright()
                case ChaserMode.ReturnToBase:   return this.doReturnToBase()
            }
            return true
        }

        private updateSpeed() {
            // check for tunnel
            const tile = this.mover.tile
            if (map.getFlag(tile, MapFlags.Tunnel) || map.getFlag(tile, MapFlags.Slow)) {
                this.mover.speed = level.speedChaserTunnel
                return
            }

            switch (this.mode) {
                default:
                    this.mover.speed = level.speedChaser
                    break
                case ChaserMode.Fright:
                    this.mover.speed = level.speedChaserFright
                    break
                case ChaserMode.Wait:
                case ChaserMode.ExitBase:
                case ChaserMode.EnterBase:
                    this.mover.speed = level.speedChaserWait
            }
        }

        update() {
            if (!this.mover.isReady()) {
                return
            }

            // check current mode
            // this tells us if we need to do further work to apply the mode
            let update = true
            if (this.checkMode()) {
                update = this.doMode()
            }

            this.updateSpeed()

            if (update) {
                this.mover.update()
            }

            if (this.mode == ChaserMode.Fright) {
                if (this.warn) {
                    this.mover.setImages(this.imgWarn)
                } else {
                    this.mover.setImages(this.imgFright)
                }
            } else {
                this.warn = false
                if (this.eaten) {
                    this.mover.setImages(this.imgReturn)
                } else {
                    this.mover.setImages(this.img)
                }
                this.mover.setImage()
            }
        }

        setMode(mode: ChaserMode) {
            // this doesn't set the _actual_ mode, we might be in the middle of something,
            // or not ready, etc.
            this.gameMode = mode
            this.warn = false
        }

        setRelease() {
            this.release = true
        }

        setWarn(warn: boolean) {
            this.warn = warn
        }

        resetLevel() {
            this.mover.placeAtPos(this.home.x, this.home.y)
            this.mover.setImage()
            this.mode = ChaserMode.Wait
            this.waitDir = Direction.Up
            this.warn = false
            this.eaten = false
        }

        doEaten() {
            this.mode = ChaserMode.ReturnToBase
            this.eaten = true
        }
    }
}