# The Emoji World — worldbuilding bible

> Zootopia is an animal world. Toy Story is a toy world. Wreck-It Ralph is an arcade world.
> **emojify is an emoji world** — designed from the emoji's point of view.

## 1. Research base (how the pros do it)

| Source | Principle we adopt |
|---|---|
| Zootopia production design (David Goetz / Matthias Lechner) | Design **from the inhabitant's POV**: walk the city as an animal first. Ask habit questions ("where do they sleep? how do they commute?"). Districts come from real-city logic. Infrastructure must serve **all size classes** (their mice-to-giraffes problem). |
| Mark J.P. Wolf, *Building Imaginary Worlds* | Secondary worlds need **invention** (changed defaults), **completeness** (seemingly unnecessary details — that's what makes it feel real), **consistency** (one rule system, never broken). |
| Environmental storytelling (Worch & Smith, GDC) | Stage props so they imply **events**: a tipped cart asks "what happened here?" — the player's mind writes the story. |
| Disney Imagineering | One **weenie** (visible landmark) per district pulls you across the map; **forced perspective & scale discipline**; every detail serves the story ("art of the show"). |
| *A Short Hike* postmortem (GDC 2020) | Tiny open worlds navigate by **landmark readability**, not waypoints. |
| Animal Crossing villager system | Personality is **systematic**: 8 archetypes drive dialogue/behavior — not bespoke characters. Archetype × subtype = variety from few rules. |
| Messenger (abeto, SOTY 2025) | 7 zones, no compass, NPC speech bubbles, secrets reward wandering, per-zone soundscapes, 10-player calm cap. |

## 2. The world's rules (invention — never break these)

1. **Emoji are beings of communication.** Their economy is messages; their crops are words;
   their religion is resonance (同频). Everything they build serves expression.
2. **Emoji travel by the media that carry them in our world**: paper planes, envelopes,
   balloons, bubbles. Mail IS transit. (A letter isn't cargo — it's a passenger.)
3. **A flat glyph appears only where a glyph belongs**: in a speech bubble, on a sign,
   on a screen. Everything else is built, 3D, by emoji hands.
4. **Scale classes (Zootopia rule)**: citizens come in sizes (a 🐤 is small, a 🦖 is big);
   civic buildings are 2-3× citizen height; each district has ONE weenie landmark
   visible from across the planet.
5. **The planet is small and honest** — curvature is always visible, walking anywhere
   takes under a minute, roads connect every district to the plaza.

## 3. Society systems

### Personality (Animal Crossing model — 4 archetypes, cycled across residents)
| Archetype | Behavior |
|---|---|
| **peppy 高频** | fast wander, big bouncy hop, greets from far away |
| **lazy 慢热** | slow, takes naps mid-walk (daydream bubble), greets late |
| **cranky 高冷** | dodges you on approach, small greet radius — but they DO greet, eventually |
| **curious 好奇** | trails behind you for a while instead of minding their route |

Size class is independent of personality (small/medium/large per resident).

### Transport (implemented / planned)
- ✅ Air mail planes & shooting-star comets (sky traffic)
- ✅ Mail cart trundling the road between plaza and a district (wheels really roll)
- ✅ Hot-air balloon you can RIDE — one scenic lap over the whole country, then home
- ⏳ Paper-plane glider; snail local bus; envelope ferry on the shore

### Play systems (the verbs)
- ✅ Lost mail / loose coins: 8 collectibles per planet (roads, landmarks, one on the
  wild far side); persistent counter
- ✅ The runaway letter (bureau): a wind-blown chase toy — sprints near you, tires first
- ✅ The Circuit (arcade): arch → 3 star checkpoints → arch, timed, best persists
- ✅ Air-mail deliveries (3 per planet) → hands the fiction to the Cipher Office
- ✅ Secrets ×3, ❓ bump blocks, the wishing well that answers
- ⏳ Sheep herding into the pen; Simon-says moon tiles at the shrine; daily word-of-the-day
  from the well; friendship levels with named residents

### Communication infrastructure
- ✅ Speech bubbles (greeting), sealed letters (quests), bulletin board with pinned notes
- ⏳ Shout-tower that broadcasts bubbles across a district; laundry-line of hanging letters

### Environmental storytelling beats
- ✅ Tipped mail crate, letters spilled across the road (bureau) / spilled coin crate (arcade)
- ✅ Chimney smoke from cottages (someone is home)
- ⏳ Queue of residents at the post office counter; footprints leading to a secret

## 4. Per-planet identity
| | Translation Bureau | Field Games |
|---|---|---|
| planet size | R=26 (pastoral, wide) | R=23 (toy-box, tighter curvature) |
| weenies | post office · moon shrine | arcade cabinet · summit trophy |
| transport | mail cart + red balloon + planes | coin cart + violet balloon + comets |
| palette | cream/honey/terracotta | saturated lawn + golden sand + snow cap |

## 5. Backlog (next sprints)
- Named residents + friendship memory (AC model: repeated greets escalate)
- Resident daily routines (morning at plaza, evening at shrine — crepuscular logic per Zootopia)
- Rideable paper plane (transport as toy)
- District soundscapes per zone (Messenger model) — currently one bed per planet
- Player presence traces (footprints persist a session — environmental storytelling by players)
