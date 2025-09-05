import DustParticle from "./vfx/dust.js";
import { KICK, PARTICLES, PLAYER } from '../constants.js'

export default class Player {
    constructor(port = 0, character = 1) {
        this.pads = Pads.get(port);
        this.character = new Image(`./assets/characters/character${character}.png`);
        this.jumpSound = Sound.Sfx('./assets/sounds/jump.adp');
        this.feet = new Image('./assets/characters/feet.png');

        this.feet.width = 20;
        this.feet.height = 18;
        this.feet.startx = 0;
        this.feet.endx = 20;

        this.maxX = 630;
        this.minX = 10;

        this.character.position = { x: 250, y: PLAYER.GROUND_POSITION };
        this.character.velocity = { x: 0, y: 0 };

        this.kick = {
            active: true,
            forward: true,
            t: 0,
            direction: 1
        };

        this.dustParticles = [];
    }

    startKick(direction = 1) {
        if (this.kick.active) return;
        this.kick.active = true;
        this.kick.t0 = Date.now();
        this.kick.direction = direction;
    }

    updateKick(dt) {
        if (!this.kick.active) return;

        const speed = dt / KICK.KICK_DURATION;
        const holding = this.pads.pressed(Pads.CROSS) || this.pads.pressed(Pads.SPACE);

        if (holding) {
            if (this.kick.forward) {
                this.kick.t += speed;
                if (this.kick.t >= 1) this.kick.t = 1;
            }
        } else {
            if (this.kick.forward) {
                this.kick.forward = false;
            }
            this.kick.t -= speed;
            if (this.kick.t <= 0) {
                this.kick.t = 0;
                this.kick.active = false;
            }
        }

        const rawT = this.kick.t;
        const biasedT = rawT * (1 - KICK.START_OFFSET) + KICK.START_OFFSET;
        const arc = KICK.START + (KICK.END - KICK.START) * biasedT;
        this.kick.angle = arc;


        const startRad = KICK.FOOT_ANGLE_START * Math.PI / 180;
        const endRad = KICK.FOOT_ANGLE_END * Math.PI / 180;
        this.footVisualAngle = startRad + (endRad - startRad) * this.kick.t;
    }

    calcFootPosition() {
        const pivotX = this.character.position.x + this.character.width / 2 - 5;
        const pivotY = this.character.position.y + this.character.height / 2 - 5;
        const r = KICK.LEG_LENGTH;

        return {
            x: pivotX + Math.cos(this.kick.angle) * r,
            y: pivotY + Math.sin(this.kick.angle) * r + this.character.height / 2 - this.feet.height,
        };
    }

    jump() {
        if (this.character.position.y >= PLAYER.GROUND_POSITION) {
            this.character.velocity.y = -PLAYER.JUMP_STRENGTH;
            this.jumpSound.play();
        }
    }

    updatePosition() {
        this.character.position.x += this.character.velocity.x;
        this.character.position.y += this.character.velocity.y;
    }

    applyGravity() {
        if (this.character.position.y < PLAYER.GROUND_POSITION) {
            this.character.velocity.y += PLAYER.GRAVITY;
        }
    }

    resetVelocityWhenGrounded() {
        if (this.character.position.y >= PLAYER.GROUND_POSITION) {
            this.character.position.y = PLAYER.GROUND_POSITION;
            this.character.velocity.y = 0;
        }
    }

    blockVelocity() {
        if (this.character.velocity.y > PLAYER.MAX_Y_VELOCITY) {
            this.character.velocity.y = PLAYER.MAX_Y_VELOCITY;
        }
    }

    handleInput() {
        if (this.pads.pressed(Pads.RIGHT) && this.character.position.x + this.character.width < this.maxX) {
            this.character.position.x += PLAYER.SPEED;
        }
        if (this.pads.pressed(Pads.LEFT) && this.character.position.x > this.minX) {
            this.character.position.x -= PLAYER.SPEED;
        }
        if (this.pads.justPressed(Pads.UP)) this.jump();

        if (this.pads.pressed(Pads.CROSS)) {
            if (!this.kick.active) {
                this.kick.active = true;
                this.kick.forward = true;
                this.kick.t = 0;
            }
        } else {
            if (this.kick.active && this.kick.forward) {
                this.kick.forward = false;
            }
        }
    }

    createDustParticles() {
        const isMoving = Math.abs(this.character.velocity.x) > 0 || this.pads.pressed(Pads.LEFT) || this.pads.pressed(Pads.RIGHT);
        const onGround = this.character.position.y >= PLAYER.GROUND_POSITION;
        if (!isMoving || !onGround || this.dustParticles.length >= PARTICLES.MAX_PARTICLES) return;

        const dir = this.pads.pressed(Pads.RIGHT) ? 'right' : 'left';
        const spawnSide = dir === 'right' ? 'left' : 'right';

        for (let i = 0; i < PARTICLES.PARTICLE_SPAWN_RATE; i++) {
            if (this.dustParticles.length >= PARTICLES.MAX_PARTICLES) break;
            const offX = spawnSide === 'right' ? Math.random() * 8 + 3 : Math.random() * -8 - 12;
            const offY = Math.random() * -5 - 2;
            this.dustParticles.push(new DustParticle(
                this.character.position.x + (this.character.width || 45) * 0.5 + offX,
                this.character.position.y + (this.character.height || 48) + offY,
                spawnSide
            ));
        }
    }

    updateDustParticles() {
        for (let i = this.dustParticles.length - 1; i >= 0; i--) {
            if (!this.dustParticles[i].update()) this.dustParticles.splice(i, 1);
        }
    }

    drawDustParticles() {
        this.dustParticles.forEach(p => p.draw());
    }

    isOnGround() {
        return this.character.position.y >= PLAYER.GROUND_POSITION;
    }

    update() {
        this.pads.update();
        this.handleInput();
        this.applyGravity();
        this.blockVelocity();
        this.updatePosition();
        this.resetVelocityWhenGrounded();
        this.updateKick(16)
        this.createDustParticles();
        this.updateDustParticles();
        this.drawDustParticles();

        this.character.draw(this.character.position.x, this.character.position.y);

        const foot = this.calcFootPosition();
        this.feet.angle = this.footVisualAngle;
        this.feet.draw(foot.x, foot.y);
    }
}