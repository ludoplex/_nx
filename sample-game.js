// Simple Bouncing Ball Game
// This is a sample game to test the Puter Game Hub extension

(function() {
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  canvas.style.border = '2px solid #667eea';
  canvas.style.borderRadius = '8px';
  canvas.style.display = 'block';
  canvas.style.margin = '20px auto';
  canvas.style.background = '#1a1a2e';
  
  const gameContainer = document.getElementById('game') || document.body;
  gameContainer.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  
  // Game state
  let ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    dx: 3,
    dy: 2,
    color: '#00d4ff'
  };
  
  let paddle = {
    x: canvas.width / 2 - 50,
    y: canvas.height - 30,
    width: 100,
    height: 10,
    color: '#ff006e'
  };
  
  let score = 0;
  let gameOver = false;
  
  // Mouse control
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    paddle.x = e.clientX - rect.left - paddle.width / 2;
    
    // Keep paddle in bounds
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) {
      paddle.x = canvas.width - paddle.width;
    }
  });
  
  // Touch control for mobile
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    paddle.x = touch.clientX - rect.left - paddle.width / 2;
    
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) {
      paddle.x = canvas.width - paddle.width;
    }
  });
  
  // Restart button
  canvas.addEventListener('click', () => {
    if (gameOver) {
      resetGame();
    }
  });
  
  function resetGame() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = 3;
    ball.dy = 2;
    score = 0;
    gameOver = false;
  }
  
  function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();
    
    // Glow effect
    ctx.shadowBlur = 20;
    ctx.shadowColor = ball.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  
  function drawPaddle() {
    ctx.fillStyle = paddle.color;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    
    // Glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = paddle.color;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.shadowBlur = 0;
  }
  
  function drawScore() {
    ctx.font = '20px Arial';
    ctx.fillStyle = '#00d4ff';
    ctx.fillText(`Score: ${score}`, 20, 30);
  }
  
  function drawGameOver() {
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = '#ff006e';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
    
    ctx.font = '20px Arial';
    ctx.fillStyle = '#00d4ff';
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText('Click to Restart', canvas.width / 2, canvas.height / 2 + 50);
    ctx.textAlign = 'left';
  }
  
  function update() {
    if (gameOver) return;
    
    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    // Wall collision (left and right)
    if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
      ball.dx = -ball.dx;
    }
    
    // Top wall collision
    if (ball.y - ball.radius < 0) {
      ball.dy = -ball.dy;
    }
    
    // Paddle collision
    if (
      ball.y + ball.radius > paddle.y &&
      ball.x > paddle.x &&
      ball.x < paddle.x + paddle.width
    ) {
      ball.dy = -ball.dy;
      score += 10;
      
      // Increase speed slightly
      ball.dx *= 1.02;
      ball.dy *= 1.02;
      
      // Change ball color
      ball.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    }
    
    // Bottom collision (game over)
    if (ball.y + ball.radius > canvas.height) {
      gameOver = true;
    }
  }
  
  function draw() {
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawBall();
    drawPaddle();
    drawScore();
    
    if (gameOver) {
      drawGameOver();
    }
  }
  
  function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }
  
  // Start game
  gameLoop();
  
  // Instructions
  const instructions = document.createElement('div');
  instructions.style.textAlign = 'center';
  instructions.style.color = '#eee';
  instructions.style.marginTop = '10px';
  instructions.innerHTML = '<p>Move your mouse or touch to control the paddle. Keep the ball bouncing!</p>';
  gameContainer.appendChild(instructions);
})();
