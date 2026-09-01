# is-responding

[![cli-available](https://badgen.net/static/cli/available/?icon=terminal)](#cli)
[![node version](https://img.shields.io/node/v/is-responding.svg)](https://www.npmjs.com/package/is-responding)
[![npm version](https://badge.fury.io/js/is-responding.svg)](https://badge.fury.io/js/is-responding)
[![downloads count](https://img.shields.io/npm/dt/is-responding.svg)](https://www.npmjs.com/package/is-responding)
[![size](https://packagephobia.com/badge?p=is-responding)](https://packagephobia.com/result?p=is-responding)
[![license](https://img.shields.io/npm/l/is-responding.svg)](https://piecioshka.mit-license.org)
[![github-ci](https://github.com/piecioshka/is-responding/actions/workflows/ci.yml/badge.svg)](https://github.com/piecioshka/is-responding/actions/workflows/ci.yml)
[![typescript](https://img.shields.io/badge/built%20with-TypeScript-3178c6.svg)](https://www.typescriptlang.org/)

🔨 A tool to find active endpoints using an enumeration strategy

![](demo/is-responding.gif)

> Give a ⭐️ if this project helped you!

## Motivation

A lot of services use the next integer in parameters.

If you want to test services like that, this tool is for you!

## CLI

Installation:

```bash
npm install -g is-responding
```

```bash
is-responding -h
```

```text
Options:
  --version      Show version number                                   [boolean]
  --url, -u      URL with {{parameter}}                               [required]
  --from, -f     Provide an initial value from count should start   [default: 0]
  --to, -t       Provide an last value when count ends             [default: 10]
  --verbose, -v  Display endpoints which refused
  --help         Show help                                             [boolean]
```

## Examples

### ➡️ Use case: Start making request

```bash
is-responding -u "https://example.org/{{integer}}/foo?bar=1" -f 123 -t 234 -v
```

```text
ℹ Enumeration started
✔ [20] 200: https://example.org/20/foo?bar=1
✔ [98] 200: https://example.org/98/foo?bar=1
ℹ Enumeration completed
```

## Related

- [makiwara](https://github.com/piecioshka/makiwara)

## License

[The MIT License](https://piecioshka.mit-license.org) @ 2026
