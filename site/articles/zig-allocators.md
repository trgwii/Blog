---
author: Thomas
date: 2023-03-24
---

# Zig allocators (WIP)

_This article is not done, sections might be missing, please be patient_

This article will attempt to explain the way most of the useful allocators in
the Zig standard library work.

In Zig, allocators are explicit and ubiquitous. This means that in order to
allocate anything, you have to know roughly how they work and how to use them.
If you don't care about the details and just want to get going, you should do
use [GPA](#generalpurposeallocator):

```zig
const std = @import("std");

pub fn main() !void {
	var gpa = std.heap.GeneralPurposeAllocator(.{}){};
	defer std.debug.assert(!gpa.deinit());
	const allocator = gpa.allocator();

	// Pass allocator to functions that want one
}
```

Another, possibly even better option for you can also be an
[Arena allocator](#arenaallocator). That looks like this:

```zig
const std = @import("std");
	var arena = std.heap.ArenaAllocator(std.heap.page_allocator);
	defer arena.deinit();
	const allocator = arena.allocator();

	// Pass allocator to functions that want one
}
```

The main utility of this allocator is with short-running programs or functions.
This allocator does not generally free any memory until at the very end (when
you call `arena.deinit()`). In exchange for this lack of ability, you get much
faster allocations, and much less allocator state.

However, if you do want to know more about when to pick which allocator, what
their differences are, and how to implement your own allocator, you can continue
reading.

## Preface

In order to properly explain Zig allocators and how to use them, we will need to
first explain a couple of details about how memory works, if you're comfortable
with manual memory management, you can [skip this part](#zig).

But before we even do that, we should explain what we mean by allocation
conceptually.

### What is allocation?

### Memory pages

The first important detail to know about memory, is that your operating system
actually doesn't let you just ask for memory of any size. Operating systems
organize memory into "pages", and pages may vary in size (but they usually
don't, the page size on your system is most likely 4096 bytes). There are some
articles that advocate the use of larger pages (2MB or even 1GB), but for the
purposes of this article we won't focus on large pages.

Resources on large pages:

- https://easyperf.net/blog/2022/09/01/Utilizing-Huge-Pages-For-Code
- https://rigtorp.se/hugepages/
- https://mazzo.li/posts/check-huge-page.html
- https://pointersgonewild.com/2023/03/12/memory-pages-mmap-and-linear-address-spaces/
- https://www.evanjones.ca/hugepages-are-a-good-idea.html

### Memory alignment

Alignment is in simple terms the concept that certain datatypes should sit
within addresses that are divisible by a certain minimum size, for example
`u64`'s should sit in addresses divisible by 8.

The reason for this is that CPU's can optimize better when there are more
constraints on where in memory words (TODO: ALT TEXT: explain words) can be, and
many CPU's will simply not work with misaligned data at all. This is also why
padding exists inside C structs.

```
Good:
[------][------][------][------]
[------][------][------][------]
^       ^       ^       ^
0       8      16      32

Bad:
[------][------][------][------]
 [------][------][------][------]
 ^       ^       ^       ^
 1       9      17      33
```

### CPU cachelines

You might have seen code like the following Zig or C:

```zig
var x: *u8 = ...;
std.debug.print("{}\n", .{ x.* });
```

```c
char *x = ...;
printf("%d\n", *x);
```

This code will effectively load a single byte from memory. But this is only a
half-truth, because CPU's are actually incapable of loading only one byte. For
every load from main memory, CPU's generally have to load 64 consecutive bytes
(8x u64's). After that, the entire 64 bytes are cached in L1, L2, L3 caches,
subsequent loads then consult the cache before resorting to loading from main
memory. Cache lines also generally exist on 64-byte alignments, so addresses
0..64, 64..128, etc would each be their own cachelines.

### Memory locality and prefetching

TODO: Maybe cut this?

## Zig

...

### FixedBufferAllocator

### ArenaAllocator

### LoggingAllocator

### PageAllocator

### GeneralPurposeAllocator

### CAllocator

### StackFallbackAllocator

## Making your own allocator
