Output demo/is-responding.gif

Require is-responding

Set Shell "bash"
Set Framerate 60
Set FontSize 12
Set Width 840
Set Height 470
Set Padding 20
Set Margin 5
Set MarginFill "#212830"
Set BorderRadius 10

Hide
Type 'cd /tmp/is-responding-demo && clear' Enter
Show

Type "# walk a range of ids and keep the endpoints that answer" Sleep 300ms Enter
Sleep 600ms

Type 'is-responding -u "https://httpbin.org/status/{{integer}}" -f 198 -t 205 -v' Sleep 400ms Enter
Wait Sleep 3500ms

Sleep 2s
