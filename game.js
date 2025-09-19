class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.score = 0;
        this.difficulty = 'easy';
        this.highScore = localStorage.getItem('everlynHighScore') || 0;
        this.gameSpeed = 2;
        
        // Difficulty settings
        this.difficultySettings = {
            easy: {
                gameSpeed: 2,
                obstacleFrequency: 120,
                coinFrequency: 180,
                gravity: 0.8,
                floatSpeed: -4,
                obstacleHeight: 40,
                multipleObstacles: false
            },
            medium: {
                gameSpeed: 3,
                obstacleFrequency: 90,
                coinFrequency: 200,
                gravity: 1.0,
                floatSpeed: -3.5,
                obstacleHeight: 50,
                multipleObstacles: true
            },
            hard: {
                gameSpeed: 4,
                obstacleFrequency: 70,
                coinFrequency: 220,
                gravity: 1.2,
                floatSpeed: -3,
                obstacleHeight: 60,
                multipleObstacles: true
            }
        };
        
        // Player (Everlyn logo)
        this.player = {
            x: 100,
            y: this.height - 120,
            width: 40,
            height: 40,
            velY: 0,
            jumping: false,
            grounded: false,
            color: '#FF6B6B'
        };
        
        // Game objects
        this.obstacles = [];
        this.coins = [];
        this.particles = [];
        this.clouds = [];
        
        // Ground
        this.groundHeight = 80;
        this.groundY = this.height - this.groundHeight;
        
        // Physics
        this.gravity = 0.8;
        this.jumpForce = -15;
        this.floatSpeed = -4;
        
        // Current difficulty settings
        this.currentSettings = this.difficultySettings[this.difficulty];
        
        // Input state
        this.keys = {
            space: false,
            up: false
        };
        
        // Timers
        this.obstacleTimer = 0;
        this.coinTimer = 0;
        this.cloudTimer = 0;
        
        // Load Everlyn logo
        this.playerImage = new Image();
        this.playerImage.src = 'everlyn logo.jpg';
        this.imageLoaded = false;
        
        this.playerImage.onload = () => {
            this.imageLoaded = true;
        };
        
        this.playerImage.onerror = () => {
            console.log('Could not load Everlyn logo, using fallback graphics');
            this.imageLoaded = false;
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateHighScoreDisplay();
        this.generateClouds();
        this.gameLoop();
    }
    
    setupEventListeners() {
        // Difficulty selection
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('Difficulty button clicked:', e.target.dataset.difficulty);
                if (this.gameState === 'menu' || this.gameState === 'gameOver') {
                    this.setDifficulty(e.target.dataset.difficulty);
                }
            });
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.keys.space = true;
            }
            if (e.code === 'ArrowUp') {
                e.preventDefault();
                this.keys.up = true;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.keys.space = false;
            }
            if (e.code === 'ArrowUp') {
                e.preventDefault();
                this.keys.up = false;
            }
        });
        
        // Button controls
        document.getElementById('startBtn').addEventListener('click', () => {
            console.log('Start button clicked');
            this.startGame();
        });
        document.getElementById('restartBtn').addEventListener('click', () => {
            console.log('Restart button clicked');
            this.restartGame();
        });
        document.getElementById('pauseBtn').addEventListener('click', () => {
            console.log('Pause button clicked');
            this.togglePause();
        });
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            console.log('Play again button clicked');
            this.restartGame();
        });
        
        // Canvas touch/mouse controls for mobile
        this.canvas.addEventListener('mousedown', () => {
            if (this.gameState === 'playing') {
                this.keys.space = true;
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.keys.space = false;
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameState === 'playing') {
                this.keys.space = true;
            }
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.keys.space = false;
        });
    }
    
    setDifficulty(difficulty) {
        console.log('Setting difficulty to:', difficulty);
        this.difficulty = difficulty;
        this.currentSettings = this.difficultySettings[difficulty];
        
        // Update physics based on difficulty
        this.gravity = this.currentSettings.gravity;
        this.floatSpeed = this.currentSettings.floatSpeed;
        
        // Update UI
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-difficulty="${difficulty}"]`).classList.add('active');
        document.getElementById('current-difficulty').textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
        
        // Hide difficulty selector when game starts
        if (this.gameState === 'playing') {
            document.getElementById('difficultySelector').style.display = 'none';
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('restartBtn').style.display = 'inline-block';
        document.getElementById('pauseBtn').style.display = 'inline-block';
        document.getElementById('difficultySelector').style.display = 'none';
        this.resetGame();
    }
    
    restartGame() {
        this.gameState = 'playing';
        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('restartBtn').style.display = 'inline-block';
        document.getElementById('pauseBtn').style.display = 'inline-block';
        document.getElementById('difficultySelector').style.display = 'none';
        this.resetGame();
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pauseBtn').textContent = 'Resume';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pauseBtn').textContent = 'Pause';
        }
    }
    
    resetGame() {
        this.score = 0;
        this.gameSpeed = this.currentSettings.gameSpeed;
        this.gravity = this.currentSettings.gravity;
        this.floatSpeed = this.currentSettings.floatSpeed;
        this.player.x = 100;
        this.player.y = this.groundY - this.player.height;
        this.player.velY = 0;
        this.player.jumping = false;
        this.player.grounded = true;
        this.obstacles = [];
        this.coins = [];
        this.particles = [];
        this.obstacleTimer = 0;
        this.coinTimer = 0;
        // Reset input state
        this.keys.space = false;
        this.keys.up = false;
        this.updateScoreDisplay();
    }
    
    handleFloating() {
        if (this.gameState === 'playing' && (this.keys.space || this.keys.up)) {
            // Set constant upward velocity for floating
            this.player.velY = this.floatSpeed;
            this.player.jumping = true;
            this.player.grounded = false;
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // Update player physics
        this.updatePlayer();
        
        // Update game objects
        this.updateObstacles();
        this.updateCoins();
        this.updateParticles();
        this.updateClouds();
        
        // Spawn new objects
        this.spawnObstacles();
        this.spawnCoins();
        
        // Check collisions
        this.checkCollisions();
        
        // Update score and difficulty
        this.score += 1;
        this.gameSpeed = Math.min(this.currentSettings.gameSpeed + 2, this.currentSettings.gameSpeed + this.score / 1000);
        this.updateScoreDisplay();
    }
    
    updatePlayer() {
        // Handle floating input
        this.handleFloating();
        
        // Apply gravity
        this.player.velY += this.gravity;
        this.player.y += this.player.velY;
        
        // Prevent going above screen
        if (this.player.y < 0) {
            this.player.y = 0;
            this.player.velY = 0;
        }
        
        // Ground collision
        if (this.player.y >= this.groundY - this.player.height) {
            this.player.y = this.groundY - this.player.height;
            this.player.velY = 0;
            this.player.jumping = false;
            this.player.grounded = true;
        } else {
            this.player.grounded = false;
        }
    }
    
    updateObstacles() {
        this.obstacles = this.obstacles.filter(obstacle => {
            obstacle.x -= this.gameSpeed;
            return obstacle.x + obstacle.width > 0;
        });
    }
    
    updateCoins() {
        this.coins = this.coins.filter(coin => {
            coin.x -= this.gameSpeed;
            coin.rotation += 0.1;
            return coin.x + coin.width > 0;
        });
    }
    
    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.velX;
            particle.y += particle.velY;
            particle.velY += 0.2;
            particle.life--;
            return particle.life > 0;
        });
    }
    
    updateClouds() {
        this.clouds.forEach(cloud => {
            cloud.x -= 0.5;
            if (cloud.x + cloud.width < 0) {
                cloud.x = this.width;
            }
        });
    }
    
    spawnObstacles() {
        this.obstacleTimer++;
        const frequency = this.currentSettings.obstacleFrequency - this.gameSpeed * 5;
        
        if (this.obstacleTimer > frequency) {
            // Single obstacle
            this.obstacles.push({
                x: this.width,
                y: this.groundY - this.currentSettings.obstacleHeight,
                width: 25,
                height: this.currentSettings.obstacleHeight,
                color: '#8B4513'
            });
            
            // Add second obstacle for medium/hard difficulty
            if (this.currentSettings.multipleObstacles && Math.random() < 0.3) {
                this.obstacles.push({
                    x: this.width + 100,
                    y: this.groundY - (this.currentSettings.obstacleHeight - 10),
                    width: 25,
                    height: this.currentSettings.obstacleHeight - 10,
                    color: '#8B4513'
                });
            }
            
            this.obstacleTimer = 0;
        }
    }
    
    spawnCoins() {
        this.coinTimer++;
        if (this.coinTimer > this.currentSettings.coinFrequency) {
            this.coins.push({
                x: this.width,
                y: this.groundY - 100 - Math.random() * 100,
                width: 25,
                height: 25,
                rotation: 0,
                collected: false
            });
            this.coinTimer = 0;
        }
    }
    
    checkCollisions() {
        // Obstacle collisions
        this.obstacles.forEach(obstacle => {
            if (this.isColliding(this.player, obstacle)) {
                this.gameOver();
            }
        });
        
        // Coin collisions
        this.coins.forEach(coin => {
            if (!coin.collected && this.isColliding(this.player, coin)) {
                coin.collected = true;
                this.score += 100;
                this.createParticles(coin.x + coin.width / 2, coin.y + coin.height / 2, '#FFD700');
                this.coins = this.coins.filter(c => c !== coin);
            }
        });
    }
    
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    createParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                velX: (Math.random() - 0.5) * 8,
                velY: (Math.random() - 0.5) * 8,
                color: color,
                life: 30
            });
        }
    }
    
    generateClouds() {
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * this.width,
                y: 50 + Math.random() * 100,
                width: 60 + Math.random() * 40,
                height: 30 + Math.random() * 20
            });
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('restartBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'none';
        document.getElementById('difficultySelector').style.display = 'block';
        
        // Update high score with difficulty-specific key
        const highScoreKey = `everlynHighScore_${this.difficulty}`;
        const currentHighScore = localStorage.getItem(highScoreKey) || 0;
        
        if (this.score > currentHighScore) {
            localStorage.setItem(highScoreKey, this.score);
            this.highScore = this.score;
            document.getElementById('newHighScore').style.display = 'block';
        } else {
            this.highScore = currentHighScore;
            document.getElementById('newHighScore').style.display = 'none';
        }
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').style.display = 'block';
        this.updateHighScoreDisplay();
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw background gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98FB98');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw clouds
        this.drawClouds();
        
        // Draw ground
        this.drawGround();
        
        // Draw game objects
        this.drawPlayer();
        this.drawObstacles();
        this.drawCoins();
        this.drawParticles();
        
        // Draw UI
        if (this.gameState === 'paused') {
            this.drawPausedScreen();
        }
    }
    
    drawClouds() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.clouds.forEach(cloud => {
            this.ctx.beginPath();
            this.ctx.arc(cloud.x, cloud.y, cloud.width / 3, 0, Math.PI * 2);
            this.ctx.arc(cloud.x + cloud.width / 3, cloud.y, cloud.width / 2.5, 0, Math.PI * 2);
            this.ctx.arc(cloud.x + cloud.width / 1.5, cloud.y, cloud.width / 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawGround() {
        // Ground
        this.ctx.fillStyle = '#4a5d23';
        this.ctx.fillRect(0, this.groundY, this.width, this.groundHeight);
        
        // Grass pattern
        this.ctx.fillStyle = '#5a7233';
        for (let i = 0; i < this.width; i += 20) {
            this.ctx.fillRect(i, this.groundY, 15, 10);
        }
    }
    
    drawPlayer() {
        this.ctx.save();
        
        // Jump animation
        if (this.player.jumping) {
            this.ctx.translate(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
            this.ctx.rotate(Math.sin(Date.now() * 0.01) * 0.3);
            this.ctx.translate(-this.player.width / 2, -this.player.height / 2);
        } else {
            this.ctx.translate(this.player.x, this.player.y);
        }
        
        if (this.imageLoaded) {
            // Draw the Everlyn logo
            this.ctx.drawImage(this.playerImage, 0, 0, this.player.width, this.player.height);
        } else {
            // Fallback: Draw a stylized character
            this.ctx.fillStyle = this.player.color;
            this.ctx.fillRect(0, 0, this.player.width, this.player.height);
            
            // Add some character details
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(10, 10, 15, 15); // Eye
            this.ctx.fillRect(35, 10, 15, 15); // Eye
            
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(15, 15, 5, 5); // Pupil
            this.ctx.fillRect(40, 15, 5, 5); // Pupil
            
            this.ctx.fillStyle = '#FF1493';
            this.ctx.fillRect(20, 35, 20, 5); // Smile
        }
        
        this.ctx.restore();
    }
    
    drawObstacles() {
        this.obstacles.forEach(obstacle => {
            // Draw cactus-like obstacle
            this.ctx.fillStyle = obstacle.color;
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // Add spikes
            this.ctx.fillStyle = '#654321';
            for (let i = 0; i < obstacle.height; i += 10) {
                this.ctx.fillRect(obstacle.x - 5, obstacle.y + i, 5, 3);
                this.ctx.fillRect(obstacle.x + obstacle.width, obstacle.y + i, 5, 3);
            }
        });
    }
    
    drawCoins() {
        this.coins.forEach(coin => {
            this.ctx.save();
            this.ctx.translate(coin.x + coin.width / 2, coin.y + coin.height / 2);
            this.ctx.rotate(coin.rotation);
            
            // Draw coin
            this.ctx.fillStyle = '#FFD700';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, coin.width / 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Add shine effect
            this.ctx.fillStyle = '#FFF8DC';
            this.ctx.beginPath();
            this.ctx.arc(-coin.width / 6, -coin.height / 6, coin.width / 6, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw "E" for Everlyn in the center
            this.ctx.fillStyle = '#8B4513';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('E', 0, 0);
            
            this.ctx.restore();
            
            // Draw "Everlyn Coin" text above the coin
            this.ctx.save();
            this.ctx.fillStyle = '#FFD700';
            this.ctx.strokeStyle = '#8B4513';
            this.ctx.lineWidth = 1;
            this.ctx.font = 'bold 10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.strokeText('Everlyn Coin', coin.x + coin.width / 2, coin.y - 8);
            this.ctx.fillText('Everlyn Coin', coin.x + coin.width / 2, coin.y - 8);
            this.ctx.restore();
        });
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life / 30;
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(particle.x, particle.y, 4, 4);
            this.ctx.restore();
        });
    }
    
    drawPausedScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', this.width / 2, this.height / 2);
        
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Click Resume to continue', this.width / 2, this.height / 2 + 50);
    }
    
    updateScoreDisplay() {
        document.getElementById('score').textContent = this.score;
    }
    
    updateHighScoreDisplay() {
        const highScoreKey = `everlynHighScore_${this.difficulty}`;
        const currentHighScore = localStorage.getItem(highScoreKey) || 0;
        document.getElementById('high-score').textContent = currentHighScore;
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    console.log('Page loaded, initializing game...');
    const game = new Game();
    
    // Initialize difficulty display
    document.getElementById('current-difficulty').textContent = 'Easy';
    console.log('Game initialized successfully');
});
window.addEventListener('load', () => {
    const game = new Game();
    
    // Initialize difficulty display
    document.getElementById('current-difficulty').textContent = 'Easy';
});