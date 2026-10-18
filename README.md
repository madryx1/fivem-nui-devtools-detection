# FiveM NUI DevTools detection (works on CEF 144)

Cfx is moving FiveM and RedM from CEF 103 to CEF 144. If your anti devtools script or nui blocker stopped catching people who open `nui_devtools`, this is why.

This repo has a detection that still works on the new CEF, the reason the old one broke, and a test script so you can check any detection yourself.

## The old trick

The most starred "nui blocker" resources on GitHub use this, or something very close to it:

```js
const obj = Object.defineProperties(new Error(), {
    message: { get() { /* report */ } },
    toString: { value() { return '' } }
})
console.log(obj)
```

When DevTools is open, the console builds a text preview for every logged `Error`, and to build that preview it used to read `message`. Reading `message` runs your getter, so you know DevTools is open.

## What changed

In May 2025 V8 landed [`e08e973` "[inspector] Prevent side effects during error preview"](https://github.com/v8/v8/commit/e08e97347454255a337dcea361808fb25ca09077). Since then, when the inspector builds the description of an `Error`, it looks at the **own** property descriptor of `message`, `name` and `stack`. If it finds a getter that isn't a built-in one, it skips it. Your getter never runs and nobody gets caught.

It shipped in Chrome 138. CEF 103 is from mid 2022, so FiveM never had this change. CEF 144 has it.

## The fix

The check only looks at own properties. If the object has no own `message`, V8 falls back to a normal property read, which walks the prototype chain and runs whatever getter it finds there. So move the getter one level up:

```js
const trap = Object.setPrototypeOf(new Error(), Object.create(Error.prototype, {
    message: { get() { /* report */ return '' } },
    toString: { value() { return '' } }
}))
console.log(trap)
```

If you already run one of the public blockers, that's the whole change: `Object.defineProperties(new Error(), { ... })` becomes `Object.setPrototypeOf(new Error(), Object.create(Error.prototype, { ... }))`.

Keep the `toString` override. Without it the getter fires on every `console.log`, DevTools open or not, and you kick everyone (see the table). And make it return a string: if it returns nothing, the console prints `undefined` and anyone looking at it can tell something is there.

It also works when DevTools is opened later, like `nui_devtools` in game: the console replays old messages when it attaches, and the getter runs at that point.

## Test results

Each page was opened in Chrome for Testing, once with DevTools closed and once with `--auto-open-devtools-for-tabs`. The number is how many times the page reported DevTools. Anything above 0 with DevTools closed means it would kick normal players.

Cells are "DevTools closed / DevTools open".

| Chrome | `old_own_getter` | `prototype_getter` | `prototype_getter_no_tostring` | `profile_timing` | `profile_label_tostring` |
|---|---|---|---|---|---|
| 113 | 0 / 1 | 0 / 1 | 1 / 2 | 0 / 85 | 16 / 16 |
| 120 | 0 / 1 | 0 / 1 | 1 / 2 | 0 / 78 | 16 / 16 |
| 125 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 25 | 16 / 16 |
| 130 | 0 / 1 | 0 / 1 | 1 / 2 | 0 / 85 | 16 / 16 |
| 135 | 0 / 1 | 0 / 1 | 1 / 2 | 0 / 85 | 16 / 16 |
| 138 | 0 / 0 | 0 / 1 | 1 / 2 | 0 / 85 | 16 / 16 |
| 140 | 0 / 0 | 0 / 1 | 1 / 2 | 0 / 85 | 16 / 16 |
| 141 | 0 / 0 | 0 / 1 | 1 / 2 | 0 / 85 | 16 / 16 |
| 142 | 0 / 0 | 0 / 1 | 1 / 2 | 0 / 85 | 16 / 16 |
| 143 | 0 / 0 | 0 / 1 | 1 / 2 | 0 / 85 | 16 / 16 |
| 144 | **0 / 0** | **0 / 1** | 1 / 2 | 0 / 85 | 16 / 16 |

CEF 144 is Chromium 144, so the 144 row is what your players get after the update. The old getter stops at 138, the version that got the V8 change. 125 is odd: DevTools opened (the timing check fired) but neither getter ran, in three separate runs. FiveM goes straight from 103 to 144, so it doesn't matter here.

Each column is a page in `test/pages`. `old_own_getter` is what the public blockers use, `prototype_getter` is the fix.

The `console.profile` ones in the public repos are worse than broken. Passing a function as the profile label calls its `toString` every time, with DevTools closed too, so in every Chrome we tested that check kicks everyone. The timing version (`console.profile()` + measuring how long it took) does still trigger, but it depends on how fast the PC is.

Run it yourself:

```
node test/run.mjs "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

On a Linux box without a screen, use `xvfb-run node test/run.mjs /path/to/chrome`. Chrome for Testing builds for any version are [here](https://googlechromelabs.github.io/chrome-for-testing/).

## The resource

`nui_devtools_guard` is a minimal resource with the fixed detection. Drop it in `resources` and add `ensure nui_devtools_guard` to your `server.cfg`.

By default it kicks. To only log:

```
set nui_devtools_guard_action log
```

To let staff open DevTools:

```
add_ace group.admin nui_devtools_guard.bypass allow
```

## Don't rely on it

Detecting DevTools is a speed bump. Anyone who knows what they're doing can block the request, kill the frame, or patch the getter before it runs. The real protection is on the server: don't trust anything that comes from NUI, check amounts, items and distances server side. Poggu wrote about this years ago and it still holds: [STOP blocking DevTools on your server](https://forum.cfx.re/t/stop-blocking-devtools-on-your-server-and-how-to-bypass-the-block/1979857).

Use this to make your UI code a bit harder to poke at, not as your anticheat.
