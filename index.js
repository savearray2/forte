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
// Imports
//==================================================
const punycode = require('punycode/')
const p = require('./lib/parser.js')
//==================================================
// Type Definitions
//==================================================
/**
 * @typedef {Object} EmailAddress
 * @property {LocalPart} local_part
 * 	The local part of the email address.
 * @property {Domain} domain
 * 	The domain part of the email address.
 * @property {string} address
 * 	A pretty/simplified version of the address.
 * @property {string} safe_address
 * 	A pretty/simplified version of the address
 * 	that is safe to use with systems that only accept
 * 	ASCII-encoded email addresses (punycode-encoded).
 * @property {boolean} rfc6532
 * 	If true, then the parsed address was processed in
 * 	rfc6532 mode, and contains unicode characters
 * 	(\u0080-\uFFFF).
 */
/**
 * @typedef {Object} LocalPart
 * @property {string} value
 * 	The parsed local part string.
 * @property {boolean} quoted_string
 * 	If true, the local part contained a quoted string
 * 	when parsed.
 * @property {Array} comments
 * 	A (possibly nested) array of strings representing
 * 	the comments.
 */
/**
 * @typedef {Object} Domain
 * @property {string} value
 * 	The parsed domain string.
 * @property {string} safe_value
 * 	A version of the domain that is safe to use with
 * 	systems that only accept ASCII-encoded domains
 * 	(punycode-encoded).
 * @property {Array} comments
 * 	A (possibly nested) array of strings representing
 * 	the comments.
 * @property {string} type
 * 	The type of domain parsed. (Possible Values:
 * 	'fqdn', 'local', 'ipv4', 'ipv6')
 */
//==================================================
// Regex Definitions
//==================================================
// https://stackoverflow.com/questions/23483855/javascript-regex-to-validate-ipv4-and-ipv6-address-no-hostnames
const ip = /((^\s*(((\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])\.){3}(\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5]))\s*$)|(^(IPv6:)?\s*((([\dA-Fa-f]{1,4}:){7}([\dA-Fa-f]{1,4}|:))|(([\dA-Fa-f]{1,4}:){6}(:[\dA-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([\dA-Fa-f]{1,4}:){5}(((:[\dA-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([\dA-Fa-f]{1,4}:){4}(((:[\dA-Fa-f]{1,4}){1,3})|((:[\dA-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([\dA-Fa-f]{1,4}:){3}(((:[\dA-Fa-f]{1,4}){1,4})|((:[\dA-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([\dA-Fa-f]{1,4}:){2}(((:[\dA-Fa-f]{1,4}){1,5})|((:[\dA-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([\dA-Fa-f]{1,4}:)(((:[\dA-Fa-f]{1,4}){1,6})|((:[\dA-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[\dA-Fa-f]{1,4}){1,7})|((:[\dA-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))/

// https://stackoverflow.com/questions/11809631/fully-qualified-domain-name-validation/20204811
// https://regex101.com/r/FLA9Bv/40
const fqdn = /^(?!.*?_.*?)(?!(?:\w+?\.)?-[\w.-]*?)(?!\w+?-\.[\w.-]+?)(?=\w)(?=[\w.-]*?\.+[\w.-]*?)(?![\w.-]{254})(?!(?:\.?[\w\-.]*?[\w-]{64,}\.)+?)[\w.-]+?(?<![\w\-.]*?\.\d+?)(?<=[\w-]{2,})(?<![\w-]{25})$/

// tests for local name
const local = /^(xn--)?[A-Za-z\d]([A-Za-z\d-](?<!--))*(?<!-)$/
const num = /^\d+$/

// tests to see if invalid characters exist and need to be escaped with double quotes
// need to escape 9 32 34 92 with backslash
// () , : ; < > @ [ \ ]
const quote = /[\u0001-\u0009\u000B\u000C\u000E-\u001F\u007F"(),\u003A-\u003C>@\u005B-\u005D ]/
const quote_replace = /([\u0009 "\\])/
const dbl_dot_ck = /\.\./
//==================================================
// Class Definition
//==================================================
class Forte {
	/**
	 * @param {string} addr
	 * 	The address to attempt to parse.
	 * @param {object} [params]
	 * 	An object containing options.
	 * @param {boolean} [params.reject_quoted_string=false]
	 * 	Rejects any address whose local part contains
	 * 	a quoted string.
	 * @param {boolean} [params.reject_comments=false]
	 * 	Rejects any address whose local part or domain
	 * 	contains comments.
	 * @param {boolean} [params.reject_local=false]
	 * 	Rejects any address whose domain is determined
	 * 	to be local (no TLD).
	 * @param {boolean} [params.reject_ip=false]
	 * 	Rejects any address whose domain is determined
	 * 	to be an IP literal (an IPv4 or IPv6 address).
	 * @returns {EmailAddress|null}
	 * 	An object representing parsed address information
	 * 	or null if the address could not be parsed or was rejected.
	 */
	static parse_email(addr, {
		reject_quoted_string = false,
		reject_comments = false,
		reject_local = false,
		reject_ip = false
	} = {}) {
		try {
			const o = p.parse(addr)
			o.domain.safe_value = o.domain.value
			if (reject_quoted_string && o.local_part.quoted_string) {
				throw new Error('Rejecting quoted string')
			}
			if (reject_comments &&
				(o.local_part.comments.length > 0 || o.domain.comments.length > 0)) {
				throw new Error('Rejecting comments')
			}
			let lp = o.local_part.value.replace(quote_replace, "\\$1")
			if (quote.test(o.local_part.value) || o.local_part.value === '' ||
				dbl_dot_ck.test(o.local_part.value) || o.local_part.value.endsWith('.') ||
				o.local_part.value.startsWith('.')) {
				lp = `"${lp}"`
			}
			if (ip.test(o.domain.value)) {
				if (reject_ip) {
					throw new Error('Reject ip')
				}
				if (o.domain.value.includes(':')) {
					if (!o.domain.value.startsWith('IPv6:')) {
						throw new Error('Invalid IPv6')
					}
					o.domain.value = o.domain.value.slice(5)
					o.domain.safe_value = o.domain.value
					o.domain.type = 'ipv6'

					o.address = `${lp}@[IPv6:${o.domain.value}]`
					o.safe_address = o.address
				} else {
					o.domain.type = 'ipv4'
					o.address = `${lp}@${o.domain.value}`
					o.safe_address = `${lp}@${o.domain.safe_value}`
				}
			} else {
				if (o.rfc6532) {
					o.domain.safe_value =
						punycode.toASCII(o.domain.safe_value)
				}
				if (fqdn.test(o.domain.safe_value)) {
					o.domain.type = 'fqdn'
					if (o.domain.safe_value.endsWith('-')) {
						throw new Error('Invalid domain')
					}
				} else if (local.test(o.domain.safe_value) && !num.test(o.domain.safe_value)) {
					if (reject_local) {
						throw new Error('Reject local')
					}
					o.domain.type = 'local'
				} else {
					throw new Error('Unknown Type')
				}
				o.address = `${lp}@${o.domain.value}`
				o.safe_address = `${lp}@${o.domain.safe_value}`
			}
			return o
		} catch (err) {
			return null
		}
	}
}
//==================================================
// Exports
//==================================================
module.exports = Forte
