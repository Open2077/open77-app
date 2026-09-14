# Vectors and quaternions

`vector2`, `vector3`, `vector4`, `vec` and `quat` are global constructors in **both** Lua
runtimes -- the client VM and the dedicated server VM. They give you arithmetic, `#` for
magnitude, swizzles, distance helpers and a quaternion, so the FiveM idiom

```lua
if #(playerPos - jobPos) < 3.0 then
    -- in range
end
```

works here exactly as it reads.

## Plain tables still work. Everywhere. Forever.

This is the guarantee to read first, because it is what the design is built around.

**A vector *is* a plain Lua table carrying `x`, `y`, `z` (and `w`) as real fields.** The only
thing a constructor adds is a shared metatable. Nothing about the table changed:

```lua
local v = vector3(1, 2, 3)
type(v)            --> "table"
rawget(v, "x")     --> 1
for k in pairs(v) do print(k) end   --> x, y, z
```

Three consequences, all of them deliberate:

- Every API that accepts a `{ x =, y =, z = }` table today accepts a vector, with no change to
  the API and no change at the call site. The client's native position readers and the
  server's `type(p.x) == "number"` guards never had to learn a new type, because there is no
  new type to learn -- only new behaviour on a familiar one.
- Every API that returns a position **still returns a plain table**. Nothing about a return
  shape changed in this wave; changing one would break every resource reading `pos.x`. Wrap it
  when you want the maths: `vector3(pos)`, or `vec(pos)`.
- Serialisation is unchanged too, so `json.encode`, net events and exports carry a vector as
  the object it always was. See [JSON and the network](#json-and-the-network).

Mixing the two freely is the expected style:

```lua
local here = Open77.character.position()      -- a plain table, as always
local there = vector3(1660.0, -723.6, 50.5)
local metres = #(there - here)                -- one vector operand is enough
```

## Constructors

| Call | Result |
|---|---|
| `vector2(x, y)` | a 2D vector |
| `vector3(x, y, z)` | a 3D vector |
| `vector4(x, y, z, w)` | a 4D vector |
| `vec(...)` | dispatches on the argument count: 2, 3 or 4 numbers |
| `quat(x, y, z, w)` | a quaternion |

Every constructor also accepts **one table** -- another vector, or any `{ x =, y =, z = }`
table -- and copies it:

```lua
vector3({ x = 1, y = 2, z = 3 })     --> vector3(1.0, 2.0, 3.0)
vector3(someVector4)                 --> takes x, y, z
vec(Open77.character.position())      --> a vector3, because the table has three axes
```

`vec` with a single table picks the size from the axes that are actually there: `w` present
means `vector4`, else `z` means `vector3`, else `y` means `vector2`.

Components must be finite numbers. A constructor that cannot build a vector returns
`nil, reason` -- never a half-built value:

```lua
local v, reason = vector3(1, 2)          --> nil, "invalid_vector"
local q, reason = quat(1, 2, 3)          --> nil, "invalid_quat"
```

## Fields and swizzles

`v.x`, `v.y`, `v.z` and `v.w` are ordinary field reads with no metamethod in the way.

Any combination of two to four axes the vector actually has is a swizzle, returning the
vector of that size:

```lua
local v = vector4(1, 2, 3, 4)
v.xy      --> vector2(1.0, 2.0)
v.xz      --> vector2(1.0, 3.0)
v.yz      --> vector2(2.0, 3.0)
v.xyz     --> vector3(1.0, 2.0, 3.0)
v.zyx     --> vector3(3.0, 2.0, 1.0)
vector3(1, 2, 3).xw   --> nil, there is no w
```

### Read-only, with one honest exception

A vector is a **value**. Assigning any key raises:

```lua
local v = vector3(1, 2, 3)
v.label = "spawn"   -- error: Open77 vectors are read-only (tried to set 'label')
```

**The exception is the component keys themselves.** `v.x = 9` succeeds, silently, and there is
no way to stop it: Lua 5.4 only calls `__newindex` for a key that is *absent* from the table,
and `x`, `y`, `z` and `w` must be physically present or every existing reader -- `json.encode`,
net-event serialisation, `pairs`, `rawget`, the native C++ and C# position parsers -- would
stop seeing a vector as the table it has always accepted. That compatibility was worth more
than the guard, so the guard is documented rather than faked.

Treat components as immutable anyway. To change one, build a new vector:

```lua
local raised = vector3(v.x, v.y, v.z + 1.0)
```

`v:table()` gives you a fresh, ordinary, mutable copy when you want one.

## Operators

| Operator | Meaning |
|---|---|
| `a + b`, `a - b` | component-wise; a number broadcasts to every component |
| `a * b`, `a / b` | component-wise by a vector, or scaled by a number |
| `-a` | negation |
| `#a` | magnitude (`a:length()`) |
| `a == b` | exact, and only between two Open77 values of the same kind |
| `a .. b`, `tostring(a)` | `vector3(1.0, 2.0, 3.0)` |

The other operand of an arithmetic operator may be a vector, a plain `{ x =, y =, z = }` table,
or a number:

```lua
vector3(1, 2, 3) + vector3(4, 5, 6)          --> vector3(5.0, 7.0, 9.0)
vector3(1, 2, 3) + { x = 1, y = 1, z = 1 }   --> vector3(2.0, 3.0, 4.0)
vector3(1, 2, 3) * 2                         --> vector3(2.0, 4.0, 6.0)
{ x = 1, y = 1, z = 1 } + vector3(1, 2, 3)   --> vector3(2.0, 3.0, 4.0)
```

**Operators raise; functions return `nil, reason`.** An operator has no second return slot, so
yielding a silent `nil` from `a + b` would hide the bug instead of naming it. Mixing
dimensions, handing an operator something that is not a vector, and producing a non-finite
component all raise:

```lua
vector2(1, 2) + vector3(1, 2, 3)  -- error: vector addition between a vector2 and a vector3
vector3(1, 2, 3) + "text"         -- error: vector addition requires a vector, ... or a number
```

`==` is exact and kind-aware. `vector3(1, 2, 3) == vector3(1.0, 2.0, 3.0)` is true (Lua numbers
compare by value), while `vector3(1, 2, 3) == { x = 1, y = 2, z = 3 }` is **false**: a plain
table has no kind, and guessing one would make `==` depend on which keys a table happens to
carry. Compare components, or wrap the table first.

`quat` deliberately has **no** arithmetic and no `#`. It has three methods and nothing more.

## Methods

Every method that takes another vector also accepts a plain `{ x =, y =, z = }` table.

| Method | Returns |
|---|---|
| `v:length()` | magnitude; same as `#v` |
| `v:lengthSquared()` | magnitude squared -- the one to compare against a squared radius |
| `v:distance(other)` | distance to `other` |
| `v:distanceSquared(other)` | squared distance |
| `v:normalize()` | unit vector; **a zero vector normalises to zero, never to NaN** |
| `v:dot(other)` | dot product |
| `v:cross(other)` | cross product, `vector3` only; otherwise `nil, "cross_requires_vector3"` |
| `v:lerp(other, t)` | linear interpolation, **unclamped** -- `t` outside `0..1` extrapolates |
| `v:unpack()` | the components as multiple return values |
| `v:table()` | a fresh, plain, mutable `{ x =, y =, z = }` table |

```lua
local distance = playerPos:distance(target)          --> number
local nearby = vector3(playerPos):lengthSquared() < 25.0
local nothing, reason = vector3(1, 2, 3):dot(42)     --> nil, "invalid_vector"
```

### Quaternions

`quat` exists because the codebase already hands `{ x =, y =, z =, w = }` orientations to
`Open77.effects` and `Open77.props`. It makes that table computable and stops there.

| Method | Returns |
|---|---|
| `q:normalize()` | unit quaternion; a **zero** quaternion normalises to the identity `(0, 0, 0, 1)` |
| `q:mul(other)` | Hamilton product: this rotation followed by `other` |
| `q:rotate(v)` | a `vector3` rotated by `q`; assumes `q` is unit, so `normalize()` first when unsure |

```lua
local spin = quat(0, 0, 1, 0)                 -- half turn about Z
spin:rotate(vector3(1, 0, 0))                 --> vector3(-1.0, 0.0, 0.0)
Open77.effects.create({ effect = "fire.small", position = vector3(7, 8, 9), orientation = spin })
```

## JSON and the network

Because a vector is a table with real `x`, `y`, `z` fields, it serialises as the JSON object it
looks like, with no extra members:

```lua
json.encode(vector3(1, 2, 3))     --> {"x":1,"y":2,"z":3}
```

Member **order** is whatever the encoder's table walk produces, as for any Lua table; only the
members and their values are guaranteed. Nested vectors serialise the same way, so a table of
waypoints encodes correctly with nothing special at the call site.

The same reader serves `json.encode`, network events and cross-resource exports. So a vector
sent over the wire arrives on the other side as a **plain table**, not a vector -- the
metatable does not cross the network, and no other runtime's values ever do. That is correct
and intentional; wrap it on arrival when you want the maths back:

```lua
RegisterNetEvent("job:waypoint", function(point)
    local target = vector3(point)     -- point arrived as { x =, y =, z = }
    if #(Open77.character.position() - target) < 5.0 then ... end
end)
```

## One implementation, two runtimes

The type is written once, in Lua, in `scripting/lua/open77_vector.lua`. The client embeds that
file as a C++ string literal generated at configure time; the dedicated server embeds the very
same file as an assembly resource. There is no second copy to drift.

Both runtimes prove it the same way: `scripting/lua/open77_vector_parity.lua` runs on each and
its transcript is compared against one shared golden file,
`scripting/lua/open77_vector_parity.expected.txt`. A semantic difference between client and
server can only appear as a failing test.

Every metatable is protected with `__metatable`, so `setmetatable` on a vector raises and
`getmetatable` hands back only the kind tag (`"Open77.vector3"`), never the metatable itself.
That matters on the server, where those two globals are not sandboxed away as they are on the
client.

## Failure vocabulary

| Reason | Meaning |
|---|---|
| `invalid_vector` | the argument was not a vector, nor a table with that many finite numeric axes |
| `invalid_quat` | same, for `quat` |
| `invalid_argument` | `lerp` was given a non-finite `t` |
| `cross_requires_vector3` | `cross` was called on a `vector2` or `vector4` |
