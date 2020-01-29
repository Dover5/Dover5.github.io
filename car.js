// const socket = io('http://127.0.0.1:80');

// Nickname

const randomNick = Math.floor((Math.random() * 100000) + 1);
nickname = "Player" + String(randomNick);
nick.innerHTML = nickname;

const randomCar = Math.floor((Math.random() * 13) + 1);
user.style.backgroundImage = `url(cars/car${randomCar}.png)`;
user.addEventListener('click', () => changeCar(user));

// Physics

const maxPower = 0.085;
const maxReverse = 0.0375;
const powerFactor = 0.001;
const reverseFactor = 0.0005;

const drag = 0.95;
const angularDrag = 0.95;
const turnSpeed = 0.0013;

// Weapon propeties

let rate_of_fire = false;
let reload_weapon = false;
const weapons = [["Uzi", 30, 1150, 65, 1], ["Shotgun", 8, 2000, 1000, 1], ["Pistol", 12, 950, 285, 3], ["SCAR", 28, 1450, 80, 1.5], ["Revolver", 6, 1700, 385, 5], ["USAS-12", 10, 2300, 410, 0.7], ["Mines", 1, 2000, 2000, 25]];
const bulletVelocity = 8;
let current_weapon = 0;
let current_ammo = [30, 8, 12, 28, 6, 10, 1]
let max_mines = 3;
const gunShot = new Audio('sfx/gun.wav');
const gunHit = new Audio('sfx/hit.wav');
const gunMine = new Audio('sfx/mine.wav');
const gunExplode = new Audio('sfx/explode.wav');

let isDead = false;
let deadPlayers = new Set();
let killTimeout = 0;
let hitByMine = false;
let carHitByMine = false;
let writingMsg = false;
carsTimeout = [];
localCarTimeout = 0;

const randomSpawn = Math.round((Math.random() * 3));
const spawnPoints = [[100, 100], [666, 865], [1241, 481], [896, 365]];

const buildingsCoords = [[0, 251, 180, 289, "1"], [322, 0, 320, 203, "2"], [283, 312, 143, 283, "3"], [457, 312, 208, 139, "4"], [545, 478, 119, 281, "5"], [283, 624, 235, 327, "6"], [673, 77, 414, 129, "7"], [772, 442, 314, 126, "8"], [773, 679, 361, 156, "9"], [37, 569, 144, 370, "10"], [945, 861, 190, 352, "11"], [1169, 227, 434, 140, "12"], [1465, 360, 138, 215, "12"], [282, 999, 384, 170, "13"], [1117, 31, 330, 150, "14"], [1642, 0, 148, 368, "16"], [1262, 692, 173, 397, "15"]];

window.onbeforeunload = function(){
  window.scrollTo(0, 0);
}

const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;

const canvas = document.getElementsByTagName('canvas')[0];
const ctx = canvas.getContext('2d');
const canvas2 = document.getElementsByTagName('canvas')[1];
const ctx_2 = canvas2.getContext('2d');
canvas.width = 4000;
canvas.height = 4000;
canvas2.width = 4000;
canvas2.height = 4000;

const scene = document.getElementsByClassName('scene')[0];

const localCar = {
  el: document.getElementsByClassName('car')[0],
  x: spawnPoints[randomSpawn][0],
  y: spawnPoints[randomSpawn][1],
  xVelocity: 0,
  yVelocity: 0,
  power: 0,
  reverse: 0,
  angle: 0,
  angularVelocity: 0,
  isThrottling: false,
  isReversing: false,
  health: 100,
  nickname: nickname,
  carImg: randomCar,
  afk: 0,
  message: "",
  killedBy: [],
  score: 0,
  bullets: [],
  hitId: []
};

setTimeout(() => window.scrollTo(localCar.x - windowWidth / 2, localCar.y - windowHeight / 2), 400);

const cars = [localCar];
const carsById = {};

// Key codes

const arrowKeys = {
  up: 38,
  down: 40,
  left: 37,
  right: 39
};
const wasdKeys = {
  up: 87,
  down: 83,
  left: 65,
  right: 68,
  space: 32,
  r: 82,
  q: 81,
  e: 69
};

let keysDown = {};

const keyActive = (key) => {
  return keysDown[arrowKeys[key]] || keysDown[wasdKeys[key]] || false;
};

// CHAT - added close with esc (150), msg timeout (288-293),  show message (507-512), message to localCar and socket

let msgTimeout = 0;
message.style.display = "none";

message.addEventListener('keypress', function(event) {
  if (event.keyCode == 13) {
	event.preventDefault();
    localCar.message = message.value;
	message.value = "";
	message.style.display = "none";
	msgTimeout = 0;
	localCarTimeout = 0;
	writingMsg = false;
  }
});

function showChat() {
  if (message.style.display == "none") {
    message.style.display = "block";
	writingMsg = true;
	setTimeout(() => message.focus(), 10)
  }
}

document.addEventListener('keydown', function(event) {
  const key = event.key;
  for (let w = 0; w < weapons.length; w++) {
	if (key == `${w+1}` && writingMsg == false) {
	  current_weapon = w;
	  weapon_propeties();
	} 	
  }
  if ((key == "z" || key == "Z") && writingMsg == false) {
	current_weapon++;
    if (current_weapon > weapons.length-1) {
  	  current_weapon = 0;
    }
    weapon_propeties();
  }
  if (key == "t" || key == "T") {
	showChat();
	localCarTimeout = 0;
  }
  if (event.keyCode == 27) {
	if (message.style.display != "block") {
	  showMenu();
	  window.scrollTo(localCar.x - screen.width / 2, localCar.y  - screen.height / 2);
    }
	message.value = "";
	message.style.display = "none"
	writingMsg = false;
  }
});

window.addEventListener('keydown', e => {
  keysDown[e.which] = true;
});

window.addEventListener('keyup', e => {
  keysDown[e.which] = false;
});

const touching = {
  up: 0,
  down: 0,
  left: 0,
  right: 0
};

window.addEventListener('touchstart', e => {
  e.preventDefault();

  if (touching.active) {
    return;
  }
  touching.active = true;

  const prevPos = {
    x: e.touches[0].pageX,
    y: e.touches[0].pageY
  };

  const touchmove = e => {
    e.preventDefault();

    const pos = {
      x: e.touches[0].pageX,
      y: e.touches[0].pageY
    };

    const diff = {
      x: pos.x - prevPos.x,
      y: pos.y - prevPos.y
    };

    prevPos.x = pos.x;
    prevPos.y = pos.y;

    touching.up -= diff.y / (windowHeight / 3);
    touching.down += diff.y / (windowHeight / 3);
    touching.left -= diff.x / (windowWidth / 3);
    touching.right += diff.x / (windowWidth / 3);

    touching.up = Math.max(0, Math.min(1, touching.up));
    touching.down = Math.max(0, Math.min(1, touching.down));
    touching.left = Math.max(0, Math.min(1, touching.left));
    touching.right = Math.max(0, Math.min(1, touching.right));
  };

  const touchend = e => {
    touching.active = false;
    touching.up = 0;
    touching.down = 0;
    touching.left = 0;
    touching.right = 0;

    window.removeEventListener('touchmove', touchmove);
    window.removeEventListener('touchend', touchend);
  };

  window.addEventListener('touchmove', touchmove);
  window.addEventListener('touchend', touchend);
});

function updateCar (car, i) {
  if (document.hasFocus() && isDead == false && writingMsg == false) { 
    if (car.isThrottling) {
      car.power += powerFactor * car.isThrottling;
    } else {
      car.power -= powerFactor;
    }
    if (car.isReversing) {
      car.reverse += reverseFactor;
    } else {
      car.reverse -= reverseFactor;
    }

    car.power = Math.max(0, Math.min(maxPower, car.power));
    car.reverse = Math.max(0, Math.min(maxReverse, car.reverse));

    const direction = car.power > car.reverse ? 1 : -1;

    if (car.isTurningLeft) {
      car.angularVelocity -= direction * turnSpeed * car.isTurningLeft;
    }
    if (car.isTurningRight) {
      car.angularVelocity += direction * turnSpeed * car.isTurningRight;
    }

    car.xVelocity += Math.sin(car.angle) * (car.power - car.reverse);
    car.yVelocity += Math.cos(car.angle) * (car.power - car.reverse);
  }
  else {	 
	car.power = 0;
  }
  
  if (document.hasFocus() && localCar.afk == 1) {
	localCar.afk = 0;
	localCarTimeout = 0;
  } 
  if (!document.hasFocus() && localCar.afk == 0) {
    keysDown = {};
	localCar.afk = 1;
  } 
  
  car.x += car.xVelocity;
  car.y -= car.yVelocity;
  car.xVelocity *= drag;
  car.yVelocity *= drag;
  car.angle += car.angularVelocity;
  car.angularVelocity *= angularDrag;
}

function update () {
  cars.forEach(updateCar);
}

function timedOut() {
  socket.disconnect();
  while (cars.length > 1) {
    const car = cars.pop();
    car.el.parentNode.removeChild(car.el);		
  }
  disconnect.parentNode.removeChild(disconnect);
}

let lastTime;
let acc = 0;
const step = 1 / 120;

score.innerHTML = "Score: " + localCar.score;

setInterval(() => {
  ctx_2.clearRect(0, 0, 4000, 4000);
  
  if (localCar.power != 0) {
	localCarTimeout = 0;  
  }   
  if (localCar.power == 0) {
    localCarTimeout++;
	if (localCar.afk == 0 && localCarTimeout == 4500) {
	  killTimeout = -1000000;
      killfeed.innerHTML = "<font color='red'>Disconnected - timed out for no actions</font>";
	  timedOut();
	}
  }
	
  if (msgTimeout < 700) {
	msgTimeout++;
  }
  if (msgTimeout == 700) {
	localCar.message = "";
  } 
  if (killTimeout < 400) {
	killTimeout++;
  }
  if (killTimeout == 400) {
	killfeed.innerHTML = "";
  }     
  																								// LocalCar death
  if (localCar.health <= 0 && isDead == false) {
	isDead = true;	  
	localCar.health = 0;

	let explode = document.createElement("DIV");
	explode.setAttribute("class", "explosion");
	explode.setAttribute("style", `left: ${localCar.x-52}px; top: ${localCar.y-52}px;`);
	scene.appendChild(explode);
	user.style.backgroundImage = "url('cars/car_burnt.png')";
	max_mines = 3;
	randomSpawn = Math.round((Math.random() * 3));
	
	killTimeout = 0;
	if (localCar.killedBy.length > 0) {
	  killfeed.innerHTML = '<font color="green">You </font>' + "was killed by" + `<font color="red"> ${localCar.killedBy[0]} </font>`;
	}
	else {
	  killfeed.innerHTML = '<font color="green">You </font> commited suicide';
	  score.innerHTML = "Score: " + localCar.score;
	}
	
	setTimeout(() => user.style.backgroundImage = `url('cars/car${localCar.carImg}.png')`, 3000);
	setTimeout(() => scene.removeChild(explode), 18000);
	setTimeout(() => isDead = false, 3000);	
	setTimeout(() => localCar.health = 100, 3000);
	setTimeout(() => window.scrollTo(0, 0), 3000);
	setTimeout(() => localCar.killedBy = [], 3000);
	setTimeout(() => localCar.bullets = [], 3000);
	setTimeout(() => current_ammo = [30, 8, 12, 28, 6, 10, 1], 3000);
	setTimeout(() => weapon_propeties(), 3000);
	setTimeout(() => localCar.x = spawnPoints[randomSpawn][0], 3000);
    setTimeout(() => localCar.y = spawnPoints[randomSpawn][1], 3000);
			
    gunExplode.currentTime = 0;	
	gunExplode.play();
  }   																							// Shooting, Reloading
  
  if (keysDown[82] && current_ammo[current_weapon] < weapons[current_weapon][1] && reload_weapon == false && weapons[current_weapon][0] != "Mines" && writingMsg == false) {
	ammo.innerText = `Reloading`
	reload_weapon = true;
	setTimeout(() => current_ammo[current_weapon] = weapons[current_weapon][1], weapons[current_weapon][2]);	
	setTimeout(() => ammo.innerHTML = `<img src="guns/gun${current_weapon+1}.png"> ${weapons[current_weapon][0]} ${current_ammo[current_weapon]} <img src="guns/ammo.png">`, weapons[current_weapon][2]);
	setTimeout(() => reload_weapon = false, weapons[current_weapon][2]);
  }
	
  if (keysDown[32] && rate_of_fire == false && reload_weapon == false && cars[0].yVelocity != 0  && document.hasFocus() && isDead == false && writingMsg == false) {	
	if (current_ammo[current_weapon] > 0) {
	  current_ammo[current_weapon]--;
	  if (current_ammo[current_weapon] > 0) {
	    rate_of_fire = true;
        setTimeout(() => rate_of_fire = false, weapons[current_weapon][3]);
	  }
	}	
		
	let bulletAngle = localCar.angle - 1.57;
	if (keysDown[81]) {
	  bulletAngle = localCar.angle - 3.14;
	}
	if (keysDown[69]) {
	  bulletAngle = localCar.angle;
	}
	
	let vBx = Math.cos(bulletAngle) * bulletVelocity;
	let vBy = Math.sin(bulletAngle) * bulletVelocity;
		
	function addBullet() {
	  let bulletId = Math.floor((Math.random() * 10000000) + 1);
	  let recoil = Math.floor((Math.random() * 4) + 1) / 10;		  
	  localCar.bullets.push({
	    x: localCar.x,
	    y: localCar.y,
	    vx: vBx + recoil,
	    vy: vBy + recoil,
		startPos: [localCar.x, localCar.y],
	    weapon: weapons[current_weapon][0],
		byWho: nickname,
		id: bulletId
      });	
	}
	
	if (weapons[current_weapon][0] == "Mines" && max_mines > 0) {
	  max_mines--;
	  addBullet();
	  gunMine.currentTime = 0;	
	  gunMine.play();
	}
	else if (weapons[current_weapon][0] != "Mines") {
	  if (weapons[current_weapon][0] == "Shotgun") {
		for (let s = 0; s < 10; s++) {
		  addBullet();
		}
	  }
	  if (weapons[current_weapon][0] == "USAS-12") {
		for (let s = 0; s < 7; s++) {
		  addBullet();
		}
	  }
	  else {
	    addBullet();
	  }	  
	  
	  let gunShotClone = gunShot.cloneNode();
	  gunShotClone.play();
	}
	
	if (current_ammo[current_weapon] == 0) {
	  if (weapons[current_weapon][0] == "Mines" && max_mines == 0) {
	    ammo.innerHTML = `<img src="guns/gun${current_weapon+1}.png"> MAX Mines`
	  }
	  else {
	    ammo.innerText = `Reloading`
	    current_ammo[current_weapon] = weapons[current_weapon][1];
	    reload_weapon = true;
	    setTimeout(() => reload_weapon = false, weapons[current_weapon][2]);
		if (weapons[current_weapon][0] == "Mines") {
		  setTimeout(() => ammo.innerHTML = `<img src="guns/gun${current_weapon+1}.png"> ${weapons[current_weapon][0]} ${max_mines} <img src="guns/ammo.png">`, weapons[current_weapon][2]);
		}
		else {
	      setTimeout(() => ammo.innerHTML = `<img src="guns/gun${current_weapon+1}.png"> ${weapons[current_weapon][0]} ${current_ammo[current_weapon]} <img src="guns/ammo.png">`, weapons[current_weapon][2]);
		}
	  }
	}
	else {
	  ammo.innerHTML = `<img src="guns/gun${current_weapon+1}.png"> ${weapons[current_weapon][0]} ${current_ammo[current_weapon]} <img src="guns/ammo.png">`;
	}	 
  }
    																							// Building Hitbox  
  let localCar_hitbox = {x: localCar.x, y: localCar.y, width: 10, height: 10}
  
  for (let m in buildingsCoords) {
    let building_hitbox = {x: buildingsCoords[m][0], y: buildingsCoords[m][1], width: buildingsCoords[m][2], height: buildingsCoords[m][3]}
	
	for (let o in localCar.bullets) {
	  let bullet_hitbox = {x: localCar.bullets[o].x, y: localCar.bullets[o].y, width: 1, height: 1}
	  
	  if (bullet_hitbox.x < building_hitbox.x + building_hitbox.width-5 &&
	    bullet_hitbox.x + bullet_hitbox.width > building_hitbox.x &&
	    bullet_hitbox.y < building_hitbox.y + building_hitbox.height-2 &&
	    bullet_hitbox.y + bullet_hitbox.height > building_hitbox.y) {
		if (localCar.bullets[o].weapon != "Mines"){	
	      localCar.bullets.splice(o, 1);
		}
	  }
	}	

	if (localCar_hitbox.x < building_hitbox.x + building_hitbox.width &&
	  localCar_hitbox.x + localCar_hitbox.width > building_hitbox.x &&
	  localCar_hitbox.y < building_hitbox.y + building_hitbox.height &&
	  localCar_hitbox.y + localCar_hitbox.height > building_hitbox.y) {

	  localCar.health -= 0.1;
	  
	  if (localCar.x < buildingsCoords[m][0] + 10 && (localCar.y > buildingsCoords[m][1] && localCar.y < buildingsCoords[m][1] + buildingsCoords[m][3])) {
		localCar.x = buildingsCoords[m][0] - 10;
        localCar.xVelocity -= 0.2;
      }
      if (localCar.x > buildingsCoords[m][0] + buildingsCoords[m][2] - 10 && (localCar.y > buildingsCoords[m][1] && localCar.y < buildingsCoords[m][1] + buildingsCoords[m][3])) {
		localCar.x = buildingsCoords[m][0] + buildingsCoords[m][2];
        localCar.xVelocity += 0.2;	    
      }	  
      if (localCar.y < buildingsCoords[m][1] + 10 && (localCar.x < buildingsCoords[m][0] + buildingsCoords[m][2] && localCar.x > buildingsCoords[m][0])) {
		localCar.y = buildingsCoords[m][1] - 10;
		localCar.yVelocity += 0.2;
      }
      if (localCar.y > buildingsCoords[m][1] + buildingsCoords[m][3] - 10 && (localCar.x < buildingsCoords[m][0] + buildingsCoords[m][2] && localCar.x > buildingsCoords[m][0])) {
		localCar.y = buildingsCoords[m][1] + buildingsCoords[m][3];
	    localCar.yVelocity -= 0.2;
      }
	}
  }
    																							// Cars hitbox, death
  for (let h = 1; h < cars.length; h++) {
	  
	if (cars[h].power != 0) {
	  carsTimeout[h] = 0;  
	}  
	if (cars[h].afk == 0 && cars[h].power == 0) {
	  carsTimeout[h]++;
	  if (carsTimeout[h] == 4500) {
		killfeed.innerHTML = `<font color="red"> ${cars[h].nickname} timed out </font>`;
	    cars.splice(h, 1);
		scene.removeChild(document.getElementsByClassName("car")[h-1]);
	  }
	}
	  
	if (cars[h].afk == 1) {
	  document.getElementsByClassName("car")[h-1].style.opacity = 0.6; 
	}
	if (cars[h].afk == 0) {
	  document.getElementsByClassName("car")[h-1].style.opacity = 1; 
	}  
	  
	if (cars[h].health > 0) {
	  if (deadPlayers.has(h)) {
	    deadPlayers.delete(h);
	  }
	}
	 
	if (cars[h].health <= 0 && !deadPlayers.has(h)) {
	  killTimeout = 0;
	  
	  if (cars[h].killedBy[0] == undefined) {
	    killfeed.innerHTML = `<font color="red"> ${cars[h].nickname} </font>` + "commited suicide";
	  }
	  else if (cars[h].killedBy[0] == nickname) {
	    killfeed.innerHTML = `<font color="green">You</font>` + " killed " + `<font color="red"> ${cars[h].nickname}</font>`;
		localCar.score += 1;
		score.innerHTML = "Score: " + localCar.score;
	  }
	  else {
		killfeed.innerHTML = `<font color="red"> ${cars[h].nickname} </font>` + "was killed by" + `<font color="red"> ${cars[h].killedBy[0]} </font>`;
	  }
	  
	  deadPlayers.add(h);  
	  let explode = document.createElement("DIV");
	  explode.setAttribute("class", "explosion");
	  explode.setAttribute("style", `left: ${cars[h].x-52}px; top: ${cars[h].y-52}px;`);
	  scene.appendChild(explode);
	  setTimeout(() => scene.removeChild(explode), 18000);
	  document.getElementsByClassName("car")[h-1].style.backgroundImage = "url(cars/car_burnt).png)";
	  
	  gunExplode.pause()
	  gunExplode.currentTime = 0;	
	  gunExplode.play();
	}
	
	let cars_hitbox = {x: cars[h].x, y: cars[h].y, width: 10, height: 10}
	  
	if (localCar_hitbox.x < cars_hitbox.x + cars_hitbox.width &&
	  localCar_hitbox.x + localCar_hitbox.width > cars_hitbox.x &&
	  localCar_hitbox.y < cars_hitbox.y + cars_hitbox.height &&
	  localCar_hitbox.y + localCar_hitbox.height > cars_hitbox.y && cars[h].afk == 0 && localCar.afk == 0) {
	  
	  localCar.yVelocity = -localCar.yVelocity / 2;
	  localCar.xVelocity = -localCar.xVelocity / 2;
	  localCar.power = localCar.power / 100;
	  localCar.health -= 0.5;	  
	   
	  if ((localCar.xVelocity >= 0 || localCar.xVelocity <= 0) && localCar.x <= cars[h].x) {
	    localCar.xVelocity = -0.3;

	  }
	  else if ((localCar.xVelocity >= 0 || localCar.xVelocity <= 0) && localCar.x >= cars[h].x) {
		localCar.xVelocity = 0.3;
	  }
	}
  }
    																							// Chat, Bullet hitbox
  
  chat.innerHTML = "";
  
  for (let x in cars) {	
	if (cars[x].message != "") {    	  
	  chat.innerHTML += `<img src="cars/car${cars[x].carImg}.png"> ` + cars[x].nickname + ": " + cars[x].message + "<br />";
	}
	  
    for (let i in cars[x].bullets) {
	  if (cars[x].bullets[i].weapon != "Mines") {
	    cars[x].bullets[i].x += cars[x].bullets[i].vx;
	    cars[x].bullets[i].y += cars[x].bullets[i].vy;
	  }
	  if (localCar.bullets.includes(localCar.bullets[i]) == true && (localCar.bullets[i].x < 0 || localCar.bullets[i].y < 0 || localCar.bullets[i].x > localCar.bullets[i].startPos[0] + 900 || localCar.bullets[i].y > localCar.bullets[i].startPos[1] + 900)) {
	    localCar.bullets.splice(i, 1);
	  }
	
	  if (cars[x].bullets.includes(cars[x].bullets[i]) == true) {
	    ctx_2.beginPath();	  
	    if (cars[x].bullets[i].weapon == "Mines"){
		  ctx_2.arc(cars[x].bullets[i].x, cars[x].bullets[i].y, 2.5, 0, Math.PI * 2, false);
		  if (cars[x].bullets[i].byWho == nickname) {
			ctx_2.fillStyle = "blue"; 
		  }
		  else {
			ctx_2.fillStyle = "green";  
		  }
		  
	    }
	    else {
		  ctx_2.arc(cars[x].bullets[i].x, cars[x].bullets[i].y, 1.5, 0, Math.PI * 2, false);  
	      ctx_2.fillStyle = "orange";
	    }
		
		if (cars[x].afk == 1) {
		  ctx_2.fillStyle = "white";
		}
		
		ctx_2.shadowBlur = 5;
		ctx_2.shadowOffsetX = 0;
		ctx_2.shadowOffsetY = 0;
		ctx_2.shadowColor = "yellow";
	    ctx_2.fill();
	    ctx_2.closePath();
	  }
	  
	  if (cars[x].bullets.includes(cars[x].bullets[i]) == true && cars[x].bullets[i].byWho != nickname && cars[x].afk == 0 && localCar.afk == 0) {
		let bullet_hitbox = {x: cars[x].bullets[i].x, y: cars[x].bullets[i].y, width: 6, height: 6}

		if (bullet_hitbox.x < localCar_hitbox.x + localCar_hitbox.width &&
		  bullet_hitbox.x + bullet_hitbox.width > localCar_hitbox.x &&
		  bullet_hitbox.y < localCar_hitbox.y + localCar_hitbox.height &&
		  bullet_hitbox.y + bullet_hitbox.height > localCar_hitbox.y) {
			   
		  localCar.hitId.push(cars[x].bullets[i].id);
		  setTimeout(() => localCar.hitId.splice(0, 1), 150);
	  	  
		  if (localCar.health > 0) {
			for (let f in weapons) {
			  if (cars[x].bullets[i].weapon == weapons[f][0] && cars[x].bullets[i].weapon != "Mines") {
		        localCar.health -= weapons[f][4]; 
			  }
			  if (cars[x].bullets[i].weapon == "Mines" && hitByMine == false) {
		        localCar.health -= weapons[6][4]; 
				hitByMine = true;
				setTimeout(() => hitByMine = false, 150);
			  }
			}
	      }
		  if (localCar.health <= 0 && localCar.killedBy.length == 0){
		    localCar.killedBy.push(cars[x].bullets[i].byWho);
		  }
		  
		  if (cars[x].bullets[i].weapon == "Mines") {					
			let mine_explode = document.createElement("DIV");
			mine_explode.setAttribute("class", "explosion");
			mine_explode.setAttribute("style", `left: ${localCar.x-52}px; top: ${localCar.y-52}px; transform:scale(0.5);`);
			scene.appendChild(mine_explode);
			setTimeout(() => scene.removeChild(mine_explode), 600);
			
			gunExplode.currentTime = 0;	
	  		gunExplode.play();
		  }
		  else {
		    gunHit.currentTime = 0;
		    gunHit.play();
		  }		  
		}
	  } 
	  
	  if (cars.length > 1 && localCar.bullets[i] && localCar.afk == 0) {
		let bullet_hitbox2 = {x: localCar.bullets[i].x, y: localCar.bullets[i].y, width: 5, height: 5}
		 
	    for (let z = 1; z < cars.length; z++) {
	      cars_hitbox_hit = {x: cars[z].x, y: cars[z].y, width: 10, height: 10}
  
	      if (bullet_hitbox2.x < cars_hitbox_hit.x + cars_hitbox_hit.width &&
		    bullet_hitbox2.x + bullet_hitbox2.width > cars_hitbox_hit.x &&
	        bullet_hitbox2.y < cars_hitbox_hit.y + cars_hitbox_hit.height &&
		    bullet_hitbox2.y + bullet_hitbox2.height > cars_hitbox_hit.y) {
	  
		    if (localCar.bullets[i].weapon == "Mines" && carHitByMine == false) {
		  	  max_mines++;
			  carHitByMine = true;
					
			  let mine_explode = document.createElement("DIV");
			  mine_explode.setAttribute("class", "explosion");
			  mine_explode.setAttribute("style", `left: ${localCar.bullets[i].x-52}px; top: ${localCar.bullets[i].y-52}px; transform:scale(0.5);`);
			  scene.appendChild(mine_explode);
			  setTimeout(() => scene.removeChild(mine_explode), 600);
			  setTimeout(() => carHitByMine = false, 150);
			  
			  gunExplode.currentTime = 0;	
	  		  gunExplode.play();
			
			  if (weapons[current_weapon][0] == "Mines") {
			    ammo.innerHTML = `<img src="guns/gun${current_weapon+1}.png"> ${weapons[current_weapon][0]} ${max_mines} <img src="guns/ammo.png">`;
			    if (max_mines == 1) {
			      reload_weapon = true;
				  setTimeout(() => reload_weapon = false, 1000);				  
			    }
			  }
		    }
			
			for (let y in cars[z].hitId) {
			  if (cars[z].hitId[y] == localCar.bullets[i].id) {
		        localCar.bullets.splice(i, 1);
				gunHit.currentTime = 0;
		   	    gunHit.play();
			  }
			}		    
		  }
	    }	  
      }	    
	}
  }
     
  if (localCar.health > 66) {
    health.setAttribute("style", `width: ${localCar.health/10}vw; background-color:green;`) 
  }
  if (localCar.health < 66 && localCar.health > 33) {
    health.setAttribute("style", `width: ${localCar.health/10}vw; background-color:orange;`) 
  }
  if (localCar.health < 33 && localCar.health >= 0) {
    health.setAttribute("style", `width: ${localCar.health/10}vw; background-color:red;`) 
  }
  
  players.innerHTML = "";

  if (cars.length > 1) {
    for (let h = 1; h < cars.length; h++) {
	  if (cars[h].afk == 0) {
		if (cars[h].health <= 100 && cars[h].health > 66 && document.getElementsByClassName("car")[h-1].style.backgroundImage != "url(cars/car_burnt.png)") {
	      players.innerHTML += `<div style="border-radius: 0.2vw; padding: 0.3vw 0.1vw; margin: 0.3vw; min-width: 10vw; height: auto; background: black; opacity: 0.8;"> <img style="width: 0.5vw; height: 1vw;" src="cars/car${cars[h].carImg}.png"> ${cars[h].nickname} <br />Score: ${cars[h].score} <br /><div style="float: right; width: ${cars[h].health/10}vw; height: 0.3vw; background: green;"></div></div>`;
		  document.getElementsByClassName("car")[h-1].style.backgroundImage = `url(cars/car${cars[h].carImg}.png)`; 
		}
		if (cars[h].health <= 66 && cars[h].health > 33 && document.getElementsByClassName("car")[h-1].style.backgroundImage != "url(cars/car_burnt.png)") {
	      players.innerHTML += `<div style="border-radius: 0.2vw; padding: 0.3vw 0.1vw; margin: 0.3vw; min-width: 10vw; height: auto; background: black; opacity: 0.8;"> <img style="width: 0.5vw; height: 1vw;" src="cars/car${cars[h].carImg}.png"> ${cars[h].nickname} <br />Score: ${cars[h].score} <br /><div style="float: right; width: ${cars[h].health/10}vw; height: 0.3vw; background: orange;"></div></div>`;
		  document.getElementsByClassName("car")[h-1].style.backgroundImage = `url(cars/car${cars[h].carImg}.png)`; 
		}
		if (cars[h].health <= 33 && cars[h].health > 0 && document.getElementsByClassName("car")[h-1].style.backgroundImage != "url(cars/car_burnt.png)") {
	      players.innerHTML += `<div style="border-radius: 0.2vw; padding: 0.3vw 0.1vw; margin: 0.3vw; min-width: 10vw; height: auto; background: black; opacity: 0.8;"> <img style="width: 0.5vw; height: 1vw;" src="cars/car${cars[h].carImg}.png"> ${cars[h].nickname} <br />Score: ${cars[h].score} <br /><div style="float: right; width: ${cars[h].health/10}vw; height: 0.3vw; background: red;"></div></div>`;
		  document.getElementsByClassName("car")[h-1].style.backgroundImage = `url(cars/car${cars[h].carImg}.png)`; 
		}
		if (cars[h].health <= 0 || cars[h].health > 100) {
		  players.innerHTML += `<div style="border-radius: 0.2vw; padding: 0.3vw 0.1vw; margin: 0.3vw; min-width: 10vw; height: auto; background: black; opacity: 0.8;"> <img style="width: 0.5vw; height: 1vw;" src="cars/dead.png"> ${cars[h].nickname} <br />Score: ${cars[h].score} <br /> <div style="float: right; width: ${cars[h].health/10}vw; height: 0.3vw; background: green;"></div></div>`;	
          document.getElementsByClassName("car")[h-1].style.backgroundImage = "url(cars/car_burnt.png)";	
	    }
	  }
	  else if (cars[h].afk == 1) {
		if (cars[h].health <= 100 && cars[h].health > 66 && document.getElementsByClassName("car")[h-1].style.backgroundImage != "url(cars/car_burnt.png)") {
	      players.innerHTML += `<div style="border-radius: 0.2vw; padding: 0.3vw 0.1vw; margin: 0.3vw; min-width: 10vw; height: auto; background: black; opacity: 0.8;"> <img style="width: 0.5vw; height: 1vw;" src="cars/car${cars[h].carImg}.png"> ${cars[h].nickname} [afk] <br />Score: ${cars[h].score} <br /><div style="float: right; width: ${cars[h].health/10}vw; height: 0.3vw; background: green;"></div></div>`;
		  document.getElementsByClassName("car")[h-1].style.backgroundImage = `url(cars/car${cars[h].carImg}.png)`; 
		}
		if (cars[h].health <= 66 && cars[h].health > 33 && document.getElementsByClassName("car")[h-1].style.backgroundImage != "url(cars/car_burnt.png)") {
	      players.innerHTML += `<div style="border-radius: 0.2vw; padding: 0.3vw 0.1vw; margin: 0.3vw; min-width: 10vw; height: auto; background: black; opacity: 0.8;"> <img style="width: 0.5vw; height: 1vw;" src="cars/car${cars[h].carImg}.png"> ${cars[h].nickname} [afk] <br />Score: ${cars[h].score} <br /><div style="float: right; width: ${cars[h].health/10}vw; height: 0.3vw; background: orange;"></div></div>`;
		  document.getElementsByClassName("car")[h-1].style.backgroundImage = `url(cars/car${cars[h].carImg}.png)`; 
		}
		if (cars[h].health <= 33 && cars[h].health > 0 && document.getElementsByClassName("car")[h-1].style.backgroundImage != "url(cars/car_burnt.png)") {
	      players.innerHTML += `<div style="border-radius: 0.2vw; padding: 0.3vw 0.1vw; margin: 0.3vw; min-width: 10vw; height: auto; background: black; opacity: 0.8;"> <img style="width: 0.5vw; height: 1vw;" src="cars/car${cars[h].carImg}.png"> ${cars[h].nickname} [afk] <br />Score: ${cars[h].score} <br /><div style="float: right; width: ${cars[h].health/10}vw; height: 0.3vw; background: red;"></div></div>`;
		  document.getElementsByClassName("car")[h-1].style.backgroundImage = `url(cars/car${cars[h].carImg}.png)`; 
		}
		if (cars[h].health <= 0 || cars[h].health > 100) {
		  players.innerHTML += `<div style="border-radius: 0.2vw; padding: 0.3vw 0.1vw; margin: 0.3vw; min-width: 10vw; height: auto; background: black; opacity: 0.8;"> <img style="width: 0.5vw; height: 1vw;" src="cars/dead.png"> ${cars[h].nickname} [afk] <br />Score: ${cars[h].score} <br /> <div style="float: right; width: ${cars[h].health/10}vw; height: 0.3vw; background: green;"></div></div>`;	
          document.getElementsByClassName("car")[h-1].style.backgroundImage = "url(cars/car_burnt.png)";	
	    }
	  }
    }
  }
  
  if (localCar.x < 0 || localCar.y < 0 || localCar.x > 4000 || localCar.y > 4000) {
    localCar.health -= 10;
  }
  
  if (localCar.x < 10) {
	for (let b = 1; b < 6; b++) {
	  setTimeout(() => localCar.xVelocity += 0.04, 15);
	}
  }
  if (localCar.x > 3990) {
	for (let b = 1; b < 6; b++) {
	  setTimeout(() => localCar.xVelocity -= 0.04, 15);
	}
  }
  if (localCar.y < 10) {
	for (let b = 1; b < 6; b++) {
	  setTimeout(() => localCar.yVelocity -= 0.04, 15);
	}
  }
  if (localCar.y > 3990) {
	for (let b = 1; b < 6; b++) {
	  setTimeout(() => localCar.yVelocity += 0.04, 15);
	}
  }
  
  let browserZoomLevel = Math.round(window.devicePixelRatio * 100);
  
  if (browserZoomLevel < 75) {
	window.scrollTo(localCar.x - screen.width, localCar.y - screen.height); 
  }
  if ((localCar.x > screen.width / 1.5 || localCar.y > screen.height / 1.5) && browserZoomLevel >= 75) {
	window.scrollTo(localCar.x - screen.width / 1.5, localCar.y - screen.height / 1.5); 
  }
  if ((localCar.x > screen.width / 2 || localCar.y > screen.height / 2) && (browserZoomLevel >= 100 && browserZoomLevel < 125)) {
	window.scrollTo(localCar.x - screen.width / 2, localCar.y - screen.height / 2); 
  }
  if ((localCar.x > screen.width / 2.5 || localCar.y > screen.height / 2.5) && (browserZoomLevel >= 125 && browserZoomLevel < 150)) {
	window.scrollTo(localCar.x - screen.width / 2.5, localCar.y - screen.height / 2.5); 
  }
  if ((localCar.x > screen.width / 3 || localCar.y > screen.height / 3 ) && (browserZoomLevel >= 150 && browserZoomLevel < 175)) {
	window.scrollTo(localCar.x - screen.width / 3, localCar.y - screen.height / 3); 
  }
  if ((localCar.x > screen.width / 3.5 || localCar.y > screen.height / 3.5 ) && (browserZoomLevel >= 175 && browserZoomLevel < 200)) {
	window.scrollTo(localCar.x - screen.width / 3.5, localCar.y - screen.height / 3.5); 
  }
  if ((localCar.x > screen.width / 4 || localCar.y > screen.height / 4 ) && browserZoomLevel >= 200) {
	window.scrollTo(localCar.x - screen.width / 4, localCar.y - screen.height / 4); 
  }

  const canTurn = localCar.power > 0.0025 || localCar.reverse;

  if (touching.active) {
    const throttle = Math.round(touching.up * 10) / 10;
    const reverse = Math.round(touching.down * 10) / 10;

    if (localCar.isThrottling !== throttle || localCar.isReversing !== reverse) {     
      localCar.isThrottling = throttle;
      localCar.isReversing = reverse;
    }
    const turnLeft = canTurn && Math.round(touching.left * 10) / 10;
    const turnRight = canTurn && Math.round(touching.right * 10) / 10;

    if (localCar.isTurningLeft !== turnLeft) {      
      localCar.isTurningLeft = turnLeft;
    }
    if (localCar.isTurningRight !== turnRight) {     
      localCar.isTurningRight = turnRight;
    }
  } else {
    const pressingUp = keyActive('up');
    const pressingDown = keyActive('down');

    if (localCar.isThrottling !== pressingUp || localCar.isReversing !== pressingDown) {     
      localCar.isThrottling = pressingUp;
      localCar.isReversing = pressingDown;
    }

    const turnLeft = canTurn && keyActive('left');
    const turnRight = canTurn && keyActive('right');

    if (localCar.isTurningLeft !== turnLeft) {      
      localCar.isTurningLeft = turnLeft;
    }
    if (localCar.isTurningRight !== turnRight) {      
      localCar.isTurningRight = turnRight;
    }
  }

  const ms = Date.now();
  if (lastTime) {
    acc += (ms - lastTime) / 1000;

    while (acc > step) {
      update();

      acc -= step;
    }
  }

  lastTime = ms;

//  sendParams(localCar);
}, 1000 / 60);

function changeCar (user) {
  localCar.carImg++;
  if (localCar.carImg > 13) {
   localCar.carImg = 1;
  }
  user.style.backgroundImage = `url(cars/car${localCar.carImg}.png)`;
}

function renderCar (car) {
  const { x, y, angle, power, reverse, angularVelocity } = car;

  car.el.style.transform = `translate(${x}px, ${y}px) rotate(${angle * 180 / Math.PI}deg)`;

  if ((power > 0.0025) || reverse) {
    if (((maxReverse === reverse) || (maxPower === power)) && Math.abs(angularVelocity) < 0.002) {
      return;
    }
    ctx.fillRect(
      x - Math.cos(angle + 3 * Math.PI / 2) * 3 + Math.cos(angle + 2 * Math.PI / 2) * 4,
      y - Math.sin(angle + 3 * Math.PI / 2) * 3 + Math.sin(angle + 2 * Math.PI / 2) * 4,
      0.7,
      0.7
    );
    ctx.fillRect(
      x - Math.cos(angle + 3 * Math.PI / 2) * 3 + Math.cos(angle + 4 * Math.PI / 2) * 4,
      y - Math.sin(angle + 3 * Math.PI / 2) * 3 + Math.sin(angle + 4 * Math.PI / 2) * 4,
      0.7,
      0.7
    );
  }
}

function render (ms) {
  requestAnimationFrame(render);
  cars.forEach(renderCar);
}

requestAnimationFrame(render);

settings.onclick = function() {showMenu()};

function showMenu() {
  menu.classList.toggle("show");
}

const disconnect = document.getElementsByTagName('button')[1];

disconnect.onclick = () => {
  timedOut();
};

const clearScreen = document.getElementsByTagName('button')[2];

clearScreen.onclick = () => {
  ctx.clearRect(0, 0, 4000, 4000);
};

function weapon_propeties() {
  if (weapons[current_weapon][0] == "Mines") {
	if (max_mines == 0) {
      ammo.innerHTML = `<img src="guns/gun${current_weapon+1}.png"> ${weapons[current_weapon][0]}  MAX`;
	}
	else {
	  ammo.innerHTML = `<img src="guns/gun${current_weapon+1}.png"> ${weapons[current_weapon][0]} ${max_mines} <img src="guns/ammo.png">`;
	} 
  }
  else {
	ammo.innerHTML = `<img src="guns/gun${current_weapon+1}.png"> ${weapons[current_weapon][0]} ${current_ammo[current_weapon]} <img src="guns/ammo.png">`;
  }
}
weapon_propeties();

if (document.images) {
  img1 = new Image();
  img2 = new Image();
  img3 = new Image();
  img4 = new Image();
  img5 = new Image();
  img6 = new Image();
  img7 = new Image();
  img8 = new Image();
  img9 = new Image();
  img10 = new Image();
  img11 = new Image();
  img12 = new Image();
  img13 = new Image();
  img14 = new Image();
  img15 = new Image();
  img16 = new Image();
   
  img1.src = "guns/explosion/exp1.png";
  img2.src = "guns/explosion/exp2.png";
  img3.src = "guns/explosion/exp3.png";
  img4.src = "guns/explosion/exp4.png";
  img5.src = "guns/explosion/exp5.png";
  img6.src = "guns/explosion/exp6.png";
  img7.src = "guns/explosion/exp7.png";
  img8.src = "guns/explosion/exp8.png";
  img9.src = "guns/explosion/exp9.png";
  img10.src = "guns/explosion/exp10.png";
  img11.src = "guns/explosion/exp11.png";
  img12.src = "guns/explosion/exp12.png";
  img13.src = "guns/explosion/exp13.png";
  img14.src = "guns/explosion/exp14.png";
  img15.src = "guns/explosion/exp15.png";
  img16.src = "guns/explosion/crater.png";
}

/*
socket.on('connect', () => {
  sendParams(localCar);
});

socket.on('join', () => {
  sendParams(localCar);
});

socket.on('params', ({ id, params }) => {
  let car = carsById[id];

  if (!car) {
    const el = document.createElement('div');
	
    el.classList.add('car');
    scene.insertBefore(el, localCar.el);
    car = {
      el
    };
    carsById[id] = car;
    cars.push(car);
	carsTimeout.push(0);
  }
  
  if (params.ghost) {
    car.el.classList.add('ghost');
  }

  for (const key in params) {
    if (key !== 'el') {
      car[key] = params[key];
    }
  }
});

socket.on('leave', (id) => {
  const car = carsById[id];

  if (!car) {
    return console.error('Car not found');
  }

  for (let i = 0; i < cars.length; i++) {
    if (cars[i] === car) {	
      cars.splice(i, 1);  
	  carsTimeout.splice(i, 1);
      break;
    }
  }

  if (car.el.parentNode) {
    car.el.parentNode.removeChild(car.el);
  }
  delete carsById[id];
});

function sendParams (car) {
  const {
    x,
    y,
    xVelocity,
    yVelocity,
    power,
    reverse,
    angle,
    angularVelocity,
    isThrottling,
    isReversing,
    isTurningLeft,
    isTurningRight,
	health,
	nickname,
	carImg,
	afk,
	message,
	killedBy,
	score,
	bullets,
	hitId
  } = car;

  socket.emit('params', {
    x,
    y,
    xVelocity,
    yVelocity,
    power,
    reverse,
    angle,
    angularVelocity,
    isThrottling,
    isReversing,
    isTurningLeft,
    isTurningRight,
	health,
	nickname,
	carImg,
	afk,
	message,
	killedBy,
	score,
	bullets,
	hitId
  });
}
*/
