# is-responding

<!-- prettier-ignore-start -->

[![cli-available](https://badgen.net/static/cli/available/?icon=terminal)](#cli)
[![node version](https://img.shields.io/node/v/is-responding.svg)](https://www.npmjs.com/package/is-responding)
[![npm version](https://badge.fury.io/js/is-responding.svg)](https://badge.fury.io/js/is-responding)
[![downloads count](https://img.shields.io/npm/dt/is-responding.svg)](https://www.npmjs.com/package/is-responding)
[![size](https://packagephobia.com/badge?p=is-responding)](https://packagephobia.com/result?p=is-responding)
[![license](https://img.shields.io/npm/l/is-responding.svg)](https://piecioshka.mit-license.org)
[![github-ci](https://github.com/piecioshka/is-responding/actions/workflows/ci.yml/badge.svg)](https://github.com/piecioshka/is-responding/actions/workflows/ci.yml)
[![typescript](https://img.shields.io/badge/built%20with-TypeScript-3178c6.svg)](https://www.typescriptlang.org/)

<!-- prettier-ignore-end -->

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

Or run it without installing:

```bash
npx is-responding -u "https://example.org/{{integer}}"
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
  --pad, -p      Pad values with leading zeros, e.g. 3 gives 007  [default: 0]
  --timeout      Milliseconds before a request is abandoned    [default: 10000]
  --verbose, -v  Display endpoints which refused
  --help         Show help                                             [boolean]
```

## Usage

### How it works

The tool takes one URL template, swaps the `{{...}}` placeholder for every value in a range, sends a `HEAD` request to each resulting address and reports the ones that answered.

### Placeholders

A placeholder is written as `{{type}}` - double curly braces around a **supported type name**.

| Placeholder   | Meaning                                       | Supported |
| ------------- | --------------------------------------------- | --------- |
| `{{integer}}` | Every whole number from `--from` up to `--to` | ✅ Yes    |

<!-- prettier-ignore-start -->

> [!IMPORTANT]
> `integer` is currently the **only** supported type, and the placeholder must be the type name itself. Invented names like `{{id}}`, `{{page}}` or `{{user}}` are rejected - the tool prints `"id" is not supported` and exits with code `1`.

<!-- prettier-ignore-end -->

A URL without any placeholder is rejected too, because there would be nothing to enumerate.

### Repeating a placeholder

You can use `{{integer}}` more than once. Each occurrence is an **independent dimension**, so the run walks the cartesian product of the ranges - not one shared counter.

```bash
is-responding -u "https://example.org/{{integer}}/photo/{{integer}}.jpg" -f 1 -t 3
```

```text
https://example.org/1/photo/1.jpg
https://example.org/1/photo/2.jpg
https://example.org/1/photo/3.jpg
https://example.org/2/photo/1.jpg
...
https://example.org/3/photo/3.jpg
```

Two placeholders side by side behave the same way - `{{integer}}{{integer}}` over `1..4` produces `11`, `12`, `13`, `14`, `21`, `22`, ... `44`, so all 16 combinations, not just `11`, `22`, `33`, `44`.

<!-- prettier-ignore-start -->

> [!WARNING]
> The number of requests is the range size raised to the number of placeholders. Two placeholders over `1..100` means 10 000 requests, three means 1 000 000. Keep the range small when repeating a placeholder.

<!-- prettier-ignore-end -->

### Leading zeros

Some services expect a fixed-width number, like `/photo/007.jpg`. Use `--pad` (`-p`) to set that width:

```bash
is-responding -u "https://example.org/photo/{{integer}}.jpg" -f 7 -t 9 --pad 3
```

```text
https://example.org/photo/007.jpg
https://example.org/photo/008.jpg
https://example.org/photo/009.jpg
```

Values already wider than the padding are left alone (`--pad 2` keeps `1000` as `1000`), and a negative value keeps its sign in front (`--pad 3` turns `-7` into `-007`).

### Range

`--from` and `--to` are inclusive and may be negative. Both have to be numbers, and `--from` must not be greater than `--to`; otherwise the run stops immediately with exit code `1`.

```bash
is-responding -u "https://example.org/{{integer}}" -f -3 -t 0
```

### Exit codes

Useful when calling the tool from a script or a CI job.

| Code | Meaning                                          |
| ---- | ------------------------------------------------ |
| `0`  | At least one endpoint responded                  |
| `1`  | Nothing responded, or the arguments were invalid |

```bash
if is-responding -u "https://example.org/{{integer}}" -f 1 -t 50; then
  echo "found something"
fi
```

## Examples

### ➡️ Use case: Start making request

```bash
is-responding -u "https://example.org/{{integer}}/foo?bar=1" -f 123 -t 234 -v
```

```text
🚀 Enumeration started...
[20] 200: https://example.org/20/foo?bar=1
[98] 200: https://example.org/98/foo?bar=1
✅ Enumeration completed
```

### ➡️ Use case: See why endpoints were skipped

Without `--verbose` only responding endpoints are printed. Add `-v` to also see the failures with their status and message.

```bash
is-responding -u "https://example.org/{{integer}}" -f 1 -t 5 -v
```

### ➡️ Use case: Give up on slow endpoints faster

```bash
is-responding -u "https://example.org/{{integer}}" --timeout 2000
```

### ➡️ Use case: Save the responding endpoints to a file

Progress is animated only when the output is a terminal, so a redirected run stays clean and greppable.

```bash
is-responding -u "https://example.org/{{integer}}" -f 1 -t 500 > alive.txt
```

## API

The package can be used programmatically as well.

```js
const { start } = require('is-responding');

const result = await start({
  url: 'https://example.org/{{integer}}',
  from: 1,
  to: 20,
  verbose: false,
  timeout: 10000,
  pad: 0,
});

console.log(result.responding); // ['https://example.org/7', ...]
console.log(result.checked); // 20
```

`start()` resolves once every endpoint has been checked, and returns `null` when the URL template was invalid.

## Related

- [makiwara](https://github.com/piecioshka/makiwara)

## License

[The MIT License](https://piecioshka.mit-license.org) @ 2026
