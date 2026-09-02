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

<!-- Social preview: assets/og-image.png (1200x630) -->

🔨 A tool to find active endpoints using an enumeration strategy

![](demo/is-responding.gif)

> Give a ⭐️ if this project helped you!

## What it does

Plenty of services put a plain counter in the URL: `/invoice/1042`, `/photo/007.jpg`, `/status/204`. Point `is-responding` at such an address with the counter replaced by `{{integer}}`, give it a range, and it sends a `HEAD` request to every address in that range and prints the ones that answered.

```bash
is-responding -u "https://example.org/invoice/{{integer}}" -f 1000 -t 1100
```

Five requests run in parallel by default, silent endpoints are skipped, and the exit code tells a script whether anything was found.

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
is-responding --help
```

```text
Usage: is-responding -u <url with {{integer}}> [options]

Options:
  --version          Show version number                               [boolean]
  --url, -u          URL with {{parameter}}                           [required]
  --from, -f         Value the enumeration starts at                [default: 0]
  --to, -t           Value the enumeration ends at                 [default: 10]
  --pad, -p          Pad values with leading zeros, 3 gives 007     [default: 0]
  --concurrency, -c  Requests kept in flight at once                [default: 5]
  --timeout          Milliseconds before a request is abandoned [default: 10000]
  --verbose, -v      Display endpoints which refused
  --help             Show help                                         [boolean]

Examples:
  Scan a range of ids
    is-responding -u "https://example.org/invoice/{{integer}}" -f 1000 -t 1100

  Show why endpoints were skipped
    is-responding -u "https://example.org/{{integer}}" -f 1 -t 50 --verbose

  Fixed-width numbers, so 7 becomes 007
    is-responding -u "https://example.org/photo/{{integer}}.jpg" -t 999 --pad 3

  Scan a wide range faster
    is-responding -u "https://example.org/{{integer}}" -t 5000 --concurrency 25

  Keep the output in range order
    is-responding -u "https://example.org/{{integer}}" -t 100 --concurrency 1

Exit codes:
  0  at least one endpoint responded
  1  nothing responded, or the arguments were invalid
```

## Options

| Option | Short | Default | Meaning |
| --- | --- | --- | --- |
| `--url` | `-u` | - | URL template containing at least one `{{integer}}`. Required. |
| `--from` | `-f` | `0` | First value of the range, inclusive. May be negative. |
| `--to` | `-t` | `10` | Last value of the range, inclusive. |
| `--pad` | `-p` | `0` | Width to pad values to with leading zeros. `0` disables padding. |
| `--concurrency` | `-c` | `5` | How many requests may be in flight at the same time. |
| `--timeout` | - | `10000` | Milliseconds before a single request is given up on. |
| `--verbose` | `-v` | off | Also print the endpoints that refused, with the reason. |

Every numeric option must be a whole number, and the run stops with exit code `1` if one is not.

## Usage

### Placeholders

A placeholder is written as `{{type}}` - double curly braces around a **supported type name**.

| Placeholder   | Meaning                                       | Supported |
| ------------- | --------------------------------------------- | --------- |
| `{{integer}}` | Every whole number from `--from` up to `--to` | ✅ Yes    |

<!-- prettier-ignore-start -->

> [!IMPORTANT]
> `integer` is currently the **only** supported type, and the placeholder must be the type name itself. Invented names like `{{id}}`, `{{page}}` or `{{user}}` are rejected - the tool prints `"id" is not supported` and exits with code `1`.

<!-- prettier-ignore-end -->

A URL without any placeholder is rejected as well, because there would be nothing to enumerate. So is a template that is not a valid `http`/`https` address once the placeholders are filled.

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

### Parallel requests

Five requests are kept in flight at once. Each worker takes the next address as soon as its own finishes, so one slow endpoint holds up a single slot instead of the whole run.

```bash
is-responding -u "https://example.org/{{integer}}" -f 1 -t 500 --concurrency 20
```

Raise it to finish sooner, lower it to go easy on the service. `--concurrency 1` sends one request at a time, which keeps the output in range order.

<!-- prettier-ignore-start -->

> [!NOTE]
> Results are printed as they arrive, so with parallel requests the order does not follow the range. Use `--concurrency 1` when you want the output sorted.

<!-- prettier-ignore-end -->

### Reading the output

While the scan runs, a progress bar tracks how far it has got. It lives on a single line and is wiped when the run ends, so it never pollutes the results.

```text
  ████████████░░░░░░░░░░░░ 4/8 (50%)
```

Every line that survives is a finding, which keeps the output greppable and safe to redirect.

| Line               | Meaning                                                 |
| ------------------ | ------------------------------------------------------- |
| `✓ 200  <url>`     | The endpoint answered, with the status it returned      |
| `✗ <reason> <url>` | The endpoint refused or timed out, shown only with `-v` |

The run closes with a summary: how many endpoints were checked, how long it took, the throughput, the split between responding and silent, and how often each status came back.

```text
Checked 8 endpoints in 1.9s (4.1/s)
Found 6 responding, 2 silent

Status breakdown:
  no response  2
  200          1
  201          1
  202          1
```

Durations are rendered as `842ms` below a second, `2.4s` below a minute and `1m 35s` above. `no response` covers the endpoints that never produced a status at all, such as a connection reset or a timeout.

The bar and the summary are written only when the output is a terminal; a redirected run emits the result lines and nothing else.

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

`--from` and `--to` are inclusive and may be negative. `--from` must not be greater than `--to`.

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

### ➡️ Use case: Find the live endpoints in a range

```bash
is-responding -u "https://httpbin.org/status/{{integer}}" -f 198 -t 205
```

```text
Scanning 8 endpoints with 5 parallel requests
✓ 200  https://httpbin.org/status/200
✓ 201  https://httpbin.org/status/201
✓ 202  https://httpbin.org/status/202
✓ 203  https://httpbin.org/status/203
✓ 204  https://httpbin.org/status/204
✓ 205  https://httpbin.org/status/205

Checked 8 endpoints in 1.9s (4.1/s)
Found 6 responding, 2 silent

Status breakdown:
  no response  2
  200          1
  201          1
  202          1
  203          1
  204          1
  205          1
```

### ➡️ Use case: See why endpoints were skipped

Without `--verbose` a silent endpoint leaves no trace. Add `-v` to print the misses too, with the reason each one gave.

```bash
is-responding -u "https://httpbin.org/status/{{integer}}" -f 198 -t 201 -v
```

```text
Scanning 4 endpoints with 5 parallel requests
✗ socket hang up  https://httpbin.org/status/199
✗ socket hang up  https://httpbin.org/status/198
✓ 200  https://httpbin.org/status/200
✓ 201  https://httpbin.org/status/201

Checked 4 endpoints in 748ms (5.3/s)
Found 2 responding, 2 silent

Status breakdown:
  no response  2
  200          1
  201          1
```

### ➡️ Use case: Scan a wide range quickly

```bash
is-responding -u "https://example.org/{{integer}}" -f 1 -t 5000 --concurrency 25
```

### ➡️ Use case: Give up on slow endpoints faster

```bash
is-responding -u "https://example.org/{{integer}}" --timeout 2000
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
  concurrency: 5,
});

console.log(result.responding); // ['https://example.org/7', ...]
console.log(result.checked); // 20
console.log(result.silent); // 19
console.log(result.elapsed); // 2417 (milliseconds)
console.log(result.statuses); // { '200': 1, 'no response': 19 }
```

`start()` resolves once every endpoint has been checked. It returns `{ responding, checked, silent, elapsed, statuses }`, or `null` when the URL template could not be enumerated.

## Related

- [makiwara](https://github.com/piecioshka/makiwara)

## License

[The MIT License](https://piecioshka.mit-license.org) @ 2026
