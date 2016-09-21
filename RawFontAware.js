var RAW_MODE = true; // emulate "Raw" mode with full conversion logic

var KEY_BACKSPACE =  8;
var KEY_PAGEUP    = 33;
//var KEY_PAGEDOWN  = 34;
var KEY_END       = 35;
var KEY_HOME      = 36;
var KEY_LEFT      = 37;
var KEY_UP        = 38;
var KEY_RIGHT     = 39;
var KEY_DOWN      = 40;
var KEY_DELETE    = 46;
var KEY_LETTER_F  = 70;

var LF = "\n";
var SYMBOL_LF = "\u240A";

var SPACE = " ";
var SYMBOL_SPACE = "\u2420";

var RAW_BASE = "\u0000\u0007\u0008\u0009\u000B\u000C\u001B\u00A0\u000D";
var SYM_BASE = "\u2400\u2407\u2408\u2409\u240B\u240C\u241B\u2423\u240D";

var RAW_FULL = RAW_BASE+"\u061C\u200B\u200C\u200D\u200E\u200F\u202A\u202B\u202C\u202D\u202E\u2060\u2066\u2067\u2068\u2069";
var SYM_FULL = SYM_BASE+"\uF000\uF001\uF002\uF003\uF004\uF005\uF006\uF007\uF008\uF009\uF00A\uF00B\uF00C\uF00D\uF00E\uF00F";

// note: escapeUnicode() wrapper is needed for IE only;
// on modern browsers, this wrapper can be dropped
// in favor of "u" RegExp modifier ("g" => "ug")
var reRawBase = new RegExp("["+escapeUnicode(RAW_BASE)+"]", "g");
var reSymBase = new RegExp("["+escapeUnicode(SYM_BASE)+"]", "g");

var reRawFull = new RegExp("["+escapeUnicode(RAW_FULL)+"]", "g");
var reSymFull = new RegExp("["+escapeUnicode(SYM_FULL)+"]", "g");

function escapeUnicodeSymbol(symbol) {
	return "\\u" + ("0000" + symbol.charCodeAt(0).toString(16)).substr(-4);
}

function escapeUnicode(s) {
	return s.replace(/[\u007F-\uFFFF]/g, escapeUnicodeSymbol);
}

function spaceReplacer(match) {
	return Array(match.length+1).join(SYMBOL_SPACE);
}

function leadingSpaceReplacer(match) {
	return LF + spaceReplacer(match.substring(1));
}

function trailingSpaceReplacer(match) {
	return spaceReplacer(match.substring(1)) + LF;
}

function mapSymbol(symbol, source, target) {
	var i = source.indexOf(symbol);
	return i >= 0 ? target.charAt(i) : symbol;
}

function replaceFullSymbol(match) {
	return mapSymbol(match, SYM_FULL, RAW_FULL);
}

function replaceBaseSymbol(match) {
	return mapSymbol(match, SYM_BASE, RAW_BASE);
}

function replaceFullRawChar(match) {
	return mapSymbol(match, RAW_FULL, SYM_FULL);
}

function replaceBaseRawChar(match) {
	return mapSymbol(match, RAW_BASE, SYM_BASE);
}

function sym2raw(s) {
	// LF + newlines to regular newlines
	s = s.replace(/\u240A\n/g, LF);
	// orphaned LF to newlines as well
	s = s.replace(/\u240A/g, LF);
	// space dots to regular spaces
	s = s.replace(/\u2420/g, SPACE);
	// other symbols
	s = RAW_MODE ? s.replace(reSymFull, replaceFullSymbol) :
				   s.replace(reSymBase, replaceBaseSymbol);
	return s;
}

function raw2sym(s) {
	// multiple spaces
	s = s.replace(/ {2,}/g, spaceReplacer);
	// leading line spaces
	s = s.replace(/\n /g, leadingSpaceReplacer);
	// trailing line spaces
	s = s.replace(/ \n/g, trailingSpaceReplacer);
	// single leading document space
	s = s.replace(/^ /, spaceReplacer);
	// single trailing document space
	s = s.replace(/ $/, spaceReplacer);
	// regular newlines to LF + newlines
	s = s.replace(/\n/g, SYMBOL_LF+LF);
	// other symbols
	s = RAW_MODE ? s.replace(reRawFull, replaceFullRawChar) :
				   s.replace(reRawBase, replaceBaseRawChar);
	return s;
}

function adjustSelection(element, moveRight) {
	var start = element.selectionStart;
	var end = element.selectionEnd;
	var s = element.value;

	var charBefore = s.substr(end-1, 1);
	var charAfter = s.substr(end, 1);
	var insideLF = charBefore == SYMBOL_LF && charAfter == LF;
	var selection = s.substring(start, end);

	// if newline is selected via mouse double-click,
	// expand the selection to include the preceding LF symbol
	if (selection == LF && s.substr(start-1, 1) == SYMBOL_LF) {
		element.selectionStart = element.selectionStart - 1;
		return;
	}

	// if caret is placed between LF symbol and newline,
	// move it one symbol to the right or to the left
	// depending on the keyCode
	if (insideLF) {
		element.selectionEnd = moveRight ? end + 1 : end - 1;
		if (start == end) {
			element.selectionStart = element.selectionEnd;
		}
	}
}

function onMouseDown(e) {
	// request selection adjustment after
	// the mousedown event is processed
	// (because now selectionStart/End are not updated yet,
	// even though the caret is already repositioned)
	var self = this;
	setTimeout(function() {
		adjustSelection(self);
	}, 0);
}

function onMouseUp(e) {
	adjustSelection(this);
}

function onKeyDown(e) {
	// request selection adjustment
	// after the keydown event is processed

	// on Mac, there's a Control+F alternative to pressing right arrow
	var moveRight = e.keyCode == KEY_RIGHT || (e.ctrlKey && e.keyCode == KEY_LETTER_F);

	var self = this;
	setTimeout(function() {
		adjustSelection(self, moveRight);
	}, 0);

	var start = this.selectionStart;
	var end = this.selectionEnd;
	var s = this.value;

	var charBefore = s.substr(end-1, 1);
	var charAfter = s.substr(end, 1);

	if (start == end) {
		// when there's no selection and Delete key is pressed
		// before LF symbol, select two characters to the right
		// to delete them in one step
		if (e.keyCode == KEY_DELETE && charAfter == SYMBOL_LF) {
			this.selectionEnd = this.selectionEnd + 2;
			return;
		}

		// when there's no selection and Backspace key is pressed
		// after newline character, select two characters to the left
		// to delete them in one step
		if (e.keyCode == KEY_BACKSPACE && charBefore == LF) {
			this.selectionStart = this.selectionStart - 2;
		}
	}
}

function onCopyOrCut(e) {
	// on cut or copy, we want to have raw text in clipboard
	// (without special characters) for interoperability
	// with other applications and parts of the UI

	// cancel the default event
	e.preventDefault();

	// get selection, convert it and put into clipboard
	var start = this.selectionStart;
	var end = this.selectionEnd;
	var selection = sym2raw(this.value.substring(start, end))

	// IE11 uses `Text` instead of `text/plain` content type
	// and global window.clipboardData instead of e.clipboardData
	if (e.clipboardData) {
		e.clipboardData.setData('text/plain', selection);
	} else {
		window.clipboardData.setData('Text', selection);
	}
}

function updateTextarea(element, insertValue) {
	var start = element.selectionStart;
	var end = element.selectionEnd;
	var s = element.value;
	var sBefore = s.substring(0, end);
	var sAfter = s.substring(end);
	var sBeforeNormalized = raw2sym(sym2raw(sBefore + (insertValue || "")));
	var offset = sBeforeNormalized.length - sBefore.length;
	var newValue = sBeforeNormalized + raw2sym(sym2raw(sAfter));
	if (s == newValue) return;
	element.value = newValue;
	element.selectionEnd = end + offset;
	if (start == end) {
		element.selectionStart = end + offset;
	}
}

function onInput(e) {
	updateTextarea(this);
}

function mountTextarea(element) {
	updateTextarea(element);
	element.addEventListener('input', onInput);
	element.addEventListener('keydown', onKeyDown);
	element.addEventListener('mousedown', onMouseDown);
	element.addEventListener('mouseup', onMouseUp);
	element.addEventListener('copy', onCopyOrCut);
	element.addEventListener('cut', onCopyOrCut);
}

function getValue(element) {
	return sym2raw(element.value);
}

function setValue(element, value) {
	element.value = raw2sym(value);
	return getValue(element);
}

function insertAtCaret(element, value) {
	updateTextarea(element, value);
	return getValue(element);
}
