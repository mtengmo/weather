# Promptguide: Roliga väderikoner för väderkod-projektet

## Arkitektur (viktigt för kodprojektet)

Generera **två separata lager** som du sedan lägger ihop i koden (t.ex. som två `<img>`/SVG staplade på varandra, eller composited i canvas):

1. **Bakgrundslager – väderscen** (54 st: 27 koder × dag/natt)
2. **Karaktärslager – "Vädergubben"** (25 st: 5 nederbördskategorier × 6 temperaturband, minus 5 orealistiska kombinationer — se fallback-regeln i avsnitt 2)

Karaktärens kläder styrs alltså av **två faktorer tillsammans**: regnar det får hen regnrock/paraply, snöar det vinterkläder, är det torrt och varmt badkläder — och temperaturen justerar hur extremt det blir (från "lite sur" till "eskimåfrusen"). Regn vid extremkyla och snö i värme förekommer inte i verkligheten, så de kombinationerna genereras inte alls utan faller tillbaka på Slask-varianten. Det ger 27 × 2 × 6 = 324 möjliga kombinationer i appen, men bara **79 bilder att generera** (54 + 25).

Kodmappning till nederbördskategori (avgör vilken karaktärsbas som ska visas):

| Kategori | Koder |
|---|---|
| Torrt (ingen nederbörd) | 1, 2, 3, 4, 5, 6, 7 |
| Regn | 8, 9, 10, 18, 19, 20 |
| Åska | 11, 21 |
| Slask (snöblandat regn) | 12, 13, 14, 22, 23, 24 |
| Snö | 15, 16, 17, 25, 26, 27 |

Rendera karaktären ovanpå/bredvid väderikonen: `character[precip_category][temp_band]`, valt utifrån vilken kod som är aktiv just nu + aktuell temperatur.

Praktiskt tips: generera alla bilder med **transparent bakgrund** (`isolated on transparent background, PNG`) så lagren går att stapla.

---

## 1. Basstil (klistra in i ALLA prompter för visuell konsekvens)

```
flat vector cartoon illustration, thick clean outlines, playful and humorous,
soft rounded shapes, limited pastel color palette, isolated on transparent
background, no text, children's book weather app icon style
```

Nattversion: lägg till `, dark navy blue night palette, tiny stars, crescent moon accents` istället för dagens ljusa palett.

---

## 2. Rollbesättningen: fem olika karaktärer (en per nederbördskategori)

Istället för en enda återkommande figur används nu **fem distinkta karaktärer** — en per
nederbördskategori. Det ger variation (pojke, flicka, kvinna, gubbe, ett par) utan att tappa
konsekvens, eftersom varje karaktär bara behöver vara lik sig själv över de olika temperaturbanden,
inte lik de andra fyra.

| Kategori | Karaktär | Bas-beskrivning (klistras in i basstilen) |
|---|---|---|
| Torrt | Kvinna, ~30 år | `a cartoon woman in her 30s, simple friendly face, big round eyes, rosy cheeks, shoulder-length wavy brown hair, curvy build, no visible hands (stubby round arms), standing pose` |
| Regn | Ett par (två vuxna kvinnor) | `two clearly adult women in their 30s, elongated adult facial proportions (not round baby-face child proportions), taller and leaner than the child characters, one with a chin-length bob and one with loose shoulder-length wavy hair (no pigtails), standing close together sharing one umbrella, holding hands` |
| Åska | Pojke | `a cartoon young boy, simple friendly face, big round eyes, tousled brown hair, rosy cheeks, stubby round arms, standing pose` |
| Slask | Gubbe (äldre man) | `a cartoon elderly man, simple grumpy face, bushy gray eyebrows, small round glasses, balding gray hair, rosy cheeks, slightly hunched posture, stubby round arms, standing pose` |
| Snö | Flicka | `a cartoon young girl with pigtails, simple friendly face, big round eyes, rosy cheeks, stubby round arms, standing pose` |

*(Man och gumma är inte med i den här omgången men går lätt att lägga in om du vill byta ut någon av
ovanstående, eller lägga till fler kategorier senare — t.ex. ett manligt par för Åska istället för
pojken.)*

Bas-formel: `[KARAKTÄR FRÅN TABELLEN OVAN] + [BAS-STIL] + [kläd-tillägg från matrisen nedan]`

### Matris: kläder per karaktär × temperaturband

Vissa kombinationer inträffar aldrig i verkligheten (regn vid -25°C, snö vid +20°C) och är borttagna
nedan — de hanteras istället av en fallback till Slask-raden (se kod-snutten efter tabellen).

| | **Extremkallt** (< -20°C) | **Kallt** (-20 till -5°C) | **Runt nollan** (-5 till 5°C) | **Milt** (5–15°C) | **Varmt** (15–25°C) | **Hett** (> 25°C) |
|---|---|---|---|---|---|---|
| **Torrt** | `dressed as a frozen eskimo, huge fur-lined parka hood, only eyes visible, icicles on eyebrows, breath frozen into an ice cloud, standing stiff like a popsicle` | `puffy winter coat, oversized knit hat with pom-pom sliding over eyes, huge scarf to the nose, mittens, bright red frozen nose, shivering with wavy motion lines` | `medium zipped-up jacket, beanie, hands in pockets, visible cool breath, brisk neutral expression` | `casual everyday jacket and jeans, relaxed neutral expression, hands in pockets` | `light t-shirt and shorts, relaxed happy pose, holding an ice cream cone (DAY: sunglasses pushed up on head; NIGHT: no sunglasses)` | `beachwear/swimsuit, lounging on a tiny beach chair, sipping a drink with a straw, melting ice cream dripping down the hand (DAY: sunglasses on; NIGHT: no sunglasses, calm sleepy smile instead)` |
| **Regn** | *– (används inte, se fallback)* | *– (används inte, se fallback)* | `matching raincoats over light jackets, rubber boots, sharing one umbrella, cold pink noses, visible breath mixing with the rain, both mildly miserable` | `matching classic yellow raincoats, rubber boots, sharing one umbrella tilted crookedly, one puddle by their feet, mildly grumpy` | `matching light see-through rain ponchos, sharing a small umbrella, cheerfully jumping in a puddle together` | `matching beachwear, sharing a tiny umbrella held up anyway, grinning and enjoying warm summer rain, steam rising off the pavement` |
| **Åska** | `hiding terrified under an umbrella, bundled in a thick winter coat, shivering from both cold and fear` | `winter jacket, hands clamped over ears, wide terrified eyes staring at the sky` | `raincoat, flinching with hands half-raised near ears, visible cold breath, uneasy expression` | `raincoat, ducking with hands over head, terrified expression` | `t-shirt, flinching in fright, dropping an ice cream cone mid-air` | `beachwear, sprinting screaming toward a beach hut, towel flapping behind` |
| **Slask** | `frozen eskimo outfit soaked through with half-frozen slush, thoroughly miserable expression` | `winter jacket drenched with melting snow-and-rain mix, sour grumpy face, soggy mittens` | `raincoat and boots covered in grey slush, hunched shoulders, visible cold breath, thoroughly fed up expression` | `raincoat and boots splattered with grey slush stains, extra grumpy expression` | `light jacket, irritably stepping around melting snow piles, rolling eyes` | `shorts, wading confused through oddly melting slush in the summer heat, puzzled expression` |
| **Snö** | `full eskimo outfit, fur hood, only the eyes visible, icicles in the eyelashes, standing frozen solid` | `classic winter coat, pom-pom hat, scarf, mittens, a small snowman standing next to them` | `medium winter jacket and hat, mittens, catching a heavy wet snowflake, visible breath, cheeks pink from the damp cold` | *– (används inte, se fallback)* | *– (används inte, se fallback)* | *– (används inte, se fallback)* |

**Fallback-regel (spar 5 bilder — 25 varianter att generera istället för 30):**
```js
function getCharacterKey(precipCategory, tempBand) {
  // Regn hinner aldrig förekomma i extremkyla — ser ut som frysande slask ändå
  if (precipCategory === 'rain' && (tempBand === 'frozen' || tempBand === 'cold')) {
    precipCategory = 'sleet';
  }
  // Snö överlever aldrig i milt/varmt/hett väder — smälter till slask på väg ner
  if (precipCategory === 'snow' && (tempBand === 'mild' || tempBand === 'warm' || tempBand === 'hot')) {
    precipCategory = 'sleet';
  }
  return `character_${precipCategory}_${tempBand}`;
}
```

---

## 3. Väderikoner per kod (bakgrundslager, dag + natt)

Formel: `[BAS-STIL] + [scenbeskrivning nedan] + (natt: mörk palett-tillägg)`

| Kod | Betydelse | Dag-prompt (scendel) | Natt-prompt (scendel) |
|---|---|---|---|
| 1 | Klart | `single bright smiling sun with sunglasses, winking` | `full moon wearing a nightcap, sleepy smile, one twinkling star` |
| 2 | Nästan klart | `smiling sun peeking shyly from behind one tiny cloud` | `crescent moon with one small cloud drifting lazily in front of its face` |
| 3 | Växlande molnighet | `sun and cloud playing peek-a-boo, sun looks slightly annoyed` | `moon and cloud taking turns covering each other, both giggling` |
| 4 | Halvklart | `sun half-covered by a fluffy cloud, sun making a "meh" face` | `moon half-hidden by a cloud, sleepy half-lidded eyes` |
| 5 | Molnigt | `two puffy clouds bumping into each other like bumper cars` | `two dark clouds gently bumping, tiny stars peeking between them` |
| 6 | Mulet | `one giant heavy gray cloud looking bored, arms crossed (cloud has stubby arms and a flat unimpressed face)` | `giant dark cloud with a flat sleepy face, snoring "Zzz" bubble` |
| 7 | Dimma | `a cloud confused and lost inside its own fog, comically squinting, tiny "?" above its head` | `a spooky-cute ghost-like fog cloud bumping softly into a lamppost, moon barely visible above` |
| 8 | Lätt regnskur | `small cloud sneezing out three light raindrops, "achoo" motion lines` | `small dark cloud sneezing a few raindrops, moon peeking through the mist` |
| 9 | Måttlig regnskur | `cloud shaking like a wet dog, medium raindrops flying off it` | `dark cloud shaking off raindrops, moon glinting off wet drops` |
| 10 | Kraftig regnskur | `cloud crying dramatically with a waterfall of tears/rain, exaggerated sad face` | `dark cloud crying a rain waterfall, single dramatic star shining through` |
| 11 | Åska | `cloud with sunglasses and a mohawk-shaped lightning bolt, striking a rockstar pose` | `dark cloud DJing with a lightning bolt as a microphone, disco-star sparkles` |
| 12 | Lätt slaskskur | `cloud looking confused, dripping a mix of a raindrop and a tiny snowflake melting together` | `dark cloud dripping a half-melted snowflake, moon looking equally confused` |
| 13 | Måttlig slaskskur | `cloud making a disgusted face while slushy grey drops splat below it` | `dark cloud grimacing, slushy drops falling under dim moonlight` |
| 14 | Kraftig slaskskur | `cloud wringing itself out like a wet towel, heavy slush pouring down` | `dark cloud wringing itself dry, heavy slush falling, moon hidden behind` |
| 15 | Lätt snöbyar | `cloud gently sprinkling three cute snowflakes like sugar on a cupcake` | `dark cloud sprinkling a few glittering snowflakes under the moon` |
| 16 | Måttliga snöbyar | `cloud happily shaking out a handful of snowflakes like confetti` | `dark cloud tossing snowflake confetti, moon wearing tiny earmuffs` |
| 17 | Kraftiga snöbyar | `cloud dumping a huge pile of snow like an overturned bucket, snowman already forming below` | `dark cloud dumping snow, a tiny snowman winking up at the moon` |
| 18 | Lätt regn | `cloud gently watering the ground like a watering can, small smile` | `dark cloud gently watering with a watering-can nozzle, calm moon above` |
| 19 | Måttligt regn | `cloud pouring rain steadily from a teapot spout shape` | `dark cloud pouring rain like a teapot, moon holding a tiny umbrella` |
| 20 | Kraftigt regn | `cloud as a fire hose blasting rain sideways, comically intense face` | `dark cloud blasting rain like a hose, moon ducking for cover behind it` |
| 21 | Åska (utan skurkaraktär) | `wide grumpy storm cloud crackling with multiple lightning bolts like static hair standing up` | `dark storm cloud with lightning bolt hair, moon wearing sunglasses ironically at night` |
| 22 | Lätt sleet | `cloud sneezing a single melting snowflake-raindrop hybrid` | `dark cloud sneezing softly, one slushy drop lit by moonlight` |
| 23 | Måttlig sleet | `cloud looking annoyed, alternating raindrops and snowflakes like it can't decide` | `dark cloud shrugging (can't decide rain or snow), moon shrugging too` |
| 24 | Kraftig sleet | `cloud overwhelmed, slush pouring down in a heavy indecisive mess` | `dark cloud overwhelmed by heavy slush, moon hiding behind a scarf of clouds` |
| 25 | Lätt snöfall | `cloud gently floating down single snowflakes like feathers from a pillow fight` | `dark cloud releasing glowing snowflakes that sparkle like tiny stars` |
| 26 | Måttligt snöfall | `cloud steadily pouring snow like flour from a bag, dusting everything below` | `dark cloud pouring snow like flour, moon getting lightly dusted too` |
| 27 | Kraftigt snöfall | `cloud in a full blizzard frenzy, snow flying everywhere, cloud's own face barely visible` | `dark cloud in blizzard mode, moon almost completely whited out by snow` |

---

## 4. Hur du kombinerar i appen

```
precip_category = mapCodeToCategory(code)     // se tabellen i avsnitt "Arkitektur"
temp_band       = mapTempToBand(temperature)
final_icon = layer(
  weather_background[code][day|night],
  character[precip_category][temp_band]
)
```

Exempel: kod 17 (kraftiga snöbyar), natt, -25°C →
`natt-bakgrund för kod 17` + `karaktär: snö × extremkallt (full eskimo-dräkt)`

Exempel: kod 19 (måttligt regn), dag, 28°C →
`dag-bakgrund för kod 19` + `karaktär: regn × hett (badkläder + paraply, ler i sommarregnet)`

Om du vill ha en enda sammansatt AI-genererad bild istället för lager (t.ex. för en hero-bild), kombinera helt enkelt scendelen + rätt cell ur matrisen + basstilen i en och samma prompt.

## 5. Filnamnskonvention (förslag)
```
weather_{kod}_{day|night}.png                  → t.ex. weather_17_night.png
character_{precip}_{band}.png                  → t.ex. character_snow_frozen.png
```
Nederbörds-nycklar: `dry`, `rain`, `thunder`, `sleet`, `snow`
Temperaturband-nycklar: `frozen` (<-20), `cold` (-20–-5), `nearzero` (-5–5), `mild` (5–15), `warm` (15–25), `hot` (>25)

---

## 6. NY VERSION: Kombinerad ikon (väder + karaktär i samma bild, ersätter lager-modellen)

Detta ersätter den tidigare tvålagers-arkitekturen (avsnitt 4). Istället för att stapla väderikon +
karaktär i koden genereras nu **en enda bild per kombination**, där karaktären står i/vid vädersymbolen
(paraply under molnet, snögubbe bredvid, etc. — precis som i din uppladdade referensbild).

**Skalan:** 12 väder-typer (utökat från 9 så att **alla 27 koder** täcks — dimma och slask saknades
tidigare) × dag/natt × 6 temperaturband, minus regn-typerna för `frozen`/`cold` och snö-typerna för
`mild`/`warm`/`hot` = **124 kombinerade ikoner**. Genereras som **6 spritesheets** (en per
temperaturband):

- `frozen` och `cold`: 10 typer × 2 rader = 20 rutor per sheet (regn-typerna 7–8 exkluderade)
- `mild`, `warm`, `hot`: 10 typer × 2 rader = 20 rutor per sheet (snö-typerna 11–12 exkluderade)
- `nearzero`: alla 12 typer × 2 rader = 24 rutor (gränsfallet där allt förekommer)

### Väder-typer och kodmappning (täcker alla 27 koder)

| # | Väder-typ | SMHI-koder | Kategori | Karaktär |
|---|---|---|---|---|
| 1 | Klart (sol) | 1 | Torrt | Kvinna |
| 2 | Nästan klart | 2 | Torrt | Kvinna |
| 3 | Växlande molnighet | 3, 4 | Torrt | Kvinna |
| 4 | Molnigt | 5 | Torrt | Kvinna |
| 5 | Mulet | 6 | Torrt | Kvinna |
| 6 | Dimma *(ny)* | 7 | Torrt | Kvinna |
| 7 | Lätt–måttligt regn | 8, 9, 18, 19 | Regn | Par |
| 8 | Kraftigt regn | 10, 20 | Regn | Par |
| 9 | Åska | 11, 21 | Åska | Pojke |
| 10 | Snöblandat regn / slask *(ny)* | 12, 13, 14, 22, 23, 24 | Slask | Gubbe |
| 11 | Lätt–måttlig snö | 15, 16, 25, 26 | Snö | Flicka |
| 12 | Kraftig snö | 17, 27 | Snö | Flicka |

Nu förekommer alltså Gubben (Slask) även i den kombinerade metoden, inte bara som fristående
fallback-figur — han får en egen kolumn (Dimma-typen använder Kvinnan, precis som resten av Torrt).

### NY STRATEGI: gruppering per karaktär (19 genereringar istället för 6 stora eller 124 enskilda)

De tidigare 24-ruters sheetsen (alla 5 karaktärer i en bild) visade sig för komplext för AI:n att
hålla reda på — transparens, nattversion och färglåsning gick sönder upprepade gånger. Lösningen:
dela upp per **karaktär** istället för per temperaturband, så varje generering bara hanterar 1–2
karaktärer och max 6 kolumner.

| Grupp | Karaktär(er) | Kolumner | Band den behövs i | Antal genereringar |
|---|---|---|---|---|
| A | Kvinna (torrt: klart, nästan klart, växlande, molnigt, mulet, dimma) | 6 | Alla 6 band | 6 |
| B | Par (regn: lätt–måttligt, kraftigt) | 2 | nearzero, mild, warm, hot | 4 |
| C | Pojke + Gubbe (åska, slask) | 2 | Alla 6 band | 6 |
| D | Flicka (snö: lätt–måttlig, kraftig) | 2 | frozen, cold, nearzero | 3 |

**Totalt: 19 genereringar.** Varje bild är max 6 kolumner × 2 rader (dag/natt) = max 12 rutor.

**Fallback i appen:** Om väderdata ändå rapporterar regn (kod 8-10, 18-20) vid `frozen`/`cold`, eller
snö (kod 15-17, 25-27) vid `mild`/`warm`/`hot` — ovanligt men tekniskt möjligt beroende på
datakälla — finns ingen genererad ikon för den kombinationen. Låt appen falla tillbaka på
**Slask-ikonen från Grupp C** (Gubben) för det bandet istället, precis som fallback-funktionen i
avsnitt 2:
```js
function getIconGroup(precipCategory, tempBand) {
  if (precipCategory === 'rain' && (tempBand === 'frozen' || tempBand === 'cold')) {
    return 'sleet'; // Grupp C, kolumn 2
  }
  if (precipCategory === 'snow' && (tempBand === 'mild' || tempBand === 'warm' || tempBand === 'hot')) {
    return 'sleet'; // Grupp C, kolumn 2
  }
  return precipCategory;
}
```

### Konsekvens-recept
1. Generera **en referensbild per karaktär** först — enklast är att ta första cellen ur respektive
   grupps första generering (t.ex. Kvinnan i Milt-bandet) och spara som referens.
2. Bifoga rätt referensbild(er) i varje efterföljande generering för samma karaktär(er) och skriv:
   *"Use this exact character design as reference — identical face, proportions, color palette,
   hairstyle and art style. Only change the clothing per temperature band and keep the same
   weather scenes."*
3. Verifiera alfakanalen på varje beskuren ruta innan commit (`Image.open('x.png').mode` ska vara
   `RGBA` med faktisk variation, inte bara vit botten).

### Master-prompt (generisk mall, en per grupp × band)

```
flat vector cartoon illustration, thick clean outlines, playful and humorous,
soft rounded shapes, limited pastel color palette, children's book weather
app icon style, no text, no watermark, no signature.

Layout: a grid sprite sheet with exactly [ANTAL KOLUMNER] columns and
exactly 2 rows ([ANTAL KOLUMNER × 2] icons total, no more, no fewer).

Row 1 = daytime scenes. Mood: bright daylight matching each weather type
(warm golden light for sun, soft diffused light for cloud, hazy pale
light for fog, etc — see mood table below), with small charming secondary
touches (a tiny bird, a sparkle, a bouncing raindrop) that never obscure
the weather symbol itself.

Row 2 = nighttime scenes. Mood: dark navy-blue night palette matching each
weather type (soft blue-white moonlight, muted moonlight through cloud,
glowing mysterious fog, etc — see mood table below), with small charming
secondary touches (twinkling stars, a firefly, a glinting streetlamp
reflection) that never obscure the weather symbol itself.

CRITICAL — row 2 must NOT be a small badge, corner icon, or decoration.
Each icon in row 2 is a FULL, standalone, same-size night version of the
entire scene directly above it in row 1 — same character, same pose, same
weather symbol, same composition — just re-lit for night as described
above.

CRITICAL — in both rows, the weather symbol (sun/moon/cloud/rain/snow)
must remain large, boldly outlined, and instantly recognizable at a
glance — mood details are secondary flourishes only, never allowed to
compete with or obscure the symbol.

CRITICAL — spacing and background: each icon floats completely alone with
NO background shape, box, blob, rounded rectangle, panel, or fill of any
kind behind it. The canvas is 100% transparent (alpha channel) except for
the character and weather symbol themselves. Leave empty space between
every icon that is wider than the icon itself in every direction — icons
must not touch, overlap, or share any background element. No dividing
lines, no grid borders, no labels, no cell numbers.

CRITICAL — clothing consistency: the character(s) wear the EXACT SAME
outfit (same colors, same style) in every column of this sheet — only
their pose/expression changes per weather type, never their clothing.

Character(s) for this sheet: [KARAKTÄRSBESKRIVNING FRÅN ROLLBESÄTTNINGEN
I AVSNITT 2, t.ex. "an adult woman in her 30s, shoulder-length wavy brown
hair, curvy build, wearing [KLÄDBESKRIVNING FRÅN MATRISEN FÖR DETTA BAND]"]
— identical to the reference image, do not redesign.

Temperature band: [BANDNAMN OCH SPANN, t.ex. "frozen, < -20°C"]

Columns, left to right (same weather type in both rows, day mood in row 1,
night mood in row 2 — see mood table below for the specific touches per
type):
[NUMRERAD LISTA MED EN RAD PER KOLUMN, väder-typ + karaktärens
pose/uttryck för just den väder-typen — kläderna är redan låsta ovan]
```

### Stämning: dag vs natt per väder-typ (mer inlevelse, väder-symbolen alltid tydlig)

Regel: stämningsdetaljerna är **små, sekundära flourishes** runt karaktären — de får aldrig göra
själva väder-symbolen (sol/moln/regn/snö) mindre tydlig eller mindre läsbar på liten skärmstorlek.
Symbolen ska alltid vara stor, tjockt konturerad och omedelbart igenkännbar; stämningen är kryddan.

| Väder-typ | Dag-stämning | Natt-stämning |
|---|---|---|
| Klart | Varmt gyllene solljus, mjuk glow-kant runt solen, en fjäril eller fågel i bakgrunden, glittrande highlights | Mjukt blåvitt månsken, blinkande stjärnor, en lysmask eller två, stilla och fridfullt |
| Nästan klart | Ljust solljus som bryter fram, molnet driver lugnt förbi, fläckigt ljus-mönster | Månen kikar fram bakom ett tunt moln, molnkant som glimmar silver, mjukt stjärnljus |
| Växlande molnighet | Livligt, snabbt föränderligt ljus, lekfull känsla när sol/moln turas om | Moln och måne "leker kurragömma", skiftande skuggor, stjärnor som blinkar till och försvinner |
| Molnigt | Mjukt diffust dagsljus, lugn dämpad känsla, mulna gråvita nyanser | Tyngre molntäcke som dämpar månskenet, djupa blåa toner, sömnig och tyst |
| Mulet | Platt svalt ljus, tyngre grå toner, lite mulen men fortfarande gullig känsla | Djup kolgrå-marinblå himmel, nästan inga synliga stjärnor, mysigt mörkt |
| Dimma | Diset bleklt ljus som suddar ut allt, mjuk glow runt ljuskällor, dämpad "tystnad"-känsla | Spöklikt gullig dimma med varmt lyktsken i bakgrunden, mystisk men charmig, månen bara en svag fläck |

*(Samma princip appliceras på Regn/Åska/Slask/Snö-grupperna — regn får t.ex. glänsande våta
högdagrar och studsande droppar på dagen, mjukt reflekterande gatlykt-sken på natten; snö får
gnistrande vita highlights på dagen, mysigt kallblå glitter-effekt på natten.)*

### Exempel: Grupp A (Kvinna), band "Frozen (< -20°C)" — kombinerad prompt (19-strategin)

```
flat vector cartoon illustration, thick clean outlines, playful and humorous,
soft rounded shapes, limited pastel color palette, children's book weather
app icon style, no text, no watermark, no signature.

Layout: a grid sprite sheet with exactly 6 columns and exactly 2 rows
(12 icons total, no more, no fewer).

Row 1 = daytime scenes. Mood: bright cold daylight, warm golden sunlight
where the sun is visible, soft glow highlights, small charming
atmospheric touches (a tiny bird, a sparkle, a wisp of frozen breath) —
these are small secondary details only.

Row 2 = nighttime scenes. Mood: cold, quiet, moonlit night, dark navy-blue
palette, soft blue-white moonlight, small charming atmospheric touches
(twinkling stars, a tiny firefly, a glimmer of frost) — these are small
secondary details only.

CRITICAL — row 2 must NOT be a small badge, corner icon, or decoration.
Each icon in row 2 is a FULL, standalone, same-size night version of the
entire scene directly above it in row 1 — same character, same pose, same
weather symbol, same composition — just re-lit for night as described
above.

CRITICAL — in both rows, the weather symbol (sun/moon/cloud/fog) must
remain large, boldly outlined, and instantly recognizable at a glance —
mood details are secondary flourishes only, never allowed to compete with
or obscure the symbol.

CRITICAL — spacing and background: each icon floats completely alone with
NO background shape, box, blob, rounded rectangle, panel, or fill of any
kind behind it. The canvas is 100% transparent (alpha channel) except for
the character and weather symbol themselves. Leave empty space between
every icon that is wider than the icon itself in every direction — icons
must not touch, overlap, or share any background element. No dividing
lines, no grid borders, no labels, no cell numbers.

CRITICAL — clothing consistency: the woman wears the exact same frozen
eskimo outfit (huge fur-lined parka hood, only eyes visible) in every
column of this sheet, in both rows — only her pose/expression changes per
weather type, never her clothing.

Character for this sheet: an adult woman in her 30s, shoulder-length wavy
brown hair, curvy build, dressed as a frozen eskimo — huge fur-lined
parka hood with only eyes visible, icicles on eyebrows, breath frozen
into a visible ice cloud, standing stiff like a popsicle. Identical to
the reference image, do not redesign.

Temperature band: frozen, < -20°C

Columns, left to right (same weather type in row 1 and row 2, day mood
above / night mood below):
1. Clear sky (sun / moon) — relaxed pose despite the cold, breath visibly
   frozen catching the light (day) / twinkling stars around the moon (night)
2. Nearly clear (sun / moon peeking from small cloud) — same pose,
   squinting slightly in the sunlight, soft dappled light (day) / calm
   relaxed eyes in the soft moonlight, cloud edge glowing silver (night)
3. Variable cloudiness — slightly puzzled pose, quick shifting light (day)
   / shifting shadows as cloud and moon drift past each other (night)
4. Cloudy (fluffy cloud) — neutral pose, soft diffused daylight (day) /
   muted moonlight through cloud cover (night)
5. Overcast (a WIDE, solid blanket-like cloud filling nearly the entire
   upper frame width — clearly larger/wider than the single fluffy cloud
   in the "Cloudy" column, conveying the WHOLE sky is covered edge to
   edge, not just one floating cloud; medium-dark gray, calm and flat,
   noticeably LIGHTER than the thunderstorm cloud used elsewhere in this
   set, NO near-black or navy shading, NO lightning, NO rain streaks) —
   slightly bored, stiff posture, flat cool light (day) / near-total
   cloud cover but still clearly gray-not-black, almost no stars (night)
6. Fog — squinting, barely visible silhouette, hazy pale light (day) /
   glowing mysterious fog with a faint moon smudge (night)
```

**Övriga grupper/band:** upprepa samma mönster (2 rader, dag-stämning i rad 1, natt-stämning i rad
2, båda med väder-symbolen tydlig och stor) för Grupp A × `cold`, `nearzero`, `mild`, `warm`, `hot`,
samt Grupp B (Par, 2 kolumner: Lätt–måttligt regn / Kraftigt regn), Grupp C (Pojke + Gubbe, 2
kolumner — två OLIKA karaktärer i samma bild: ange explicit att pojken ENDAST syns i kolumn 1 och
gubben ENDAST i kolumn 2, annars riskerar AI:n att blanda ihop dem eller visa båda i samma ruta), och
Grupp D (Flicka, 2 kolumner: Lätt–måttlig snö / Kraftig snö) — enligt band-listan i tabellen ovan.
Byt klädbeskrivning mot rätt cell ur matrisen i avsnitt 2, och stämnings-detaljer mot rätt rad i
stämningstabellen ovan (eller motsvarande för Regn/Åska/Slask/Snö).

### Filnamnskonvention
```
weather_{typ}_{day|night}_{band}.png
```
t.ex. `weather_rain-heavy_day_mild.png`, `weather_sleet_night_nearzero.png`, `weather_fog_day_cold.png`
`typ`: `clear`, `nearly-clear`, `variable`, `cloudy`, `overcast`, `fog`, `rain-light`, `rain-heavy`, `thunder`, `sleet`, `snow-light`, `snow-heavy`

