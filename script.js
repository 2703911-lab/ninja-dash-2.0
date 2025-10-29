// Ninja Dash JS Game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playBtn = document.getElementById('playBtn');
const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const weaponEl = document.getElementById('weapon');
const buyPistol = document.getElementById('buyPistol');
const buyLMG = document.getElementById('buyLMG');
const buyRPG = document.getElementById('buyRPG');
let gameRunning = false;
let won = false;
let isDead = false;
let score = 0;
let health = 100;
let lastBonusTime = Date.now();
const BONUS_INTERVAL = 10000; // 10s
const TILE_SIZE = 32;
const GRID_WIDTH = canvas.width / TILE_SIZE;
const GRID_HEIGHT = canvas.height / TILE_SIZE;
// Weapons
const WEAPONS = {
    katana: { name: 'Katana', type: 'melee', damage: 100, range: 60, cooldown: 500 }, // Increased range slightly
    pistol: { name: 'Pistol', type: 'ranged', damage: 10, range: 200, cooldown: 300, unlocked: false, cost: 7500 },
    lmg: { name: 'LMG', type: 'ranged', damage: 5, range: 150, cooldown: 100, unlocked: false, cost: 15000 },
    rpg: { name: 'RPG', type: 'ranged', damage: 50, range: 300, cooldown: 1000, area: 50, unlocked: false, cost: 30000 },
    god: { name: 'God Weapon', type: 'ranged', damage: Infinity, range: Infinity, cooldown: 0, unlocked: false } // One-shot beam
};
let currentWeapon = 'katana';
// Player
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 20,
    speed: 200,
    lastAttack: 0
};
// Mouse position for aiming
let mousePos = { x: canvas.width / 2, y: canvas.height / 2 };
// Enemies
let enemies = [];
let projectiles = [];
// A* Pathfinding
class Node {
    constructor(x, y, g = 0, h = 0) {
        this.x = x;
        this.y = y;
        this.g = g;
        this.h = h;
        this.f = g + h;
        this.parent = null;
    }
}
function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // Manhattan
}
function aStar(start, goal) {
    const openSet = [new Node(start.x, start.y)];
    const closedSet = new Set();
    const key = (x, y) => `${x},${y}`;
    while (openSet.length > 0) {
        // Find lowest f
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();
        const currKey = key(current.x, current.y);
        if (current.x === goal.x && current.y === goal.y) {
            const path = [];
            let temp = current;
            while (temp) {
                path.push({ x: temp.x * TILE_SIZE + TILE_SIZE / 2, y: temp.y * TILE_SIZE + TILE_SIZE / 2 });
                temp = temp.parent;
            }
            return path.reverse();
        }
        closedSet.add(currKey);
        const neighbors = [
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x, y: current.y - 1 }
        ];
        for (let { x, y } of neighbors) {
            if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) continue;
            const nKey = key(x, y);
            if (closedSet.has(nKey)) continue;
            const g = current.g + 1;
            const h = heuristic({ x, y }, goal);
            const neighbor = new Node(x, y, g, h);
            neighbor.parent = current;
            const openIndex = openSet.findIndex(n => key(n.x, n.y) === nKey);
            if (openIndex > -1) {
                if (g < openSet[openIndex].g) {
                    openSet[openIndex] = neighbor;
                }
            } else {
                openSet.push(neighbor);
            }
        }
    }
    return []; // No path
}
// Input
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') e.preventDefault(); // Prevent space scroll
});
document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
// Mouse tracking for aiming
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;
});
// Optional: Click to attack for easier testing (in addition to space)
canvas.addEventListener('click', (e) => {
    if (!gameRunning || Date.now() - player.lastAttack < WEAPONS[currentWeapon].cooldown) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    attack(mouseX, mouseY);
});
// Attack function (called on space press or click)
function attack(targetX, targetY) {
    player.lastAttack = Date.now();
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (currentWeapon === 'god') {
        // God beam: Raycast and destroy all enemies in line
        const dirX = dx / dist || 0;
        const dirY = dy / dist || 0;
        let traveled = 0;
        const step = 10;
        const maxRange = 1000;
        while (traveled < maxRange) {
            traveled += step;
            const px = player.x + dirX * traveled;
            const py = player.y + dirY * traveled;
            for (let j = enemies.length - 1; j >= 0; j--) {
                const edist = Math.sqrt((px - enemies[j].x)**2 + (py - enemies[j].y)**2);
                if (edist < enemies[j].size + 5) {
                    score += 500;
                    enemies.splice(j, 1);
                }
            }
        }
    } else if (WEAPONS[currentWeapon].type === 'melee') {
        // Melee: Check enemies in range (fixed splicing)
        for (let i = enemies.length - 1; i >= 0; i--) {
            const edist = Math.sqrt((enemies[i].x - player.x)**2 + (enemies[i].y - player.y)**2);
            if (edist < WEAPONS[currentWeapon].range) {
                enemies[i].health -= WEAPONS[currentWeapon].damage;
                if (enemies[i].health <= 0) {
                    score += 500;
                    // God drop 0.1%
                    if (Math.random() < 0.001 && !WEAPONS.god.unlocked) {
                        WEAPONS.god.unlocked = true;
                        currentWeapon = 'god';
                        alert('GOD WEAPON UNLOCKED!'); // Epic alert
                    }
                    enemies.splice(i, 1);
                }
            }
        }
    } else {
        // Ranged: Create projectile (god handled above)
        const speed = 300;
        const vx = (dx / dist || 0) * speed;
        const vy = (dy / dist || 0) * speed;
        const projRange = isFinite(WEAPONS[currentWeapon].range) ? WEAPONS[currentWeapon].range : 1000;
        projectiles.push({
            x: player.x,
            y: player.y,
            vx,
            vy,
            damage: WEAPONS[currentWeapon].damage,
            range: projRange,
            area: WEAPONS[currentWeapon].area || 0,
            traveled: 0
        });
    }
    updateUI();
}
// Update
function update(dt) {
    if (!gameRunning) return;
    // Player movement
    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= player.speed * dt;
    if (keys['s'] || keys['arrowdown']) dy += player.speed * dt;
    if (keys['a'] || keys['arrowleft']) dx -= player.speed * dt;
    if (keys['d'] || keys['arrowright']) dx += player.speed * dt;
    player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x + dx));
    player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y + dy));
    // Attack on space (tap for cooldown)
    if (keys[' ']) {
        if (Date.now() - player.lastAttack >= WEAPONS[currentWeapon].cooldown) {
            attack(mousePos.x, mousePos.y);
        }
    }
    // Time bonus
    if (Date.now() - lastBonusTime > BONUS_INTERVAL) {
        score += 1000;
        lastBonusTime = Date.now();
        updateUI();
    }
    // Spawn enemies (increased initial rate for easier testing)
    if (Math.random() < 0.05 + score / 1000000) { // Increased from 0.02
        const side = Math.floor(Math.random() * 4);
        let ex, ey;
        if (side === 0) { ex = Math.random() * canvas.width; ey = -20; }
        else if (side === 1) { ex = canvas.width + 20; ey = Math.random() * canvas.height; }
        else if (side === 2) { ex = Math.random() * canvas.width; ey = canvas.height + 20; }
        else { ex = -20; ey = Math.random() * canvas.height; }
        enemies.push({
            x: ex,
            y: ey,
            size: 15,
            speed: 100,
            health: 1, // Easy kills
            path: []
        });
    }
    // Update enemies (damage accumulation here, check death after loop)
    const playerTile = { x: Math.floor(player.x / TILE_SIZE), y: Math.floor(player.y / TILE_SIZE) };
    let damageThisFrame = 0;
    enemies.forEach(enemy => {
        const enemyTile = { x: Math.floor(enemy.x / TILE_SIZE), y: Math.floor(enemy.y / TILE_SIZE) };
        if (enemy.path.length === 0 || Math.random() < 0.1) {
            enemy.path = aStar(enemyTile, playerTile);
        }
        if (enemy.path.length > 0) {
            const target = enemy.path[0];
            const edx = target.x - enemy.x;
            const edy = target.y - enemy.y;
            const edist = Math.sqrt(edx*edx + edy*edy);
            if (edist > 1) {
                enemy.x += (edx / edist) * enemy.speed * dt;
                enemy.y += (edy / edist) * enemy.speed * dt;
            } else {
                enemy.path.shift();
            }
        } else {
            // Direct chase
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0) {
                enemy.x += (dx / dist) * enemy.speed * dt;
                enemy.y += (dy / dist) * enemy.speed * dt;
            }
        }
        // Collision with player (accumulate damage)
        const pdist = Math.sqrt((player.x - enemy.x)**2 + (player.y - enemy.y)**2);
        if (pdist < player.size + enemy.size) {
            damageThisFrame += 20 * dt; // Accumulate per enemy
        }
    });
    // Apply total damage once per frame (prevents multiple alerts)
    health -= damageThisFrame;
    if (health <= 0 && !isDead) {
        isDead = true;
        alert('Game Over! Final Score: ' + score);
        gameRunning = false;
        resetGame();
        isDead = false;
    }
    // Update projectiles (fixed splicing with reverse loops)
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.traveled += Math.sqrt(proj.vx*proj.vx + proj.vy*proj.vy) * dt;
        let hit = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            const pdist = Math.sqrt((proj.x - enemies[j].x)**2 + (proj.y - enemies[j].y)**2);
            if (pdist < enemies[j].size + 5) { // Hit radius
                enemies[j].health -= proj.damage;
                hit = true;
                if (proj.area > 0) {
                    // Area damage for RPG
                    for (let k = enemies.length - 1; k >= 0; k--) {
                        if (k !== j) {
                            const odist = Math.sqrt((proj.x - enemies[k].x)**2 + (proj.y - enemies[k].y)**2);
                            if (odist < proj.area) enemies[k].health -= proj.damage / 2;
                        }
                    }
                }
                if (enemies[j].health <= 0) {
                    score += 500;
                    // God drop
                    if (Math.random() < 0.001 && !WEAPONS.god.unlocked) {
                        WEAPONS.god.unlocked = true;
                        currentWeapon = 'god';
                        alert('GOD WEAPON UNLOCKED!');
                    }
                    enemies.splice(j, 1);
                }
            }
        }
        const projRange = isFinite(WEAPONS[currentWeapon].range) ? WEAPONS[currentWeapon].range : 1000;
        if (hit || proj.traveled > projRange) {
            projectiles.splice(i, 1);
        }
    }
    // Check win
    if (score >= 30000 && !won) {
        won = true;
        alert('You Win! Score: ' + score + '. Keep going for more!');
    }
    updateUI();
}
// Draw
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Player (ninja - green rect for now)
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(player.x - player.size/2, player.y - player.size/2, player.size, player.size);
    // Enemies (red rects)
    ctx.fillStyle = '#ff0000';
    enemies.forEach(enemy => {
        ctx.fillRect(enemy.x - enemy.size/2, enemy.y - enemy.size/2, enemy.size, enemy.size);
    });
    // Projectiles (yellow dots)
    ctx.fillStyle = '#ffff00';
    projectiles.forEach(proj => {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    // God beam preview (if active)
    if (currentWeapon === 'god') {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.stroke();
    }
}
// UI
function updateUI() {
    scoreEl.textContent = `Score: ${score}`;
    healthEl.textContent = `Health: ${Math.max(0, health)}`;
    weaponEl.textContent = `Weapon: ${WEAPONS[currentWeapon].name}`;
    buyPistol.disabled = score < WEAPONS.pistol.cost || WEAPONS.pistol.unlocked;
    buyLMG.disabled = score < WEAPONS.lmg.cost || WEAPONS.lmg.unlocked;
    buyRPG.disabled = score < WEAPONS.rpg.cost || WEAPONS.rpg.unlocked;
}
function resetGame() {
    score = 0;
    health = 100;
    enemies = [];
    projectiles = [];
    currentWeapon = 'katana';
    won = false;
    isDead = false;
    Object.values(WEAPONS).forEach(w => { if (w !== WEAPONS.katana) w.unlocked = false; });
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    lastBonusTime = Date.now();
    updateUI();
}
// Buy weapons
buyPistol.addEventListener('click', () => {
    if (score >= WEAPONS.pistol.cost) {
        WEAPONS.pistol.unlocked = true;
        currentWeapon = 'pistol';
        updateUI();
    }
});
buyLMG.addEventListener('click', () => {
    if (score >= WEAPONS.lmg.cost) {
        WEAPONS.lmg.unlocked = true;
        currentWeapon = 'lmg';
        updateUI();
    }
});
buyRPG.addEventListener('click', () => {
    if (score >= WEAPONS.rpg.cost) {
        WEAPONS.rpg.unlocked = true;
        currentWeapon = 'rpg';
        updateUI();
    }
});
// Play button
playBtn.addEventListener('click', () => {
    document.getElementById('description').style.display = 'none';
    canvas.style.display = 'block';
    document.getElementById('ui').style.display = 'block';
    gameRunning = true;
    resetGame();
    gameLoop();
});
// Game loop
function gameLoop() {
    if (!gameRunning) return;
    const now = Date.now();
    const dt = (now - (window.lastTime || now)) / 1000;
    window.lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
}
// Initial UI update
updateUI();
