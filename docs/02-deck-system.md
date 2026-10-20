# Phases 2 to 4. Deck system, hero cards and prototype

**A Tale of Two Cities** · decisions taken after Phase 1 review

| Decision | Choice |
|---|---|
| Direction | **The Seam.** One shared line per card, with the hidden sentence on it |
| Colour | **Full colour**, as seven spot inks on ivory stock (see palette) |
| Motion | **Every mirror moves.** Animated SVG on screen, lenticular seam band in print |
| Hero card 5 | **St. Mark's Road × St. Marks Place** replaces Church Street × Bleecker |
| Auto × cab line | Rewritten. See *Local accuracy* below |

The working prototype is `prototype/index.html`, and the exported card files are in `prototype/svg/`.

---

## Local accuracy

Every pairing now has to pass one test.

> Would a resident of each city nod, without needing it explained?

**The Brooklyn question.** You were right to push on this one. "Cabs won't go to Brooklyn" was a real New York complaint, but it belongs to the 1990s and 2000s. Cabs go to Brooklyn now, and a younger New Yorker would read the line as a period joke. "Autos won't go to Whitefield" is still accurate today. The two halves were true in different decades, so the pairing failed.

**The replacement** holds in both cities right now. The moment it rains at rush hour, every ride in town is suddenly going somewhere else. Autos refuse or ask for "meter plus fifty". Yellow cabs vanish, and the ones you do see have their roof lights off. (Since 2013, a lit roof number means available and a dark light means not. There's no separate off-duty light any more.)

*The minute it rains, / everyone is going the other way.*

On this card the rotation makes the line literal, because the auto and the cab really are always going the other way.

**Facts checked for the hero cards**

- Bangalore autos have a yellow hood with either a green body (LPG-era) or a black one. The card uses green.
- NYC roof lights: lit = available, dark = unavailable (TLC rule, 2013).
- Kannada signage on the cards reads ಕಾಫಿ (coffee), ಇಡ್ಲಿ · ವಡೆ (idli, vade) and ದೋಸೆ (dose). Bangalore boards are required to carry Kannada.
- Darshinis are self-service and standing, tube-lit, with steel counters and coffee served in a tumbler and davara.
- Each Central Park lamp post has a four-digit plate giving the nearest cross street, so 7203 means 72nd Street.
- Diner mugs are heavy white restaurant ware with a green band.
- Bangalore's signature storm comes at 4 PM in April and May, before the monsoon proper.
- St. Mark's Road and St. Marks Place are both real, and both are named for the same saint. The Manhattan street is East 8th Street between Third Avenue and Avenue A.
- Still to verify before that pairing goes ahead: whether Namma Metro still issues plastic tokens.

**Pairings dropped for accuracy or staleness:** cab refusals to Brooklyn (dated), and NYC broker fees (tenants mostly stopped paying them under the 2025 FARE Act, so the joke has expired).

---

## The system

### Suits as four parts of city life

| Suit | Theme | What belongs here |
|---|---|---|
| ♥ Hearts | Belonging | Rituals, regulars, people who know your order |
| ♦ Diamonds | Ambition | Work, money, early starts, getting somewhere |
| ♣ Clubs | Streets | Commutes, corners, food, small daily annoyances |
| ♠ Spades | Weather and time | Seasons, arrivals, leaving, growing up |

### Ranks keep time

Lay a suit out from 2 to 10 and you get one day. Every card's caption gives the same local hour in both cities.

| 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|
| 6 AM | 8 AM | 10 AM | Noon | 2 PM | 4 PM | 6 PM | 8 PM | 11 PM |

Aces are origins, where the city (or that part of life) began. Jacks are the restless ones, the people who keep the city moving. Queens are what the city loves. Kings are the contradiction, the thing both cities complain about and never fix. And the Jokers are the person, with no mirror and no rotation.

### Visual grammar

- **Grid.** 250 × 350 units (1 unit = 0.01 in), so the card is exactly 2.5 × 3.5 in. The bleed version is 2.75 × 3.75 in.
- **Halves.** Each city gets an art window. The New York half is the Bangalore half's template rotated 180° about the card centre, so the symmetry is exact by construction.
- **Seam band.** A 0.16 in strip across the centre that both halves stand on. Depending on the card it's a road, a counter, a path, a doorstep or a pavement. The vermilion centre line is the shared line.
- **Hidden sentence.** Micro small caps on the band. The first clause reads upright from Bangalore's side, top left, and the second only reads once the card is turned, bottom right. Dotted leaders fill the rest of each row, so from arm's length the sentence looks like ornament.
- **Indices.** Rank, pip and city code (BLR or NYC) in the left margin of each half.
- **Ornament.** Real coordinates run up the right margin of each half (12°58′N · 77°35′E and 40°42′N · 74°00′W). Each half also has a caption cartouche with the place and the hour, and vermilion four-point stars sit in the corners.
- **Frame.** A double rule (0.7 + 0.22) with rounded corners.

### Typography

| Role | Face | Use |
|---|---|---|
| Display | Bodoni Moda | Ranks, Joker letters, titles |
| Micro | Cormorant Garamond, 600–700 | The seam sentence, captions, coordinates |
| Signage | Archivo Narrow | NYC street signs, diner boards, the taxi |
| Kannada | Noto Sans Kannada | Bangalore boards |

All text is outlined before print.

### Palette

Seven spot inks on ivory stock.

| Ink | Hex | Job |
|---|---|---|
| Ivory stock | `#F4ECDC` | Paper |
| Indigo black | `#1E2233` | Line, night |
| Kumkum | `#D9412B` | Red suits, the seam, brick, tile |
| Marigold | `#F2B330` | Shared by the auto's hood and the cab. Lamplight |
| Canopy | `#2E7D5B` | Trees, the auto's body, street signs |
| Monsoon | `#3B6EA8` | Rain, dusk, glass |
| Neon | `#E58A9B` | Diner neon, tabebuia blossom |
| Kaapi | `#7A4528` | Coffee, brownstone, wood |

Tints come from ink opacity, as in a halftone. There are no gradients.

### Motion

On screen, each card is a short film that loops. Four rules keep the films consistent.

1. **Every loop joins up.** Each card runs on one loop (12 seconds, 24 for the park, 8 for the Jokers). Everything that moves repeats a whole number of times inside it, so you never see the film restart.
2. **Motion respects the rotation.** Both halves run the same animation in their own frame, so anything that moves in Bangalore moves the other way round in New York. The card stays rotationally symmetric in every frame of the loop as well as at rest.
3. **The centre is the key frame.** Every loop passes through its still pose. That still is the printed card, and the "Print frame" button shows it.
4. **One story beat per card.** The rain starts and the cab light goes dark. The walker gets lapped. The tube light flickers. If something moves, it's telling the story.

### Sound

Turn sound on and the card on the stage plays its own soundtrack. There are no audio files. Everything is synthesised in the browser and reads the card's clock, so it stays in step with the picture: the auto's engine gets louder and pans left to right as it crosses the seam, the thunder comes a beat after the lightning, and the bell rings as the rings leave the cathedral dome. Pause the card and the sound fades out with it.

| Card | What you hear |
|---|---|
| 8♣ The Ride Home | Rain that comes and goes, the auto's two-stroke putter, the cab's tyres on a wet road, a horn from each, the click of the roof light |
| 2♥ Morning Walk | A koel calling higher each time, a robin, a pigeon, footsteps at two speeds, wind in the leaves |
| 3♥ The Usual | Steel tumblers, coffee being pulled, a room full of talk, the ceiling fan, a spoon on a mug, the order bell, the neon hum |
| 7♠ Four O'Clock | Heavy rain, drips off the eave, a crack and roll of thunder, winter wind, a radiator knocking |
| 10♣ Late on St Mark's | A cathedral bell, crickets, café talk, cars passing both ways, a bar's bass through the wall, a far-off siren |
| Jokers | The pour, a touch of steel, and a low drone on Sa and Pa. The Return adds one more note |

### Print

The seam band or the whole art window can be printed lenticular. Tilt the card in your hand and it plays a two- to four-frame version of the same motion: the auto and cab pass, the rain gets heavier, the windows light up. It's a standard collectible-card process. It does cost more per deck, so I'd save it for a numbered first edition.

---

## The full deck, 52 cards and two Jokers

Hero cards are marked ★.

| Card | Bangalore | New York | Hidden sentence |
|---|---|---|---|
| A♥ | Jagali katte, the stone seat by an old Basavanagudi door | Brooklyn stoop | *Every house needs a step / that belongs to the street.* |
| ★ 2♥ | Cubbon Park, 6 AM | Central Park, 6 AM | *Every loud city / needs somewhere to whisper.* |
| ★ 3♥ | Darshini, Jayanagar | Diner, Astoria | *You don't order anymore. / You just nod.* |
| 4♥ | The Sunday donne biryani queue | The Sunday bagel line | *Nobody queues for food. / Everybody queues for Sunday.* |
| 5♥ | Mallige strings sold by the arm's length | Bucket flowers outside the deli | *Somebody is buying flowers / for no particular reason.* |
| 6♥ | A stacked steel tiffin carrier | A brown paper lunch bag | *Packed by someone / who worried you'd skip lunch.* |
| 7♥ | The apartment association WhatsApp group | The co-op building group chat | *Forty neighbours, / one missing parcel.* |
| 8♥ | A terrace with a clothesline and tulsi | A tar-beach rooftop | *Every building has a roof / where the evening goes.* |
| 9♥ | A kalyana mantapa wedding | A City Hall wedding | *Nine hundred guests or two witnesses, / somebody's mother cries.* |
| 10♥ | A paying-guest room | A railroad apartment | *Too many people, one bathroom, / best years of your life.* |
| J♥ | The istriwala's ironing cart | The wash-and-fold laundromat | *Knows every shirt / on the street.* |
| Q♥ | The street dog the whole lane feeds and names | The bodega cat | *Owned by no one. / Answers to everyone.* |
| K♥ | The aunty on the balcony | The building super | *Knows your business / better than your mother does.* |
| A♦ | Kempegowda's boundary tower, 1537 | The 1653 wall that named Wall Street | *Every city begins / by deciding where it ends.* |
| 2♦ | KR Market flowers before dawn | The 28th Street flower district before dawn | *The prettiest hour / belongs to the people working it.* |
| 3♦ | The company shuttle to Electronic City | Metro-North into Grand Central | *Same seat every morning. / Same nap.* |
| 4♦ | A Koramangala café full of pitches | A DUMBO coworking space | *Every table is a startup. / Every startup needs more coffee.* |
| 5♦ | Naru Noodle Bar's eight seats, gone in two minutes | 4 Charles Prime Rib on Resy, 9 AM, 21 days out | *The table was gone / before the page loaded.* |
| 6♦ | Bargaining on Commercial Street | Bargaining on Canal Street | *Everything has a price. / Nothing has a price tag.* |
| 7♦ | A Chickpet gold shop | A 47th Street diamond counter | *Gold by the gram. / Trust by the decade.* |
| 8♦ | A band in a Church Street pub | An open mic in the Village | *Day job till six. / Rock star till close.* |
| 9♦ | The 8 PM night shift on Outer Ring Road | The 10:30 AM office in Midtown | *Your morning / is my night shift.* |
| 10♦ | The late-night tea stall outside a tech park | The Midtown halal cart | *Dinner at midnight, / from a cart, standing up.* |
| J♦ | The delivery rider in the rain | The deliverista on an e-bike | *Everyone's dinner / is somebody's shift.* |
| Q♦ | A TO-LET board on a gate | A FOR RENT sign on a railing | *Every party gets there eventually. / So, what's your rent?* |
| K♦ | Silk Board junction | The Cross Bronx Expressway | *Everyone is going somewhere. / Nobody is moving.* |
| A♣ | A shutter going up over a fresh kolam | A bodega gate going up | *Every street starts / with a shutter going up.* |
| 2♣ | Nandini milk packets on the step | Bread crates outside the bodega | *Somebody's up before you, / making sure you're fed.* |
| 3♣ | The school auto packed with kids | The yellow school bus | *The loudest vehicle on the street / is the one taking kids to school.* |
| 4♣ | "Swalpa adjust maadi" on a packed BMTC bus | A packed subway car | *There's always room / if everyone's a little uncomfortable.* |
| 5♣ | Black Sintex tanks on every roof | Wooden water towers on every roof | *Every house keeps a little worry / upstairs, just in case.* |
| 6♣ | The greens cart calling "soppu!" | The ice cream truck jingle | *You never hear them coming. / Only leaving.* |
| 7♣ | The pani puri cart | The hot dog and pretzel cart | *Four o'clock / is a street-food time zone.* |
| ★ 8♣ | Auto-rickshaw, 6 PM | Yellow cab, 6 PM | *The minute it rains, / everyone is going the other way.* |
| 9♣ | Honking at a fresh green light | Honking in gridlock | *The light turned green / a full second ago.* |
| ★ 10♣ | St. Mark's Road, 11 PM | St. Marks Place, 11 PM | *Same saint. / Very different evenings.* |
| J♣ | The BMTC conductor's whistle | The subway conductor's chime | *One whistle, one chime, / then nobody waits.* |
| Q♣ | The Iyengar bakery | The bodega | *Open before you're up. / Still open when you're not okay.* |
| K♣ | That pothole | That pothole | *Nobody fixes it. / Everybody knows exactly where it is.* |
| A♠ | Majestic bus station | Port Authority Bus Terminal | *The ugliest building in town / is where everyone's story starts.* |
| 2♠ | A monkey cap at 15° in December | Shorts at 15° in April | *Fifteen degrees. / Monkey cap or shorts, depending.* |
| 3♠ | Pink tabebuia in February | Cherry blossom in April | *Once a year the pavement / forgets it's grey.* |
| 4♠ | Mango season | Greenmarket peaches | *One fruit, one month. / We wait all year.* |
| 5♠ | A Namma Metro token in a drawer | A MetroCard in a drawer | *You kept one in a drawer / long after it stopped working.* |
| 6♠ | A summer power cut and a slowing fan | A dripping window AC | *Everyone's fan is on. / Nobody's fan is enough.* |
| ★ 7♠ | The April 4 PM storm | The first snow at dusk | *Nobody leaves early / in weather like this.* |
| 8♠ | Deepavali diyas on a balcony | Dyker Heights Christmas lights | *One night a year, / every window shows off.* |
| 9♠ | Departures at Kempegowda Airport | Arrivals at JFK Terminal 4 | *Everyone waves / until the glass gets in the way.* |
| 10♠ | New Year's Eve on Brigade Road | New Year's Eve in Times Square | *Midnight again. / Same resolutions.* |
| J♠ | Gully cricket | Stickball | *The game ends / when someone's mother calls.* |
| Q♠ | Bangalore in November | New York in October | *Two perfect weeks / we talk about all year.* |
| K♠ | "Bangalore was better before" | "New York was better before" | *Everyone says it was better / the year they arrived.* |
| Joker I | The Departure | | *Funny how you can miss two places at once.* |
| Joker II | The Return | | *Funny how you can miss two places at once.* |

---

## Phase 3. The five hero cards and two Jokers

### ★ 8♣ No Way, Home (auto-rickshaw × yellow cab)

- **Rank and suit:** 8 of Clubs (Streets), 6 PM.
- **Composition:**
  - Top half: Richmond Road in the rain. A rain tree, tangled overhead cables, a Sintex tank on a roof, and a ಕಾಫಿ board over a rolling shutter.
  - Bottom half: Second Avenue. A brick walk-up with a fire escape, a water tower, a ONE WAY sign and a deli awning.
- **Seam:** the road, with the vermilion line as its centre line.
- **Motion:** the auto drives along the top half and the cab along the bottom. Because of the rotation, they cross at the centre line going opposite ways. When the rain arrives, the cab's roof light goes dark.
- **Hidden sentence:** *The minute it rains, / everyone is going the other way.*
- **Why it works:** it passes up the easy resemblance (both are yellow) for something every resident has lived through. The rotation also takes "the other way" literally and builds it into the card's geometry.

### ★ 2♥ Runner's Hi (Cubbon Park × Central Park)

- **Rank and suit:** 2 of Hearts (Belonging), 6 AM.
- **Composition:**
  - Top half: the flat umbrella of a rain tree, bamboo, a bench, the red State Central Library and a low sun.
  - Bottom half: the vase shape of an American elm, a Central Park lamp post with its street-number plate, the San Remo's twin towers in faint line, and morning mist.
- **Seam:** the walking path. A single trunk rises from it in both directions, so the card reads as one tree with two crowns, which is the oldest double-headed image in cards.
- **Motion:** both canopies sway together. The Bangalore walker takes the loop at a stroll, and the New York runner laps them.
- **Hidden sentence:** *Every loud city / needs somewhere to whisper.*
- **Why it works:** the two parks share an hour and a crowd more than a look. The difference in pace is the one contrast the card allows, and it's an affectionate one.

### ★ 3♥ Regular, Please (darshini × diner)

- **Rank and suit:** 3 of Hearts, 8 AM.
- **Composition:**
  - Top half: a green menu board in Kannada, a SELF SERVICE plate, white wall tiles, a tube light, stacked steel plates, and a tumbler in its davara.
  - Bottom half: a black letter board (COFFEE, EGGS ANY STYLE), pink OPEN neon, a pie under a glass dome, and a green-banded mug on a saucer.
- **Seam:** the counter.
- **Motion:** steam rises from both cups, away from the shared counter. The tube light stutters, and the neon flickers on its own rhythm.
- **Hidden sentence:** *You don't order anymore. / You just nod.*
- **Why it works:** it's belonging at its smallest scale, and it holds whether you stand at the counter (darshini) or sit for an hour (diner).

### ★ 7♠ Weather or Not (the April storm × the first snow)

- **Rank and suit:** 7 of Spades (Weather and time), 4 PM.
- **Composition:**
  - Top half: Basavanagudi. A storm cloud, a flicker of lightning, a dripping red Mangalore-tile eave, a window grille, an open door glowing yellow under a mango-leaf thorana, and chappals left on the step.
  - Bottom half: Park Slope. A brownstone stoop dusted with snow, a lit double door, snow boots on the top step, and a streetlamp.
- **Seam:** the ground both doorsteps stand on. Puddles ripple on one side and snow settles on the other.
- **Hidden sentence:** *Nobody leaves early / in weather like this.*
- **Why it works:** the shoes at the door tell you everything. In both cities they mean someone came over and is staying.

### ★ 10♣ Saint Elsewhere (St. Mark's Road × St. Marks Place)

- **Rank and suit:** 10 of Clubs, 11 PM. It's the only hero card with a night sky.
- **Composition:**
  - Top half: St. Mark's Cathedral's dome and pediment in moonlight, and a café window full of late diners.
  - Bottom half: East Village tenements with fire escapes and windows switching on and off.
- **Seam:** a single signpost with both names. The blue blade reads ST. MARK'S ROAD, and when you turn the card over, the green NYC blade reads ST MARKS PL.
- **Motion:** strollers loop with nowhere to be, and windows light up one after another.
- **Hidden sentence:** *Same saint. / Very different evenings.*
- **Why it works:** the shared name gets the smile. The feeling comes from the two evenings, cathedral and café on one side, the East Village on the other.

### Joker I, The Departure, and Joker II, The Return

A steel tumbler pours into a Greek-key New York paper cup on The Departure, and the sentence flows downstream inside the coffee. On The Return, the paper cup pours back into a davara that already holds a little coffee. That stream is paler, and the sentence runs upstream.

Both cards have a single index (a vertical JOKER), engraved rays behind the pour, and a seam line that breaks where the stream crosses it. They're the only cards that can be upside down. Laid side by side, they're mirror images of each other. Every other card says *it's the same either way up*. The pair says *you need both to be whole*.

---

## Files

- **`prototype/index.html`** is the screening page. It shows one card on the stage, the reel of the collection, the Jokers and the system. You can turn the card 180°, pause it, show the print frame or copy the SVG.
- **`prototype/sound.js`** is the sound engine: one scene per card, all synthesised with the Web Audio API.
- **`prototype/cards.js`** holds all the artwork as code. Each card is a function, and the renderer enforces the rotational symmetry.
- **`prototype/export.js`** regenerates `prototype/svg/` when you run `node prototype/export.js`. For each card it writes an animated `<id>.svg` and a still `<id>-print.svg` with bleed.

## Next

1. Verify the open fact (Namma Metro tokens), then lock the deck.
2. Design the card back, a pulli kolam dot grid woven into a Greek-key meander, rotationally symmetric.
3. Draw the court figures. Jacks, Queens and Kings need people, so they get their own drawing pass.
4. Get printer quotes for lenticular seam bands versus full-art lenticular.
