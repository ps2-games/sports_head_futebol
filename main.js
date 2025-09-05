import Ball from "./src/models/ball/ball.js";
import Player from "./src/models/player/player.js";

const background = new Image('./assets/background.png')
// const shadow = new Image('./assets/shadow.png')
const goal = new Image('./assets/objects/goal.png')

const player = new Player(0, 1)
const ball = new Ball();

Screen.setParam(Screen.DEPTH_TEST_ENABLE, false);
Screen.display(() => {
    background.draw(0, 0)
    // shadow.draw(0, 0)

    const dt = 16; // ms
    ball.update(dt);
    player.update(dt);
    ball.checkPlayerCollision(player);
    ball.checkFootCollision(player);

    goal.width = 62;
    goal.draw(0, 356 - (goal.height / 2 + 5));
    goal.width = -Math.abs(goal.width)
    goal.draw(640, 356 - (goal.height / 2 + 5));

})