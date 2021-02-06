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
// Setup
//==================================================
/* eslint-disable no-undef */
const assert = require('chai').assert
const fs = require('fs')
const libxmljs = require('libxmljs')
const path = require('path')
const Forte = require('..')
//==================================================
// Basic Test
//==================================================
describe('Forte', () => {
	it('should exist', () => {
		assert.exists(Forte)
	})
	it('should have parse_email() function', () => {
		assert.typeOf(Forte.parse_email, 'function')
	})
})
//==================================================
// Wikipedia Test Vectors
//==================================================
const wikipedia_test_vectors = [
	{
		email: 'simple@example.com',
		local_part: 'simple',
		domain: 'example.com',
		valid: true
	}, {
		email: 'very.common@example.com',
		local_part: 'very.common',
		domain: 'example.com',
		valid: true
	}, {
		email: 'disposable.style.email.with+symbol@example.com',
		local_part: 'disposable.style.email.with+symbol',
		domain: 'example.com',
		valid: true
	}, {
		email: 'other.email-with-hyphen@example.com',
		local_part: 'other.email-with-hyphen',
		domain: 'example.com',
		valid: true
	}, {
		email: 'fully-qualified-domain@example.com',
		local_part: 'fully-qualified-domain',
		domain: 'example.com',
		valid: true
	}, {
		email: 'user.name+tag+sorting@example.com',
		local_part: 'user.name+tag+sorting',
		domain: 'example.com',
		valid: true
	}, {
		email: 'x@example.com',
		local_part: 'x',
		domain: 'example.com',
		valid: true
	}, {
		email: 'example-indeed@strange-example.com',
		local_part: 'example-indeed',
		domain: 'strange-example.com',
		valid: true
	}, {
		email: 'admin@mailserver1',
		local_part: 'admin',
		domain: 'mailserver1',
		valid: true
	}, {
		email: 'example@s.example',
		local_part: 'example',
		domain: 's.example',
		valid: true
	}, {
		email: '" "@example.org',
		local_part: '',
		domain: 'example.org',
		valid: true
	}, {
		email: '"john..doe"@example.org',
		local_part: 'john..doe',
		domain: 'example.org',
		valid: true
	}, {
		email: 'mailhost!username@example.org',
		local_part: 'mailhost!username',
		domain: 'example.org',
		valid: true
	}, {
		email: 'user%example.com@example.org',
		local_part: 'user%example.com',
		domain: 'example.org',
		valid: true
	}, {
		email: 'jsmith@[IPv6:2001:db8::1]',
		local_part: 'jsmith',
		domain: '2001:db8::1',
		valid: true
	}, {
		email: 'jsmith@[192.168.2.1]',
		local_part: 'jsmith',
		domain: '192.168.2.1',
		valid: true
	}, {
		email: 'john.smith@(comment)example.com',
		local_part: 'john.smith',
		domain: 'example.com',
		valid: true
	}, {
		email: 'john.smith@example.com(comment)',
		local_part: 'john.smith',
		domain: 'example.com',
		valid: true
	}, {
		email: 'Abc.example.com',
		valid: false
	}, {
		email: 'A@b@c@example.com',
		valid: false
	}, {
		email: 'a"b(c)d,e:f;g<h>i[j\\k]l@example.com',
		valid: false
	}, {
		email: 'just"not"right@example.com',
		valid: false
	}, {
		email: 'this is"not\\allowed@example.com',
		valid: false
	}, {
		email: 'this\\ still\\"not\\\\allowed@example.com',
		valid: false
	}, {
		email: 'i_like_underscore@but_its_not_allow_in_this_part.example.com',
		valid: false
	}
]
describe('Wikipedia (Test Vectors)', () => {
	it('should validate properly', () => {
		for (const vector of wikipedia_test_vectors) {
			assert.exists(vector.email)
			assert.exists(vector.valid)
			const o = Forte.parse_email(vector.email)
			if (vector.valid) {
				assert.exists(o)
				assert.exists(vector.local_part)
				assert.exists(vector.domain)
				assert.strictEqual(o.local_part.value, vector.local_part)
				assert.strictEqual(o.domain.value, vector.domain)
			} else {
				assert.notExists(o)
			}
		}
	})
})
//==================================================
// is_email project tests
//==================================================
function convertAddress(s) {
	const chars = []
	for (let i = 0; i < s.length; i += 1) {
		let code = s.charCodeAt(i)
		if (code >= 0x2400) {
			code -= 0x2400
		}
		chars.push(String.fromCharCode(code))
	}
	return chars.join('')
}
describe('is_email (Test Vectors)', () => {
	const data = fs.readFileSync(path.join(__dirname, 'tests.xml'), 'utf-8')
	const doc = libxmljs.parseXml(data)
	const OK_REGEX = /ISEMAIL_VALID|ISEMAIL_RFC5321_ADDRESSLITERAL|ISEMAIL_RFC5322_DOMAINLITERAL|ISEMAIL_RFC5322_IPV6_GRPCOUNT|ISEMAIL_RFC5321_QUOTEDSTRING|ISEMAIL_CFWS_FWS|ISEMAIL_CFWS_COMMENT|ISEMAIL_RFC5321_TLDNUMERIC/
	const ERR_REGEX = /ISEMAIL_ERR|ISEMAIL_RFC5322_IPV6_MAXGRPS|ISEMAIL_RFC5322_IPV6_COLONSTRT|ISEMAIL_RFC5322_IPV6_BADCHAR/
	it('should validate properly', () => {
		const vectors = doc.find('//test')
		for (const vector of vectors) {
			const address = convertAddress(vector.find('address')[0].text())
			const diagnosis = vector.find('diagnosis')[0].text()
			let valid = OK_REGEX.test(diagnosis)
			let error = ERR_REGEX.test(diagnosis)

			// Overrides from the test vectors are delineated below
			if (address === '"test\\©"@iana.org') {
				// "test\&#xA9;"@iana.org is valid under rfc6532 and should be ignored
				valid = true
				error = false
			} else if (address === 'test@[255.255.255]') {
				// test@[255.255.255] gives an invalid literal and should fail
				valid = false
				error = true
			} else if (address === 'test@[255.255.255.255.255]') {
				// test@[255.255.255.255.255] gives an invalid literal and should fail
				valid = false
				error = true
			} else if (address === 'test@[255.255.255.256]') {
				// test@[255.255.255.256] gives an invalid literal and should fail
				valid = false
				error = true
			} else if (address === 'test@[1111:2222:3333:4444:5555:6666:7777:8888]') {
				// test@[1111:2222:3333:4444:5555:6666:7777:8888] gives an invalid literal and should fail
				// needs to start with 'IPv6:'
				valid = false
				error = true
			} else if (address === 'test@[IPv6:1111:2222:3333:4444:5555:6666:7777]') {
				// test@[IPv6:1111:2222:3333:4444:5555:6666:7777] gives an invalid literal and should fail
				valid = false
				error = true
			} else if (address === 'test@[IPv6:1111:2222:3333:4444:5555:6666:7777:8888:9999]') {
				// test@[IPv6:1111:2222:3333:4444:5555:6666:7777:8888:9999] gives an invalid literal and should fail
				valid = false
				error = true
			} else if (address === 'test@[IPv6:1111:2222:3333:4444:5555:255.255.255.255]') {
				// test@[IPv6:1111:2222:3333:4444:5555:255.255.255.255] gives an invalid literal and should fail
				valid = false
				error = true
			} else if (address === 'test@[IPv6:1111:2222:3333:4444:5555:6666:7777:255.255.255.255]') {
				// test@[IPv6:1111:2222:3333:4444:5555:6666:7777:255.255.255.255] gives an invalid literal and should fail
				valid = false
				error = true
			} else if (address === 'test@iana.123') {
				// test@iana.123 has an invalid TLD and should fail
				valid = false
				error = true
			}

			const o = Forte.parse_email(address)
			if (valid) {
				assert.exists(o)
				assert.exists(o.local_part)
				assert.exists(o.local_part.value)
				assert.exists(o.local_part.comments)
				assert.exists(o.local_part.quoted_string)
				assert.exists(o.domain)
				assert.exists(o.domain.value)
				assert.exists(o.domain.safe_value)
				assert.exists(o.domain.comments)
				assert.exists(o.domain.type)
				assert.exists(o.rfc6532)
				assert.exists(o.address)
				assert.exists(o.safe_address)
			} else if (error) {
				assert.notExists(o)
			}
		}
	})
})
//==================================================
// Comment testing
//==================================================
const comment_vectors = [
	{
		email: 'a(b)@example.com',
		local_part_comments: ['b'],
		domain_comments: []
	}, {
		email: 'a@(a)example.com',
		local_part_comments: [],
		domain_comments: ['a']
	}, {
		email: '(1)a(2)@(3)example.com(4)',
		local_part_comments: ['1', '2'],
		domain_comments: ['3', '4']
	}, {
		email: '()a()@()example.com()',
		local_part_comments: ['', ''],
		domain_comments: ['', '']
	}, {
		email: '(())a(())@(())example.com(())',
		local_part_comments: [[''], ['']],
		domain_comments: [[''], ['']]
	}, {
		email: '(()a(b)((c)))a@example.com',
		local_part_comments: [[''], 'a', ['b'], [['c']]],
		domain_comments: []
	}
]
describe('Comment (Test Vectors)', () => {
	it('should validate properly', () => {
		for (const vector of comment_vectors) {
			assert.exists(vector.email)
			assert.exists(vector.local_part_comments)
			assert.exists(vector.domain_comments)
			const o = Forte.parse_email(vector.email)
			assert.exists(o)
			assert.deepStrictEqual(
				o.local_part.comments,
				vector.local_part_comments
			)
			assert.deepStrictEqual(
				o.domain.comments,
				vector.domain_comments
			)
		}
	})
})
//==================================================
// Options
//==================================================
describe('Forte (Options)', () => {
	describe('reject_quoted_string', () => {
		it('should reject addresses with quotes', () => {
			const o = Forte.parse_email('"a"@example.com', {
				reject_quoted_string: true
			})
			assert.notExists(o)
		})
		it('should not reject addresses without quotes', () => {
			const o = Forte.parse_email('a@example.com', {
				reject_quoted_string: true
			})
			assert.exists(o)
		})
	})

	describe('reject_comments', () => {
		it('should reject addresses with comments', () => {
			const o_local = Forte.parse_email('a(a)@example.com', {
				reject_comments: true
			})
			assert.notExists(o_local)
			const o_domain = Forte.parse_email('a@(b)example.com', {
				reject_comments: true
			})
			assert.notExists(o_domain)
		})
		it('should not reject addresses without comments', () => {
			const o = Forte.parse_email('a@example.com', {
				reject_comments: true
			})
			assert.exists(o)
		})
	})

	describe('reject_ip', () => {
		it('should reject addresses with ip domains', () => {
			const o_ipv4 = Forte.parse_email('a@192.168.1.1', {
				reject_ip: true
			})
			assert.notExists(o_ipv4)
			const o_ipv6 = Forte.parse_email('a@[IPv6:2001:db8::1]', {
				reject_ip: true
			})
			assert.notExists(o_ipv6)
		})
		it('should not reject addresses without ip domains', () => {
			const o1 = Forte.parse_email('a@example.com', {
				reject_ip: true
			})
			assert.exists(o1)
			const o2 = Forte.parse_email('a123@abcd', {
				reject_ip: true
			})
			assert.exists(o2)
		})
	})

	describe('reject_local', () => {
		it('should reject addresses with local domains', () => {
			const o = Forte.parse_email('a@abcdef', {
				reject_local: true
			})
			assert.notExists(o)
		})
		it('should not reject addresses without local domains', () => {
			const o1 = Forte.parse_email('a@a.com', {
				reject_local: true
			})
			assert.exists(o1)
			const o = Forte.parse_email('a@[IPv6:2001:db8::1]', {
				reject_local: true
			})
			assert.exists(o)
		})
	})
})
