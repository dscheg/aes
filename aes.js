// SPDX-License-Identifier: BSD-3-Clause
// SPDX-FileCopyrightText: (C) 2024 Dmitriy Titarenko https://github.com/dscheg

const $iv = $("#iv");
const $key = $("#key");
const $dir = $("#dir");
const $mode = $("#mode");
const $modeimg = $("#mode-img");
const $padding = $("#padding");
const $keysize = $("#keysize");
const $blocksize = $("#blocksize");
const $compress = $("#compress");

const $plain = $(".xed.plain");
const $deflate = $(".xed.deflate");
const $cipher = $(".xed.cipher");
const $decrypt = $(".xed.decrypt");
const $xor = $(".xed.xor");

const $result = $("#result");

$("#theme").onclick = () => $("html").classList.toggle("night");

const update = () => $plain.dispatchEvent(new Event("change"));
const setResult = (isOk, text) => {
	$result.classList[isOk ? 'add' : 'remove']('success');
	$result.classList[isOk ? 'remove' : 'add']('error');
	$result.value = text;
};

$dir.value = localStorage.getItem("dir") || $dir[0].value;
$dir.oninput = e => {
	localStorage.setItem("dir", $dir.value);
	$modeimg.className = `mode-${$mode.value}-${$dir.value}`;
}

$mode.value = localStorage.getItem("mode") || $mode[0].value;
$mode.oninput = e => {
	localStorage.setItem("mode", $mode.value);
	$modeimg.className = `mode-${$mode.value}-${$dir.value}`;
	update();
}
$mode.oninput();

$padding.value = localStorage.getItem("padding") || $padding[0].value;
$padding.oninput = e => {
	localStorage.setItem("padding", padding.value);
	update();
}

$iv.value = localStorage.getItem("iv") || toHex(window.crypto.getRandomValues(new Uint8Array(16)));
$iv.oninput = e => {
	if(!/^[0-9A-F]{32}$/i.test($iv.value)) {
		setResult(false, "IV must be hex encoded and its size must be 128 bit");
		$blocksize.value = "Invalid";
		return;
	}
	localStorage.setItem("iv", $iv.value);
	update();
}
$iv.oninput();

$key.value = localStorage.getItem("key") || toHex(window.crypto.getRandomValues(new Uint8Array(16)));
$key.oninput = e => {
	if(!/^[0-9A-F]{32}(?:[0-9A-F]{16})?(?:[0-9A-F]{16})?$/i.test($key.value)) {
		setResult(false, "Key must be hex encoded and its size must be 128, 192 or 256 bit");
		$keysize.value = "Invalid";
		return;
	}
	localStorage.setItem("key", $key.value);
	$keysize.value = $key.value.length * 4 + " bit";
	update();
};
$key.oninput();

$compress.value = localStorage.getItem("compression") || "";
$compress.oninput = e => {
	localStorage.setItem("compression", $compress.value);
	const hide = $compress.value.length === 0;
	$deflate.previousElementSibling.hidden = hide;
	$deflate.hidden = hide;
	update();
};

//const importKey = () => crypto.subtle.importKey("raw", fromHex($key.value), {name: "AES-CBC"}, true, ["encrypt", "decrypt"]);

const getCryptoParams = () => Object({
	iv: CryptoJS.enc.Hex.parse($iv.value),
	mode: CryptoJS.mode[$mode.value],
	padding: CryptoJS.pad[$padding.value]
});

const compress = (data, mode) => stream = mode != 0 && $compress.value != ""
	? new Response(new Blob([data]).stream().pipeThrough(mode > 0 ? new CompressionStream($compress.value) : new DecompressionStream($compress.value)))
		.arrayBuffer().then(buf => new Uint8Array(buf))
	: new Promise((resolve, _) => resolve(data));

$plain.addEventListener("change", e => {
	const plain = $plain.getData();
	compress(plain, 1).then(data => {
		$deflate.setData(data);
		localStorage.setItem("hex", toHex(plain));
	}).catch(e => setResult(false, e));
});

$deflate.addEventListener("change", e => {
	const compressed = $deflate.getDataHex();
	const enc = CryptoJS.AES.encrypt(
		CryptoJS.enc.Hex.parse(compressed),
		CryptoJS.enc.Hex.parse($key.value),
		getCryptoParams());
	$cipher.setDataHex(enc.ciphertext.toString(CryptoJS.enc.Hex));

	/*importKey().then(key => crypto.subtle.encrypt({name: "AES-" + $mode.value, iv: fromHex($iv.value)}, key, $plain.getData()).then(cipher => {
		$cipher.setData(new Uint8Array(cipher));
	}));*/
}, false);

$cipher.addEventListener("change", e => {
	try {
		const cipher = $cipher.getDataHex();
		const decrypt = CryptoJS.AES.decrypt(
			CryptoJS.lib.CipherParams.create({ciphertext: CryptoJS.enc.Hex.parse(cipher)}),
			CryptoJS.enc.Hex.parse($key.value),
			getCryptoParams());

		const hex = decrypt.toString(CryptoJS.enc.Hex);
		if($plain.getDataHex().length > 0 && hex.length === 0) {
			$decrypt.classList.add('grayed');
			throw new Error("Decryption failed");
		}

		compress(fromHex(hex), -1).then(data => {
			$decrypt.setData(data);
			$decrypt.classList.remove('grayed');
			const text = new TextDecoder().decode(data);
			setResult(true, JSON.stringify(JSON.parse(text.replace(/[\x00-\x1f]/ig, '\uFFFD')), null, 4));
		}).catch(e => setResult(false, e));
	} catch(e) {
		setResult(false, e);
	}

	/*importKey().then(key => crypto.subtle.decrypt({name: "AES-" + $mode.value, iv: fromHex($iv.value)}, key, $cipher.getData()).then(decrypt => {
		$decrypt.setData(new Uint8Array(decrypt));
		setResult(true, JSON.stringify(JSON.parse(new TextDecoder().decode(decrypt)), null, 4));
	})).catch(e => setResult(false, e));*/
}, false);

$xor.addEventListener("change", e => {
	const data = $xor.getData();
	if((data.length & 15) !== 0) {
		setResult(false, "Size must be multiple to AES block size");
		return;
	}

	let result = new Uint8Array(16);
	for(var row = 0; row < (data.length >> 4); row++)
	for(var col = 0; col < 16; col++) {
		result[col] ^= data[(row << 4) + col];
	}

	setResult(true, toHex(result).replace(/([0-9A-F]{2})/ig, '$1 '));
}, false);

$plain.setDataHex(localStorage.getItem("hex") || toHex(new TextEncoder().encode('{"name":"hack"}')));
