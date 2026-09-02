Output demo/is-responding.gif

Require is-responding

Set Shell "bash"
Set Framerate 12
Set FontSize 12
Set Width 840
Set Height 440
Set Padding 20
Set Margin 5
Set MarginFill "#212830"
Set BorderRadius 10

Hide
Type 'cd /tmp/is-responding-demo && clear' Enter
Show

Type "# find the endpoints that answer, in a range of ids" Sleep 300ms Enter
Sleep 500ms

Type 'is-responding -u "https://httpbin.org/status/{{integer}}" -f 199 -t 204 -v' Sleep 300ms Enter
Wait Sleep 1800ms

Enter Type "# Ctrl+C stops early and still reports what it found" Sleep 300ms Enter
Sleep 500ms

Type 'is-responding -u "https://httpbin.org/status/{{integer}}" -f 200 -t 260' Sleep 300ms Enter
Sleep 1800ms
Ctrl+C
Wait Sleep 1800ms

Sleep 1200ms
