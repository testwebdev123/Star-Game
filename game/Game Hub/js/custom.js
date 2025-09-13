// Cartoon Collector — single-file game
    // Clean, minimal, no external assets.

    // Setup canvas and scaling
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    function resize() {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.floor(r.width);
      canvas.height = Math.floor(r.height);
    }
    window.addEventListener('resize', resize);
    resize();

    // HUD
    const scoreEl = document.getElementById('score');
    const livesEl = document.getElementById('lives');
    const levelEl = document.getElementById('level');

    // Input state
    const keys = {left:false,right:false,jump:false};
    window.addEventListener('keydown', e=>{
      if(e.code==='ArrowLeft' || e.key==='ArrowLeft') keys.left=true;
      if(e.code==='ArrowRight' || e.key==='ArrowRight') keys.right=true;
      if(e.code==='ArrowUp' || e.key==='ArrowUp' || e.code==='Space') keys.jump=true;
    });
    window.addEventListener('keyup', e=>{
      if(e.code==='ArrowLeft' || e.key==='ArrowLeft') keys.left=false;
      if(e.code==='ArrowRight' || e.key==='ArrowRight') keys.right=false;
      if(e.code==='ArrowUp' || e.key==='ArrowUp' || e.code==='Space') keys.jump=false;
    });

    // Touch controls
    ['left','right','jump','pause'].forEach(id=>{
      const el = document.getElementById(id);
      if(!el) return;
      let down=false;
      el.addEventListener('pointerdown', ()=>{down=true; el.setPointerCapture && el.setPointerCapture(event.pointerId); if(id==='left') keys.left=true; if(id==='right') keys.right=true; if(id==='jump') keys.jump=true; if(id==='pause') togglePause();});
      el.addEventListener('pointerup', ()=>{down=false; if(id==='left') keys.left=false; if(id==='right') keys.right=false; if(id==='jump') keys.jump=false;});
      el.addEventListener('pointercancel', ()=>{down=false; if(id==='left') keys.left=false; if(id==='right') keys.right=false; if(id==='jump') keys.jump=false;});
    });

    // Game state
    let width = ()=>canvas.width, height=()=>canvas.height;
    const groundYRatio = 0.78;

    const player = {
      x: 100, y:0, w:46, h:58,
      vx:0, vy:0, speed: 3.6, jumpStrength: -12, grounded:false
    };

    let stars = [];
    let enemies = [];
    let score = 0;
    let lives = 3;
    let level = 1;
    let paused = false;
    let gameOver = false;

    // Utility functions
    function rand(min,max){return Math.random()*(max-min)+min}

    function spawnStars(n=6){
      stars = [];
      for(let i=0;i<n;i++){
        const s = {x:rand(120,width()-60), y:rand(80,height()*groundYRatio-120), r:12 + Math.random()*8, collected:false};
        stars.push(s);
      }
    }

    function spawnEnemies(n=2){
      enemies = [];
      for(let i=0;i<n;i++){
        const e = {x:rand(300,width()-80), y:height()*groundYRatio-36, w:44, h:36, dir: Math.random()>0.5?1:-1, speed:1 + Math.random()*1.6}
        enemies.push(e);
      }
    }

    function resetLevel() {
      score = 0;
      if(level<1) level=1;
      spawnStars(5 + level);
      spawnEnemies(1 + Math.floor(level/2));
      player.x = 80; player.y = height()*0.5; player.vx=0; player.vy=0; player.grounded=false;
      lives = 3;
      gameOver = false;
      paused = false;
      updateHUD();
    }

    function updateHUD(){ scoreEl.textContent = score; livesEl.textContent = lives; levelEl.textContent = level; }

    // Physics update
    function update(dt){
      if(gameOver || paused) return;

      // horizontal movement
      let move = 0;
      if(keys.left) move -= 1;
      if(keys.right) move += 1;
      player.vx = move * player.speed;

      // apply gravity
      player.vy += 0.6; // gravity constant
      player.x += player.vx;
      player.y += player.vy;

      // ground collision
      const groundY = height()*groundYRatio;
      if(player.y + player.h/2 >= groundY){
        player.y = groundY - player.h/2;
        player.vy = 0;
        player.grounded = true;
      } else {
        player.grounded = false;
      }

      // jump
      if(keys.jump && player.grounded){ player.vy = player.jumpStrength; player.grounded=false }

      // world bounds
      if(player.x < player.w/2) player.x = player.w/2;
      if(player.x > width() - player.w/2) player.x = width() - player.w/2;

      // enemies move
      enemies.forEach(e=>{
        e.x += e.dir * e.speed;
        if(e.x < 40 || e.x > width() - 40) e.dir *= -1;
      });

      // collect stars
      stars.forEach(s=>{
        if(s.collected) return;
        const dx = player.x - s.x, dy = (player.y - s.y);
        const dist = Math.sqrt(dx*dx + dy*dy);
        if(dist < s.r + Math.max(player.w, player.h)/2 - 6){
          s.collected = true;
          score += 10;
          updateHUD();
        }
      });

      // enemy collisions
      enemies.forEach(e=>{
        const px = player.x, py = player.y;
        const ex = e.x, ey = e.y - e.h/2;
        const overlapX = Math.abs(px - ex) < (player.w/2 + e.w/2);
        const overlapY = Math.abs(py - ey) < (player.h/2 + e.h/2 - 6);
        if(overlapX && overlapY){
          // lose a life and bounce the player
          lives -= 1; updateHUD();
          player.vy = -8;
          player.y -= 20;
          if(lives <= 0) { gameOver = true }
        }
      });

      // level complete when all stars collected
      const remaining = stars.filter(s=>!s.collected).length;
      if(remaining === 0){ level += 1; spawnStars(5 + level); spawnEnemies(1 + Math.floor(level/2)); updateHUD(); }
    }

    // Drawing helpers (cartoon style)
    function drawRoundedRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); ctx.fill(); }

    function draw(){
      // clear
      ctx.clearRect(0,0,canvas.width,canvas.height);

      // sky gradient
      const g = ctx.createLinearGradient(0,0,0,canvas.height);
      g.addColorStop(0,'#9fe1ff'); g.addColorStop(1,'#b6e6ff');
      ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width,canvas.height);

      // distant hills
      ctx.fillStyle = '#8fd08a';
      ctx.beginPath(); ctx.ellipse(canvas.width*0.2, canvas.height*0.9, canvas.width*0.6, 140, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(canvas.width*0.8, canvas.height*0.94, canvas.width*0.5, 120, 0, 0, Math.PI*2); ctx.fill();

      // ground
      const groundY = canvas.height * groundYRatio;
      ctx.fillStyle = '#4CAF50'; ctx.fillRect(0, groundY, canvas.width, canvas.height-groundY);

      // clouds (simple)
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      for(let i=0;i<4;i++){ const cx = (i*220 + (Date.now()/60 % 900)); ctx.beginPath(); ctx.ellipse((cx)%canvas.width, 80 + (i%2)*10, 50,28,0,0,Math.PI*2); ctx.ellipse((cx+40)%canvas.width,92 + (i%2)*8,40,22,0,0,Math.PI*2); ctx.fill(); }

      // draw stars
      stars.forEach(s=>{
        if(s.collected) return;
        ctx.save(); ctx.translate(s.x, s.y);
        // glow
        ctx.beginPath(); ctx.arc(0,0,s.r+8,0,Math.PI*2); ctx.fillStyle='rgba(255,230,0,0.12)'; ctx.fill();
        // simple star (cartoon)
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        for(let i=0;i<5;i++){
          const a = i*(Math.PI*2)/5 - Math.PI/2;
          const r1 = s.r; const r2 = s.r*0.45;
          ctx.lineTo(Math.cos(a)*r1, Math.sin(a)*r1);
          const a2 = a + Math.PI/5;
          ctx.lineTo(Math.cos(a2)*r2, Math.sin(a2)*r2);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
      });

      // draw enemies (cute critters)
      enemies.forEach(e=>{
        ctx.save(); ctx.translate(e.x, e.y - e.h/2);
        // body
        ctx.fillStyle = '#FF8A65'; drawRoundedRect(-e.w/2,-e.h/2,e.w,e.h,10);
        // eyes
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(-8,-6,7,8,0,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(8,-6,7,8,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#333'; ctx.beginPath(); ctx.arc(-8,-4,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(8,-4,3,0,Math.PI*2); ctx.fill();
        ctx.restore();
      });

      // draw player (cartoon hero)
      ctx.save(); ctx.translate(player.x, player.y);
      // shadow
      ctx.beginPath(); ctx.ellipse(0, player.h/2 + 6, player.w*0.5, 8, 0, 0, Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.12)'; ctx.fill();
      // body
      ctx.fillStyle = '#FFD54F'; drawRoundedRect(-player.w/2, -player.h/2, player.w, player.h, 12);
      // eyes
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-10,-8,6,7,0,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(10,-8,6,7,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(-10,-6,2.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(10,-6,2.5,0,Math.PI*2); ctx.fill();
      // smile
      ctx.beginPath(); ctx.arc(0,2,10,0,Math.PI); ctx.strokeStyle='#6d4c41'; ctx.lineWidth=2; ctx.stroke();
      // backpack
      ctx.fillStyle='#8C9EFF'; drawRoundedRect(-player.w/2 -6, -player.h/2 + 6, 16, 26, 6);
      ctx.restore();

      // game over overlay
      if(gameOver){ ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#fff'; ctx.font='36px system-ui'; ctx.textAlign='center'; ctx.fillText('Game Over', canvas.width/2, canvas.height/2 - 10); ctx.font='18px system-ui'; ctx.fillText('Press Restart to try again', canvas.width/2, canvas.height/2 + 26); }

      // paused overlay
      if(paused && !gameOver){ ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#333'; ctx.font='30px system-ui'; ctx.textAlign='center'; ctx.fillText('Paused', canvas.width/2, canvas.height/2); }
    }

    // game loop
    let last = performance.now();
    function loop(t){
      const dt = (t-last)/16.666; last=t; // normalized delta
      update(dt);
      draw();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // pause toggle
    function togglePause(){ paused = !paused; }

    // restart button
    document.getElementById('restart').addEventListener('click', ()=>{ level = 1; resetLevel(); });
    document.getElementById('pause').addEventListener('click', ()=>{ togglePause(); });

    // initialize
    resetLevel();

    // robust safety: stop inputs when tab hidden
    document.addEventListener('visibilitychange', ()=>{ if(document.hidden) { keys.left=keys.right=keys.jump=false; paused=true } });

    // small helpful notes for customization (kept in code comments so no runtime effect)
    // - Increase player.speed or player.jumpStrength to change feel.
    // - Change spawnStars(n) to influence difficulty.
    // - This game is intentionally lightweight and dependency-free.