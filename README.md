# is-respond

[![node version](https://img.shields.io/node/v/is-respond.svg)](https://www.npmjs.com/package/is-respond)
[![npm version](https://badge.fury.io/js/is-respond.svg)](https://badge.fury.io/js/is-respond)
[![downloads count](https://img.shields.io/npm/dt/is-respond.svg)](https://www.npmjs.com/package/is-respond)
[![github-ci](https://github.com/piecioshka/is-respond/workflows/Testing/badge.svg?branch=master)](https://github.com/piecioshka/is-respond/actions/)

🛠 A tool to find active endpoint use an enumeration strategy

## Motivation

A lot of services use the next integer in parameters.

If you would like to test services like that, this tool is for you!

## Installation

```bash
npm install -g is-respond
```

## CLI

```bash
is-respond -u "https://example.org/{{integer}}/foo?bar=1" -f 123 -t 234 -v
```

```text
ℹ Enumeration started
✔ [20] 200: https://example.org/20/foo?bar=1
✔ [98] 200: https://example.org/98/foo?bar=1
ℹ Enumeration completed
```

## Usage

```text
Options:
  --version      Show version number                                   [boolean]
  --url, -u      URL with {{parameter}}                               [required]
  --from, -f     Provide an initial value from count should start   [default: 0]
  --to, -t       Provide an last value when count ends             [default: 10]
  --verbose, -v  Display endpoints which refused
  --help         Show help                                             [boolean]
```

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />
Feel free to check [issues page](https://github.com/piecioshka/is-respond/issues/).

## Show your support

Give a ⭐️ if this project helped you!

## Related

- [makiwara](https://github.com/piecioshka/makiwara)

## License

[The MIT License](http://piecioshka.mit-license.org) @ 2020
