/*
Copyright 2020 Michael Brown

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

//==================================================
// References
//==================================================
// https://www.ietf.org/rfc/rfc2822.txt
// https://tools.ietf.org/html/rfc5321
// https://tools.ietf.org/html/rfc6532

//==================================================
// Setup
//==================================================

{
	// The following field will be set to true,
	// when a non-ASCII UTF-8 character is detected.
	// All "text" fields are extended to allow
	// non-ASCII UTF-8 (text, qtext, atext, dtext).
	var rfc6532 = false;
	var quoted_string = false;
}

start
	= addr_spec

//==================================================
// 2.1. General Description (rfc2822)
//==================================================

CRLF
    = "\x0d\x0a"

//==================================================
// 2.2.2. Structured Header Field Bodies (rfc2822)
//==================================================

WSP // (Space and Tab)
	= "\x09" // HT
	/ "\x20" // SP

//==================================================
// 3.2.1. Primitive Tokens (rfc2822)
//==================================================

NO_WS_CTL
	= [\x01-\x08] // 1-8
	/ "\x0b" // 11
	/ "\x0c" // 12
	/ [\x0e-\x1f] // 14-31
	/ "\x7f" // 127

text
	= [\x01-\x09] // 1-9
	/ "\x0b" // 11
	/ "\x0c" // 12
	/ [\x0e-\x7f] // 14-127
//	/ obs_text
	/ u:[\u0080-\uFFFF] {
		rfc6532 = true;
		return u;
	}

//==================================================
// 3.2.2. Quoted characters (rfc2822)
//==================================================

quoted_pair
	= qp:("\\" text) {
		return qp[1];
	}
//	/ obs_qp

//==================================================
// 3.2.3. Folding white space and comments (rfc2822)
//==================================================

FWS
	= (WSP* CRLF)? WSP+
//	/ obs_FWS
	/ ""

ctext
	= NO_WS_CTL
	/ [\x21-\x27] // 33-39
	/ [\x2a-\x5b] // 42-91
	/ [\x5d-\x7e] // 93-126

ccontent
	= ctext
	/ quoted_pair
	/ comment

comment
	= "(" cm:(FWS? ccontent)* FWS? ")" {
		var comments = [];
		var str = "";
		for (var i = 0; i < cm.length; ++i)
		{
			if (typeof(cm[i][1]) === 'string') {
				str += cm[i][1];
			} else {
				if (str.length > 0) {
					comments.push(str);
					str = "";
				}
				comments.push(cm[i][1]);
			}
		}
		if (comments.length === 0 && str.length === 0) {
			comments.push("");
		}
		if (str.length > 0) {
			comments.push(str);
		}
		return comments;
	}

CFWS
	= c1:(FWS? comment)* c2:((FWS? comment) / FWS) {
		var comments = [];
		for (var i = 0; i < c1.length; i++) {
			if (c1[i][1]) {
				comments = comments.concat(c1[i][1]);
			}
		}
		if (c2[1]) {
			comments = comments.concat(c2[1]);
		}
		return comments;
	}

//==================================================
// 3.2.4. Atom (rfc2822)
//==================================================

atext
	= [A-Z]
	/ [a-z]
	/ [0-9]
	/ "!" / "#" / "$"
	/ "%" / "&" / "'"
	/ "*" / "+" / "-"
	/ "/" / "=" / "?"
	/ "^" / "_" / "`"
	/ "{" / "|" / "}"
	/ "~"
	/ u:[\u0080-\uFFFF] {
		rfc6532 = true;
		return u;
	}

//atom
//	= CFWS? atext+ CFWS?

dot_atom
	= c1:CFWS? txt:dot_atom_text c2:CFWS? {
		var comments = [];
		if (c1) {
			comments = comments.concat(c1);
		}
		if (c2) {
			comments = comments.concat(c2);
		}
		return {
			value: txt,
			comments: comments
		};
	}

dot_atom_text
	= at:atext+ bt:("." atext+)* {
		var str = at.join("");
		for (var i = 0; i < bt.length; i++) {
			str += "." + bt[i][1].join("");
		}
		return str;
	}

//==================================================
// 3.2.5. Quoted strings (rfc2822)
//==================================================

qtext
	=  NO_WS_CTL
	/ "\x21" // 33
	/ [\x23-\x5b] // 35-91
	/ [\x5d-\x7e] // 93-126
	/ u:[\u0080-\uFFFF] {
		rfc6532 = true;
		return u;
	}

qcontent
	= qtext
	/ quoted_pair

quoted_string
	= c1:CFWS? '"' qstr:(FWS? qcontent)* FWS? '"' c2:CFWS? {
		var str = "";
		var comments = [];
		if (c1) {
			comments = comments.concat(c1);
		}
		if (c2) {
			comments = comments.concat(c2);
		}
		for (var i = 0; i < qstr.length; ++i) {
			str += qstr[i][1];
		}
		return {
			value: str,
			comments: comments
		};
}

//==================================================
// 3.4.1. Addr-spec specification (rfc2822)
//==================================================

addr_spec
	= lp:local_part "@" d:domain {
		lp.quoted_string = quoted_string;
		return {
			local_part: lp,
			domain: d,
			rfc6532: rfc6532
		};
	}

local_part
	= dot_atom
	/ qs:quoted_string {
		quoted_string = true;
		return qs;
	}
	// / obs_local_part

domain
	= dot_atom
	/ domain_literal
	// / obs-domain

domain_literal
	= c1:CFWS? "[" d:(FWS? dcontent)* FWS? "]" c2:CFWS? {
		var str = "";
		var comments = [];
		if (c1) {
			comments = comments.concat(c1);
		}
		if (c2) {
			comments = comments.concat(c2);
		}
		for (var i = 0; i < d.length; ++i) {
			str += d[i][1];
		}
		return {
			value: str,
			comments: comments
		};
	}

dcontent
	= dtext
	/ quoted_pair

dtext
	= NO_WS_CTL
	/ [\x21-\x5a] // 33-90
	/ [\x5e-\x7e] // 94-126
	/ u:[\u0080-\uFFFF] {
		rfc6532 = true;
		return u;
	}
