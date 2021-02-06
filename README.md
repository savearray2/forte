# forte

Parser for RFC-2822/RFC-6532 email addresses.

This library's sole purpose is to validate email addresses, and email addresses only (including esoteric ones!). It can be used in the browser or from within Node.js. Special care has been taken to ensure strange email addresses can be validated successfully.

Unicode/Punycode is also supported.

Examples:
```
simple@example.com
disposable.style.email.with+symbol@example.com
" "@example.org
"john..doe"@example.org
email@ドメイン.com
```

A wide array of test vectors can be found in the project test files.

## Installation

```
npm install @savearray2/forte
```

## Usage

```js
const Forte = require('@savearray2/forte')
const parsed_email = Forte.parse_email('email@domain.com')
```

```js
{
  local_part: { value: 'email', comments: [], quoted_string: false },
  domain: {
    value: 'domain.com',
    comments: [],
    safe_value: 'domain.com',
    type: 'fqdn'
  },
  rfc6532: false,
  address: 'email@domain.com',
  safe_address: 'email@domain.com'
}
```

## API

### `Forte.parse_email(addr, [opts])`

* `addr: string` - The email address to parse.
* `opts: object` with the following options:
	* `reject_quoted_string: bool` - Rejects any address whose local part a quoted string. Default: `false`.
	* `reject_comments: bool` - Rejects any address whose local part or domain contains comments. Default: `false`.
	* `reject_local: bool` - Rejects any address whose domain is determined to be local (no TLD). Default: `false`.
	* `reject_ip: bool` - Rejects any address whose domain is determined to be an IP literal (an IPv4 or IPv6 address). Default: `false`.

Returns `null`, if invalid address. Otherwise, returns an `EmailAddress` object with email address information:

* `local_part: object` - The local part of the email address.
	* `value: string` - The parsed local part string.
	* `quoted_string: bool` - If true, the local part contained a quoted string, when parsed.
	* `comments: array` - A (possibly nested) array of strings representing the comments.
* `domain: object` - The domain part of the email address.
	* `value: string` - The parsed domain string.
	* `safe_value: string` - A version of the domain that is safe to use with systems that only accept ASCII-encoded domains (punycode-encoded).
	* `comments: array` - A (possibly nested) array of strings representing the comments.
	* `type: string` - The type of domain parsed. (Values: `fqdn`, `local`, `ipv4`, `ipv6`)
* `address: string` - A pretty/simplified version of the address.
* `safe_address: string` - A pretty/simplified version of the address that is safe to use with systems that only accept ASCII-encoded email addresses (punycode-encoded).
* `rfc6532: bool` - If true, then the parsed address was processed in rfc6532 mode, and contains unicode characters (\u0080-\uFFFF).

## License

This library is licensed under MIT.
