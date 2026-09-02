Output demo/is-responding.gif

Require is-responding

Set Shell "bash"
Set Framerate 60
Set FontSize 12
Set Width 800
Set Height 420
Set Padding 20
Set Margin 5
Set MarginFill "#212830"
Set BorderRadius 10

Hide
Type 'cd /tmp/is-responding-demo && clear' Enter
Show

Type "# walk an {{integer}} range and keep the endpoints that answer" Sleep 300ms Enter
Sleep 700ms

Type 'is-responding -u "https://httpbin.org/status/{{integer}}" -f 199 -t 203 -v' Sleep 400ms Enter
Wait Sleep 2500ms

Enter Type "# without -v only the live ones are printed" Sleep 300ms Enter
Sleep 700ms

Type 'is-responding -u "https://httpbin.org/status/{{integer}}" -f 199 -t 203' Sleep 400ms Enter
Wait Sleep 2500ms

Enter Type "# --pad 3 for services that want 007 instead of 7" Sleep 300ms Enter
Sleep 700ms

Type 'is-responding -u "https://httpbin.org/anything/{{integer}}" -f 6 -t 8 --pad 3' Sleep 400ms Enter
Wait Sleep 2500ms

Sleep 2s
