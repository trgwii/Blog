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

However, if you do want to know more about when to pick which allocator, what
their differences are, and how to implement your own allocator, you can continue
reading.

## Preface

In order to properly explain Zig allocators and how to use them, we will need to
first explain a couple of details about how memory works, if you're comfortable
with manual memory management, you can [skip this part](#zig).

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

- [ ] TODO: Find the "Use large pages for your next project" article / blog post

### Memory alignment

Alignment is in simple terms the concept that certain datatypes should sit
within addresses that are divisible by a certain minimum size, for example
`u64`'s should sit in addresses divisible by 8.

```
Good:
[------][------][------][------]
^       ^       ^       ^
0       8      16      32

Bad:
 [------][------][------][------]
 ^       ^       ^       ^
 1       9      17      33
```

### Memory locality and prefetching

## Zig

### FixedBufferAllocator

### ArenaAllocator

### LoggingAllocator

### PageAllocator

### GeneralPurposeAllocator

### CAllocator

### StackFallbackAllocator
