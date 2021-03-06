const inputBox = document.getElementById("inputBox");
const buttonGenerate = document.getElementById("buttonGenerate");
const statusElement = document.getElementById("statusText");

const imageRenderer = document.getElementById('imageRenderer');
const imageRendererContext = imageRenderer.getContext('2d');
imageRendererContext.imageSmoothingEnabled = false;

const radioTetreml = document.getElementById("radioTetreml");

const sprite = new Image();
sprite.src = "Textures/Sprite singleplayer.png";

const gifBackground = new Image();
gifBackground.src = "Textures/GIF background.png";

class ImageRendererTetreml {
	initializeFrame() {
		imageRendererContext.drawImage(gifBackground, 0, 0);
	}

	drawMino(x, y, color, alpha, hasTop) {
		imageRendererContext.globalAlpha = alpha;
		imageRendererContext.drawImage(sprite, 0, 16 * color, 16, 16, x * 16, 336 - 16 * y, 16, 16);
		imageRendererContext.globalAlpha = 1;
	}
}

class ImageRendererSolid {
	constructor() {
		this.colors = ["#686868", "#41AFDE", "#1983BF", "#EF9535", "#F7D33E", "#66C65C", "#B451AC", "#EF624D"];
		this.topColors = ["#949494", "#43D3FF", "#1BA6F9", "#FFBF60", "#FFF952", "#88EE86", "#E56ADD", "#FF9484"];
	}

	initializeFrame() {
		imageRendererContext.fillStyle = "#2B2D37";
		imageRendererContext.fillRect(0, 0, 160, 352);
	}

	drawMino(x, y, color, alpha, hasTop) {
		imageRendererContext.fillStyle = "#2B2D37";
		imageRendererContext.fillRect(x * 16, 336 - 16 * y, 16, 16);
		imageRendererContext.globalAlpha = alpha;
		imageRendererContext.fillStyle = this.colors[color];
		imageRendererContext.fillRect(x * 16, 336 - 16 * y, 16, 16);
		if (!hasTop) {
			imageRendererContext.fillStyle = this.topColors[color];
			imageRendererContext.fillRect(x * 16, 333 - 16 * y, 16, 3);
		}
		imageRendererContext.globalAlpha = 1;
	}
}

const minoMapping = {
	"X": 0,
	"I": 1,
	"J": 2,
	"L": 3,
	"O": 4,
	"S": 5,
	"T": 6,
	"Z": 7
};

async function generate() {
	buttonGenerate.disabled = true;
	statusElement.innerText = "Generating...";
	let fumenPages;
	try {
		fumenPages = tetrisFumen.decoder.decode(inputBox.value);
	} catch (error) {
		statusElement.innerText = "Could not parse Fumen string. " + error.message;
		buttonGenerate.disabled = false;
		return;
	}
	let renderer = new (radioTetreml.checked ? ImageRendererTetreml : ImageRendererSolid)();
	let gif = new GIF({
		repeat: 0,
		workers: 2,
		quality: 1,
		background: "#000",
	});
	for (let page of fumenPages) {
		let minos = [];
		let field = page.field;
		imageRendererContext.clearRect(0, 0, 160, 352);
		imageRendererContext.globalAlpha = 1;
		renderer.initializeFrame(imageRendererContext);
		for (let y = 0; y < 22; y++) {
			let count = 0;
			for (let x = 0; x < 10; x++) {
				let mino = field.at(x, y);
				if (mino != "_") {
					renderer.drawMino(x, y, minoMapping[mino], 0.8, false);
					count++;
				}
			}
			minos.push(count);
		}
		let renderLineClear = false;
		if (page.operation != undefined) {
			renderLineClear = true;
			let tetrimino = page.mino();
			let color = minoMapping[tetrimino.type];
			for (let position of tetrimino.positions()) {
				let { x, y } = position;
				if (field.at(x, y) != "_") renderLineClear = false;
				renderer.drawMino(x, y, color, 1, y == 21 || field.at(x, y + 1) != "_");
				minos[y]++;
			}
		}
		if (renderLineClear && page.flags.lock) {
			imageRendererContext.fillStyle = "#FFF";
			imageRendererContext.globalAlpha = 0.2;
			for (let y = 0; y < 22; y++)
				if (minos[y] > 9) imageRendererContext.fillRect(0, 336 - 16 * y, 160, 16);
		}
		gif.addFrame(imageRenderer, {copy: true});
	}

	gif.on("progress", (progress) => {
		statusText.innerText = `Generating... ${progress.completed} / ${progress.total} (${formatNumber(progress.completed / progress.total * 100, 2)}%)`;
	});

	gif.on("finished", (blob) => {
		let date = new Date();
		let filename = `Fumen – ${date.getHours()}h${date.getMinutes() < 10 ? "0" : ""}${date.getMinutes()}.${date.getSeconds() < 10 ? "0" : ""}${date.getSeconds()} ${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}.gif`;
		if (window.navigator.msSaveOrOpenBlob) {
			window.navigator.msSaveBlob(blob, filename);
		} else {
			var elem = window.document.createElement('a');
			elem.href = window.URL.createObjectURL(blob);
			elem.download = filename;
			document.body.appendChild(elem);
			elem.click();
			document.body.removeChild(elem);
		}
		buttonGenerate.disabled = false;
		statusElement.innerText = "GIF generated.";
	});

	gif.render();
}

buttonGenerate.onclick = generate;