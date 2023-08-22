import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {CARDS, waterTexture, fireTexture} from './cards';
import gsap from 'gsap';


const gltfLoader = new GLTFLoader();

let hoveredCard;
const mousePosition = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let x = -2;

const opponentCards = [];
for(let i = 5; i < CARDS.length; i++) {
    opponentCards.push(CARDS[i]);
}

const playerCards = [];
for(let i = 0; i < 5; i++) {
    playerCards.push(CARDS[i]);
}

const initialCardsPositions = [];
const initialCardsRotations = [];

let playNext = true;
let round = 1;

const pScore = document.getElementById('player-score');
const oScore = document.getElementById('opponent-score');
const p1 = document.getElementById('p1');
const p2 = document.getElementById('p2');
let playerScore = 0;
let opponentScore = 0;
const loss = document.getElementById('loss');
const draw = document.getElementById('draw');
const victory = document.getElementById('victory');
const rematch = document.getElementById('rematch');
let finished = false;

const listener = new THREE.AudioListener();
const audioLoader = new THREE.AudioLoader();
let cardDrop = new THREE.Audio(listener);
let cardFlip = new THREE.Audio(listener);

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Sets the color of the background
renderer.setClearColor(0xFEFEFE);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

// Camera positioning
camera.position.set(0, 10, 6);
camera.lookAt(new THREE.Vector3(0, 6, 2));
camera.add(listener);

audioLoader.load('./assets/card_drop.mp3', function(buffer) {
    cardDrop.setBuffer(buffer);
    cardDrop.setVolume(2);
});

audioLoader.load('./assets/card_flip.mp3', function(buffer) {
    cardFlip.setBuffer(buffer);
    cardFlip.setVolume(2);
});

//switch cameraview

function switchCameraView(isTopView) {
    const targetPosition = isTopView ? new THREE.Vector3(0, 20, 0) : new THREE.Vector3(0, 10, 6);
    const targetLookAt = isTopView ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(0, 6, 2);
    const cameraDuration = 1; // Duration of the camera animation in seconds
    const cardsDuration = 0.5; // Duration of the cards fade animation in seconds

    // Animate camera position and lookAt
    gsap.to(camera.position, {
        duration: cameraDuration,
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        ease: "power2.out"
    });
    gsap.to(camera, {
        duration: cameraDuration,
        onUpdate: () => camera.lookAt(targetLookAt),
        onComplete: () => {
            // Show/hide cards based on view
            for (const card of CARDS) {
                card.visible = !isTopView;
            }
        }
    });

    // Animate cards fade in/out
    const targetOpacity = isTopView ? 0 : 1;
    gsap.to(CARDS, {
        duration: cardsDuration,
        opacity: targetOpacity,
        delay: cameraDuration / 2, // Start the cards animation halfway through the camera animation
        ease: "power2.out"
    });
}


const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
directionalLight.position.y = 10;
scene.add(directionalLight);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;

const ambientLight = new THREE.AmbientLight(0xA3A3A3, 0.3);
scene.add(ambientLight);

gltfLoader.load('./assets/kitchen_table.glb', function(glb) {
    const model = glb.scene;
    scene.add(model);
    model.rotateY(Math.PI / 2);
    model.scale.set(0.35, 0.35, 0.35);
    model.position.set(0.25, 0, 0);

    model.traverse(function(node) {
        if(node.isMesh)
            node.receiveShadow = true;
    });
     // Add a ground plane
     const groundGeometry = new THREE.PlaneGeometry(45, 45); // Adjust the size as needed
     const grassTexture = new THREE.TextureLoader().load('./assets/battle ground.jpg'); // Load the grass texture
     grassTexture.wrapS = THREE.RepeatWrapping;
     grassTexture.wrapT = THREE.RepeatWrapping;
     //grassTexture.repeat.set(4, 4); // Adjust the repeat values to control tiling
 
     const groundMaterial = new THREE.MeshBasicMaterial({ map: grassTexture });
     const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
     groundPlane.rotation.x = -Math.PI / 2; // Rotate the plane to be horizontal
     groundPlane.position.y = 0.1; // Adjust the position to be just below the table
     scene.add(groundPlane);
});

// Sets a 12 by 12 gird helper
const gridHelper = new THREE.GridHelper(12, 12);
scene.add(gridHelper);

CARDS.forEach(function(card) {
    scene.add(card);
    const v = new THREE.Vector3();
    v.copy(card.position);
    initialCardsPositions.push(v);
    initialCardsRotations.push(card.rotation.z);
});

function nextRound() {
    if(CARDS[0].name === 'hand playerCard1 Water') {
        CARDS[0].material[4].map = fireTexture;
        CARDS[0].name = 'hand playerCard1 Fire';
        CARDS[5].material[4].map = waterTexture;
        CARDS[5].name = 'Water';
        p1.style.background = 'linear-gradient(90deg, rgba(223, 207, 96, 0.8) 0%, rgba(255, 255, 255, 0) 100%)';
        p2.style.background = 'linear-gradient(90deg, rgba(83, 0, 0, 0.8) 0%, rgba(255, 255, 255, 0) 100%)';
    } else if(CARDS[0].name === 'hand playerCard1 Fire') {
        CARDS[0].material[4].map = waterTexture;
        CARDS[0].name = 'hand playerCard1 Water';
        CARDS[5].material[4].map = fireTexture;
        CARDS[5].name = 'Fire';
        p2.style.background = 'linear-gradient(90deg, rgba(223, 207, 96, 0.8) 0%, rgba(255, 255, 255, 0) 100%)';
        p1.style.background = 'linear-gradient(90deg, rgba(83, 0, 0, 0.8) 0%, rgba(255, 255, 255, 0) 100%)';
    }
}


function showResult() {
    if (playerScore > opponentScore) {
        victory.style.display = 'inline-block';
    } else if (playerScore < opponentScore) {
        loss.style.display = 'inline-block';
    } else if (playerScore === opponentScore) {
        draw.style.display = 'inline-block';
    }

    // Call switchCameraView with argument to switch to top view
    switchCameraView(true);

    rematch.style.display = 'inline';
}

function shuffleArray(array) {
    for(let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function resetAndUpdate(side, sideText) {
    x = -2;
    round++;

    if(side === 'player') {
        playerScore++;
        sideText.textContent = playerScore;
    } else if(side === 'opponent') {
        opponentScore++;
        sideText.textContent = opponentScore;
    }

    const arr1 = [];
    const arr2 = [];

    for(let i = 0; i < 5; i++) {
        arr1[i] = CARDS[i];
        arr2[i] = CARDS[i + 5];
    }

    shuffleArray(arr1);
    shuffleArray(arr2);

    for(let i = 0; i < 5; i++) {
        playerCards[i] = arr1[i];
        playerCards[i].position.copy(initialCardsPositions[i]);
        playerCards[i].rotation.set(-Math.PI / 2, 0, initialCardsRotations[i]);
        playerCards[i].scale.set(1, 1, 1);

        opponentCards[i] = arr2[i];
        opponentCards[i].position.copy(initialCardsPositions[i + 5]);
        opponentCards[i].rotation.set(Math.PI * 2, Math.PI, initialCardsRotations[i + 5]);
        opponentCards[i].scale.set(1, 1, 1);

        if(CARDS[i].name === 'hand playerCard1 Fire' || CARDS[i].name === 'hand playerCard1 Water')
            CARDS[i].name = CARDS[i].name;
        else
            CARDS[i].name = 'hand ' + CARDS[i].name;
    }

    if(round === 4)
        nextRound();
    else if(round === 7) {
        finished = true;
        showResult();
    }
}

window.addEventListener('click', function(e) {
    mousePosition.x = (e.clientX / this.window.innerWidth) * 2 - 1;
    mousePosition.y = -(e.clientY / this.window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mousePosition, camera);
    const intersects = raycaster.intersectObject(scene);
    if(intersects.length > 0) {
        if(intersects[0].object.name.includes('hand playerCard') && !finished) {
            hoveredCard = intersects[0].object;
            intersects[0].object.name = hoveredCard.name.replace('hand ', '');
        }
    }

    if(hoveredCard && playNext && !finished) {
        playNext = false;
        cardFlip.play();
        const tl = new gsap.timeline({
            defaults: {duration: 0.4, delay: 0.1}
        });
    
        tl.to(hoveredCard.rotation, {
            y: Math.PI,
            z: 0
        })
        .to(hoveredCard.position, {
            y: 3.18,
            z: 0.9,
            x
        }, 0)
        .to(hoveredCard.scale, {
            x: 1.5,
            y: 1.5,
            z: 1.5
        }, 0)
        .to(hoveredCard.rotation, {
            y: 0,
            delay: 1,
            onComplete: function() {
                cardDrop.play();
            }
        }, 0)
        .to(hoveredCard.position, {
            y: 3.88,
            delay: 1
        }, 0)
        .to(hoveredCard.position, {
            y: 3.18,
            duration: 0.3,
            delay: 1.2
        }, 0);
    
        let hoveredCName = hoveredCard.name;
        hoveredCard = null;
    
        const minimum = 0;
        let maximum = opponentCards.length - 1;
        let randomNumber = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
        let oppCName = opponentCards[randomNumber].name;

        const tl2 = new gsap.timeline({
            defaults: {duration: 0.4, delay: 0.4}
        });
    
        tl2.to(opponentCards[randomNumber].rotation, {
            x: 2 * Math.PI - Math.PI / 2,
            z: Math.PI
        })
        .to(opponentCards[randomNumber].position, {
            y: 3.18,
            z: -0.7,
            x
        }, 0)
        .to(opponentCards[randomNumber].scale, {
            x: 1.5,
            y: 1.5,
            z: 1.5
        }, 0)
        .to(opponentCards[randomNumber].rotation, {
            y: 0,
            delay: 1
        }, 0)
        .to(opponentCards[randomNumber].position, {
            y: 3.88,
            delay: 1
        }, 0)
        .to(opponentCards[randomNumber].position, {
            y: 3.18,
            duration: 0.3,
            delay: 1.2,
            onComplete: function() {
                playNext = true;
                if(hoveredCName.includes('Water') && oppCName.includes('Fire'))
                    resetAndUpdate('player', pScore);
                if(hoveredCName.includes('Water') && oppCName.includes('Electric'))
                    resetAndUpdate('opponent', oScore);
                if(hoveredCName.includes('Electric') && oppCName.includes('Fire'))
                    resetAndUpdate('opponent', oScore);
                if(hoveredCName.includes('Fire') && oppCName.includes('Water'))
                    resetAndUpdate('opponent', oScore);
                if(hoveredCName.includes('Fire') && oppCName.includes('Electric'))
                    resetAndUpdate('player', pScore);
                if(hoveredCName.includes('Electric') && oppCName.includes('Water'))
                    resetAndUpdate('player', pScore);
            }
        }, 0);
    
        if(x < 2)
            x++;
        opponentCards.splice(randomNumber, 1);
    }
});

rematch.addEventListener('click', function () {
    finished = false;
    round = 1;
    playerScore = 0;
    opponentScore = 0;
    oScore.textContent = opponentScore;
    pScore.textContent = playerScore;
    rematch.style.display = 'none';
    victory.style.display = 'none';
    draw.style.display = 'none';
    loss.style.display = 'none';

    // Call switchCameraView with argument to restore normal view
    switchCameraView(false);
});

function animate() {
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


