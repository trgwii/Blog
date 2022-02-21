---
author: Thomas
date: 2022-02-21
---

# Zig is my new favorite language

Zig looks like this:

```zig
const std = @import("std");

pub fn main() void {
    std.debug.print("Hello, World!", .{});
}
```

Zig also has things like this:

```zig
const std = @import("std");
const builtin = @import("builtin");

const isWindows = builtin.os.tag == std.Target.Os.Tag.windows;
const isLinux = builtin.os.tag == std.Target.Os.Tag.linux;

pub inline fn exit(code: u8) noreturn {
    if (isLinux) std.os.linux.exit(code);
    if (isWindows) std.os.windows.kernel32.ExitProcess(code);
}
```

In this case the booleans are computed at compile time, and as a result so are
the if statements inside the exit function. This is not done by an optimizer,
but as a result of the compile-time semantics of the language.

This magically turns Zig into an extremely powerful competitor to C-like
lowlevel languages that rely on preprocessors to make compile-time decisions.
