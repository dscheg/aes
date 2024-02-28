// SPDX-License-Identifier: BSD-3-Clause
// SPDX-FileCopyrightText: (C) 2024 Dmitriy Titarenko https://github.com/dscheg
// Original idea by xem https://xem.github.io/hex/ attributed as Public Domain https://github.com/xem/hex/blob/8ed43894c1591866da693369e967acb34e20636e/LICENSE.md

const range = (len) => Array(len).fill().map((_, i) => i);

const $ = (selector, element) => (element || document).querySelector(selector);
const $$ = (selector, element) => (element || document).querySelectorAll(selector);

const toHex = data => Array.from(data).map(x => x.toString(16).padStart(2, '0')).join('');
const fromHex = hex => new Uint8Array(Array.from(hex.matchAll(/[0-9A-F]{2}/ig)).map(i => parseInt(i, 16)));

$$(".xed").forEach($xed => {
	const $hex = $(".xed-hex", $xed);
	$hex.value = '';

	$xed.getData = () => fromHex($hex.value);
	$xed.getDataHex = () => $hex.value.replace(/[^0-9A-F]/ig, '');
	$xed.setData = data => $xed.setDataHex(toHex(data));
	$xed.setDataHex = data => {
		$hex.value = data;
		$hex.oninput();
	};

	$(".xed-top", $xed).textContent = range(16).map(i => (0 + i.toString(16)).slice(-2)).join(' ');

	$(".xed-load-file", $xed).onchange = function() {
		if(this.files.length === 0)
			return;
		let file = new FileReader();
		file.readAsArrayBuffer(this.files[0]);
		file.onload = () => {
			$xed.setData(new Uint8Array(file.result));
			this.value = null;
		}
	};

	$(".xed-load", $xed).onclick = function() {
		this.parentNode.querySelector(".xed-load-file").click();
	};

	$(".xed-save", $xed).onclick = function() {
		const $a = document.createElement("a");
		$a.href = URL.createObjectURL(new Blob([new Uint8Array($xed.getData())], {type: "application/octet-stream"}));
		$a.download = "file.bin";
		$a.click();
	};

	const $size = $(".xed-size", $xed);
	const $left = $(".xed-left", $xed);
	const $right = $(".xed-right", $xed);
	$right.value = '';

	$right.oninput = function() {
		const pos = $right.value
			.substr(0, $right.selectionStart)
			.replace(/[^\x20-\x7F\uF000-\uF0FF]/g, '')
			.replace(/(.{16})(?=.)/g, '$1\n')
			.length;

		const val = $right.value.replace(/[^\x20-\x7F\uF000-\uF0FF]/g, '');
		$xed.setData(range(val.length).map(i => val.codePointAt(i)).map(i => i > 0xF000 ? i - 0xF000 : i));

		$right.setSelectionRange(pos, pos);
	};

	$hex.oninput = function() {
		const pos = $hex.value
			.substr(0, $hex.selectionStart)
			.replace(/[^0-9A-F]/ig, '')
			.replace(/(..)/g, '$1 ')
			.length;

		$hex.value = $hex.value
			.replace(/[^0-9A-F]/ig, '')
			.replace(/(.{32})(?=.)/g, '$1\n')
			.replace(/([0-9A-F]{2})(?=[0-9A-F])/ig, '$1 ')
			.toLowerCase();

		const rows = Math.floor($hex.value.length / 48);

		const height = (1 + rows) + "em";
		$hex.style.height = $left.style.height = $right.style.height = height;

		$left.value = range(rows + 1)
			.map(i => (1E7 + (16 * i).toString(16)).slice(-8))
			.join('\n');

		const len = Math.floor(($hex.value.length + 1) / 3);
		$right.value = range(len)
			.map(i => parseInt($hex.value.substr(i * 3, 2), 16))
			.map(c => String.fromCodePoint(c + (0x20 <= c && c < 0x7F ? 0 : 0xF000)))
			.join('').replace(/(.{16})(?=.)/g, '$1\n');

		$size.textContent = 'len=' + len;

		const newpos = pos > 0 && [' ', '\n'].includes($hex.value[pos - 1]) ? pos - 1 : pos;
		$hex.setSelectionRange(newpos, newpos);

		$xed.dispatchEvent(new Event("change"));
	};
});
