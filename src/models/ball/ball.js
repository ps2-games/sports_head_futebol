import { BALL, COLLISION } from '../constants.js';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function ballVsPlayerFoot(ball, player) {
    const obb = player.getFootOBB();
    const dx = ball.position.x - obb.cx;
    const dy = ball.position.y - obb.cy;

    const du = dx * obb.u.x + dy * obb.u.y;
    const dv = dx * obb.v.x + dy * obb.v.y;

    const closestDu = clamp(du, -obb.halfW, obb.halfW);
    const closestDv = clamp(dv, -obb.halfH, obb.halfH);

    const closest = {
        x: obb.cx + closestDu * obb.u.x + closestDv * obb.v.x,
        y: obb.cy + closestDu * obb.u.y + closestDv * obb.v.y
    };

    const sepX = ball.position.x - closest.x;
    const sepY = ball.position.y - closest.y;
    const dist2 = sepX * sepX + sepY * sepY;
    const r2 = ball.radius * ball.radius;

    if (dist2 > r2) return { hit: false };

    const dist = Math.sqrt(dist2);
    const depth = ball.radius - dist;
    const normal = dist < 1e-4 ? { x: 0, y: 1 }
        : { x: sepX / dist, y: sepY / dist };

    const footU = (closestDu + obb.halfW) / (2 * obb.halfW);
    const footV = (closestDv + obb.halfH) / (2 * obb.halfH);

    return {
        hit: true,
        contact: closest,
        normal,
        depth,
        footPoint: { u: footU, v: footV }
    };
}

export default class Ball {
    constructor(x = 400, y = 300) {
        this.sprite = new Image('./assets/objects/ball.png');
        this.kickSound = Sound.Sfx('./assets/sounds/kick.adp');
        this.radius = this.sprite.width / 2 || BALL.RADIUS;
        this.position = { x, y };
        this.velocity = { x: 0, y: 0.1 };

        this.minX = this.radius;
        this.maxX = 630 - this.radius;
        this.groundY = null;
    }

    update(dt = 16) {
        const speed = Math.hypot(this.velocity.x, this.velocity.y);
        const max = this.radius * COLLISION.MAX_STEP_FRAC;
        const steps = Math.ceil((speed * dt) / (max * 1000 / 16));
        const sdt = dt / steps;
        for (let i = 0; i < steps; i++) this.singleUpdate(sdt);
        this.draw();
    }

    checkPlayerCollision(player) {
        const cen = player.getCenter();
        const dx = this.position.x - cen.x;
        const dy = this.position.y - cen.y;
        const r = this.radius + COLLISION.PLAYER_R;
        const d2 = dx * dx + dy * dy;

        if (d2 > r * r) return false;

        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        const overlap = r - d;

        this.position.x += nx * overlap;
        this.position.y += ny * overlap;

        const dvx = this.velocity.x - player.character.velocity.x;
        const dvy = this.velocity.y - player.character.velocity.y;
        const dot = dvx * nx + dvy * ny;
        const j = -(1 + COLLISION.RESTITUTION) * dot / 2;
        this.velocity.x += j * nx;
        this.velocity.y += j * ny;

        if (!this.kickSound.playing()) this.kickSound.play();
        return true;
    }

    checkFootCollision(player) {
        if (!player.kick.active) return false;
        const res = ballVsPlayerFoot(this, player);
        if (!res.hit) return false;

        this.position.x += res.normal.x * res.depth;
        this.position.y += res.normal.y * res.depth;

        const kickPower = Math.min(player.kick.t * 12 + 5, 15);
        const reflect = -(1 + COLLISION.RESTITUTION) *
            (this.velocity.x * res.normal.x + this.velocity.y * res.normal.y);
        this.velocity.x += reflect * res.normal.x + res.normal.x * kickPower * player.kick.direction;
        this.velocity.y += reflect * res.normal.y + res.normal.y * kickPower - 2;

        if (res.footPoint.u > 0.8) this.velocity.x += 200 * Math.sign(res.normal.x);

        if (!this.kickSound.playing()) this.kickSound.play();
        return true;
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

    singleUpdate(dt) {
        if (this.groundY === null && this.sprite.height > 0)
            this.groundY = BALL.GROUND_POSITION + this.sprite.height / 2;
        if (this.groundY === null) this.groundY = 397;

        this.velocity.y += BALL.GRAVITY * (dt / 16);
        this.velocity.x *= BALL.FRICTION;
        this.velocity.y *= BALL.FRICTION;

        const max = BALL.MAX_VELOCITY;
        const v = Math.hypot(this.velocity.x, this.velocity.y);
        if (v > max) {
            this.velocity.x = (this.velocity.x / v) * max;
            this.velocity.y = (this.velocity.y / v) * max;
        }

        this.position.x += this.velocity.x * (dt / 16);
        this.position.y += this.velocity.y * (dt / 16);
        this.worldCollide();
    }

    worldCollide() {
        if (this.position.y + this.radius >= this.groundY) {
            this.position.y = this.groundY - this.radius;
            this.velocity.y *= -BALL.BOUNCE;
            this.velocity.x *= BALL.GROUND_FRICTION;
            if (Math.abs(this.velocity.y) < 1) this.velocity.y = 0;
        }
        if (this.position.x - this.radius < this.minX) {
            this.position.x = this.minX + this.radius;
            this.velocity.x *= -BALL.BOUNCE;
        } else if (this.position.x + this.radius > this.maxX) {
            this.position.x = this.maxX - this.radius;
            this.velocity.x *= -BALL.BOUNCE;
        }
    }

    draw() {
        const left = this.position.x - this.radius;
        const top = this.position.y - this.radius;
        this.sprite.draw(left, top);

        Draw.circle(this.position.x, this.position.y, this.radius, Color.new(255, 0, 0, 60));
    }
}