import { BALL } from '../constants.js';

export default class Ball {
    constructor(x = 400, y = 300) {
        this.sprite = new Image('./assets/objects/ball.png');
        this.kickSound = Sound.Sfx('./assets/sounds/kick.adp');
        this.radius = 15;
        this.position = { x, y };
        this.velocity = { x: 0, y: 0 };

        this.minX = this.radius;
        this.maxX = 630 - this.radius;
        this.groundY = BALL.GROUND_POSITION + this.sprite.height / 2;
    }

    update() {
        this.velocity.y += BALL.GRAVITY;

        this.velocity.x *= BALL.FRICTION;
        this.velocity.y *= BALL.FRICTION;

        this.velocity.x = Math.max(-BALL.MAX_VELOCITY, Math.min(BALL.MAX_VELOCITY, this.velocity.x));
        this.velocity.y = Math.max(-BALL.MAX_VELOCITY, Math.min(BALL.MAX_VELOCITY, this.velocity.y));

        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        if (this.position.y + this.radius >= this.groundY) {
            this.position.y = this.groundY - this.radius;
            this.velocity.y *= -BALL.BOUNCE;
            this.velocity.x *= BALL.GROUND_FRICTION;

            if (Math.abs(this.velocity.y) < 1) {
                this.velocity.y = 0;
            }
        }

        if (this.position.x - this.radius <= 0) {
            this.position.x = this.radius;
            this.velocity.x *= -BALL.BOUNCE;
        } else if (this.position.x + this.radius >= this.maxX + this.radius) {
            this.position.x = this.maxX;
            this.velocity.x *= -BALL.BOUNCE;
        }

        this.draw();
    }

    checkPlayerCollision(player) {
        const playerCenterX = player.character.position.x + (player.character.width) / 2;
        const playerCenterY = player.character.position.y + (player.character.height) / 2;

        const dx = this.position.x - playerCenterX;
        const dy = this.position.y - playerCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const playerRadius = 25;

        if (distance < this.radius + playerRadius) {
            const angle = Math.atan2(dy, dx);
            const pushForce = 3;

            const overlap = (this.radius + playerRadius) - distance;
            this.position.x += Math.cos(angle) * overlap;
            this.position.y += Math.sin(angle) * overlap;

            this.velocity.x += Math.cos(angle) * pushForce;
            this.velocity.y += Math.sin(angle) * pushForce;

            if (!this.kickSound.playing()) {
                this.kickSound.play();
            }

            return true;
        }
        return false;
    }

    checkFootCollision(player) {
        if (!player.kick.active) return false;

        const foot = player.calcFootPosition();
        const footX = foot.x + (player.feet.width || 20) / 2;
        const footY = foot.y + (player.feet.height || 18) / 2;

        const dx = this.position.x - footX;
        const dy = this.position.y - footY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const footRadius = 12;

        if (distance < this.radius + footRadius && player.kick.t > 0.3) {
            const kickPower = Math.min(player.kick.t * 8 + 3, 10);
            const angle = Math.atan2(dy, dx);

            this.velocity.x = Math.cos(angle) * kickPower * player.kick.direction;
            this.velocity.y = Math.sin(angle) * kickPower - 2;

            const overlap = (this.radius + footRadius) - distance;
            this.position.x += Math.cos(angle) * overlap;
            this.position.y += Math.sin(angle) * overlap;

            if (!this.kickSound.playing()) {
                this.kickSound.play();
            }

            return true;
        }
        return false;
    }

    applyForce(forceX, forceY) {
        this.velocity.x += forceX;
        this.velocity.y += forceY;
    }

    reset(x = 400, y = 300) {
        this.position.x = x;
        this.position.y = y;
        this.velocity.x = 0;
        this.velocity.y = 0;
    }

    isOnGround() {
        return this.position.y + this.radius >= this.groundY - 2;
    }

    draw() {
        this.sprite.draw(
            this.position.x - this.radius,
            this.position.y - this.radius,
        );
    }
}